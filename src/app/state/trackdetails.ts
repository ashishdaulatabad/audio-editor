import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AudioDetails } from './audiostate';
import { audioService } from '../services/audioservice';
import { audioManager } from '../services/audiotrackmanager';
import { RegionSelection } from '../components/editor/regionselect';
import { SlicerSelection } from '../components/editor/slicer';
import { AudioTransformation } from '../services/interfaces';
import { TimeSectionSelection } from '../components/editor/seekbar';
import { animationBatcher } from '../services/animationbatch';
import { compareValues, cloneValues } from '../services/noderegistry';

import {
  ChangeDetails,
  changeHistory,
  ChangeType,
  createSnapshot,
  Snapshot,
  WorkspaceChange
} from '../services/changehistory';

/**
 * @description Information of the track, like start offset, end offset and selection.
 * Maybe store additional data.
 */
export type TrackInformation = {
  /**
   * Start offset relative to the audio.
   */
  startOffsetInMicros: number
  /**
   * End offset relative to the audio.
   */
  endOffsetInMicros: number
  /**
   * @description Playback Rate set.
   */
  playbackRate: number
  /**
   * Boolean if selected or not.
   */
  selected: boolean
}

export enum Status {
  Pause,
  Play
}

export const SEC_TO_MICROSEC = 1e6;

const twoMinuteInMicros: number = 2 * 60 * SEC_TO_MICROSEC;

export type ScheduledInformation = {
  offsetInMicros: number,
  scheduledKey: symbol,
  trackNumber: number
};

export type AudioNonScheduledDetails = AudioDetails & {
  trackDetail: TrackInformation
}

export type AudioTrackDetails = AudioDetails & {
  trackDetail: ScheduledInformation & TrackInformation
}

/// Setting extra time buffer to 2 minutes.
const initialState: {
  status: Status,
  maxTimeMicros: number,
  trackDetails: AudioTrackDetails[][]
} = {
  status: Status.Pause,
  maxTimeMicros: twoMinuteInMicros,
  trackDetails: Array.from({length: 30}, () => [])
}

/**
 * @description Get max time the track should run.
 * @param trackDetails Track Details
 * @returns Max Time in microseconds.
 */
function getMaxTime(trackDetails: AudioTrackDetails[][]): number {
  return trackDetails.reduce((maxTime: number, currentArray) => {
    const maxTimeInCurrentTrack = currentArray.reduce((maxTime: number, currentTrack) => {
      // Should always exist in seconds
      const startTimeOfTrack = currentTrack.trackDetail.startOffsetInMicros;
      const endTimeOfTrack = currentTrack.trackDetail.endOffsetInMicros;

      const trackTotalTime = endTimeOfTrack - startTimeOfTrack;
      const endTime = currentTrack.trackDetail.offsetInMicros + trackTotalTime;
      return Math.max(maxTime, endTime);
    }, 0)

    return Math.max(maxTime, maxTimeInCurrentTrack);
  }, 0);
}

function isWithinRegionAndNotSelected(
  track: Omit<AudioTrackDetails, 'mixerNumber'>,
  pointStartSec: number,
  pointEndSec: number
) {
  const startTime = track.trackDetail.offsetInMicros / SEC_TO_MICROSEC;
  const startOffset = track.trackDetail.startOffsetInMicros / SEC_TO_MICROSEC;
  const endOffset = track.trackDetail.endOffsetInMicros / SEC_TO_MICROSEC;
  const endTime = startTime + (endOffset - startOffset);

  // Probably need a better boolean checks, but this works for now.
  return (
    // region consumed by track
    (pointStartSec <= startTime && pointEndSec >= endTime) ||
    // End section of the region selection overlaps with the track
    (pointEndSec >= startTime && pointEndSec <= endTime) ||
    // Start section of the region selection overlaps with the track
    (pointStartSec >= startTime && pointStartSec <= endTime)
  );
}

function processTrackHistory<Action>(
  state: AudioTrackDetails[][],
  action: Action,
  fn: (state: AudioTrackDetails[][], action: Action) => AudioTrackDetails[][]
) {
  const initialState = createSnapshot(state);
  const finalState = fn(state, action);
  changeHistory.storeChanges(initialState, cloneValues(finalState), WorkspaceChange.TrackChanges);

  return finalState;
}

/**
 * @description Add audio track to the track list.
 * @param trackDetails Track Details
 * @param trackNumber Track Number
 * @param track new track
 */
function addNewAudioToTrack(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumber: number,
    track: AudioTrackDetails
  }
): AudioTrackDetails[][] {
  const { track, trackNumber } = action;
  trackDetails[trackNumber].push(track);
  // Sort array based on the appearance of each scheduled track
  // This enable a domino-effect, making user's life easier to pull
  // out overlapping tracks.
  trackDetails[trackNumber].sort((a, b) => a.trackDetail.offsetInMicros - b.trackDetail.offsetInMicros);

  return trackDetails;
}

function deleteAudioFromTrack_(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumber: number,
    audioIndex: number
  }
): AudioTrackDetails[][] {
  const {
    trackNumber,
    audioIndex
  } = action;
  // No need for sorting, since they'll be already sorted in-place.
  const _ = trackDetails[trackNumber].splice(audioIndex, 1);
  return trackDetails;
}

function selectAllTrackWithSelectedRegion(
  trackDetails: AudioTrackDetails[][],
  regionSelection: RegionSelection
) {
  const {
    trackStart,
    trackEnd,
    pointStartSec,
    pointEndSec,
  } = regionSelection;

  for (let index = 0; index < trackDetails.length; ++index) {
    for (const track of trackDetails[index]) {
      track.trackDetail.selected = index >= trackStart && 
        index <= trackEnd &&
        isWithinRegionAndNotSelected(track, pointStartSec, pointEndSec);
    }
  }
}

function selectAllTrackWithinSeekbarSelection(
  trackDetails: AudioTrackDetails[][],
  timeSelection: TimeSectionSelection
) {
  const {
    startTimeMicros,
    endTimeMicros
  } = timeSelection;

  const pointStartSec = startTimeMicros / SEC_TO_MICROSEC;
  const pointEndSec = endTimeMicros / SEC_TO_MICROSEC;

  for (let index = 0; index < trackDetails.length; ++index) {
    for (const track of trackDetails[index]) {
      track.trackDetail.selected = isWithinRegionAndNotSelected(track, pointStartSec, pointEndSec);
    }
  }
}

function markSelectionForAllAudioTracks(
  trackDetails: AudioTrackDetails[][],
  markAs: boolean
) {
  for (let index = 0; index < trackDetails.length; ++index) {
    for (const track of trackDetails[index]) {
      track.trackDetail.selected = markAs;
    }
  }
}

/**
 * @description Adds a single track, assumption that the user will 
 * place this track after the clone, then sorting can be done after
 * releasing the trigger
 * 
 * @param trackDetails 
 */
function cloneSingleAudioTrack(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumber: number,
    audioIndex: number
  }
): AudioTrackDetails[][] {
  const { trackNumber, audioIndex } = action;
  const track = trackDetails[trackNumber][audioIndex];

  const clonedDetails: AudioTrackDetails = {
    ...track,
    trackDetail: {
      ...track.trackDetail,
      scheduledKey: Symbol(),
    }
  };

  // Adding immediately before the given position:
  // This will create a domino effect while scheduling track.
  trackDetails[trackNumber].push(clonedDetails);

  return trackDetails;
}

/**
 * @description Adds multiple tracks, assumption that the user will 
 * place this track after the clone, then sorting can be done after
 * releasing the trigger
 * 
 * @param trackDetails 
 */
function cloneMultipleAudioTracks(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumbers: number[],
    audioIndexes: number[]
  }
): AudioTrackDetails[][] {
  const {
    trackNumbers,
    audioIndexes
  } = action;

  console.assert(
    trackNumbers.length === audioIndexes.length,
    'Something went wrong with cloning multiple tracks: missing Track/Audio details.'
  );

  trackNumbers.forEach((trackNumber, index: number) => {
    const audioIndex = audioIndexes[index];
    const track = trackDetails[trackNumber][audioIndex];

    const clonedDetails: AudioTrackDetails = {
      ...track,
      trackDetail: {
        ...track.trackDetail,
        scheduledKey: Symbol(),
      }
    };

    trackDetails[trackNumber].splice(audioIndex, 0, clonedDetails);
  });

  return trackDetails;
}

/**
 * @description Removes scheduled track.
 * @param trackDetails 
 */
function deleteSingleAudioTrack(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumber: number,
    audioIndex: number
  }
) {
  const {
    trackNumber,
    audioIndex
  } = action;

  trackDetails[trackNumber].splice(audioIndex, 1);
  return trackDetails;
}

/**
 * @description Removes scheduled track.
 * @param trackDetails 
 */
function bulkDeleteTracks(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumbers: number[],
    audioIndexes: number[]
  }
): AudioTrackDetails[][] {
  const {
    trackNumbers,
    audioIndexes
  } = action;

  console.assert(
    trackNumbers.length === audioIndexes.length,
    'Something went wrong with deleting multiple tracks: missing Track/Audio details.'
  );

  trackNumbers.forEach((trackNumber, index: number) => {
    trackDetails[trackNumber].splice(audioIndexes[index], 1);
  });

  return trackDetails;
}

/**
 * @description Slice audio if slicer intersects track.
 * @param trackDetails track details
 * @param slicerSelection Sliced Details
 */
function sliceAudioTracksAtPoint(
  trackDetails: AudioTrackDetails[][],
  slicerSelection: SlicerSelection
) {
  const { 
    startTrack,
    endTrack,
    pointOfSliceSecs
  }= slicerSelection;
  const slicesToReschedule = [];
  
  for (let trackIndex = startTrack; trackIndex <= endTrack; ++trackIndex) {
    let audioTracks = trackDetails[trackIndex];
    const pendingTracksToAppend: AudioTrackDetails[] = [];

    for (let audioIndex = 0; audioIndex < audioTracks.length; ++audioIndex) {
      const audio = audioTracks[audioIndex];
      const offsetInMicros = audio.trackDetail.offsetInMicros;
      const offsetInSecs = offsetInMicros / SEC_TO_MICROSEC;
      const oldStartOffset = audio.trackDetail.startOffsetInMicros;
      const oldEndOffset = audio.trackDetail.endOffsetInMicros;
      const oldEndDuration = oldEndOffset - oldStartOffset;
      const endOffsetSecs = (offsetInMicros + oldEndDuration) / SEC_TO_MICROSEC;

      /// Check if intersects.
      if (endOffsetSecs > pointOfSliceSecs && pointOfSliceSecs > offsetInSecs) {
        const newEndPoint = (pointOfSliceSecs * SEC_TO_MICROSEC);
        const firstEndDuration = (newEndPoint - offsetInMicros);

        const firstHalf: AudioTrackDetails = {
          ...audio,
          trackDetail: {
            ...audio.trackDetail,
            endOffsetInMicros: oldStartOffset + firstEndDuration
          }
        }

        const secondHalf: AudioTrackDetails = {
          ...audio,
          trackDetail: {
            ...audio.trackDetail,
            scheduledKey: Symbol(),
            offsetInMicros: newEndPoint,
            startOffsetInMicros: oldStartOffset + firstEndDuration,
          }
        };

        audioTracks[audioIndex] = firstHalf;
        pendingTracksToAppend.push(secondHalf);
        slicesToReschedule.push(firstHalf, secondHalf);
      }
    }

    for (const pendingTrack of pendingTracksToAppend) {
      audioTracks.push(pendingTrack);
      }

    if (pendingTracksToAppend.length > 0) {
      audioTracks.sort((first, second) => (
        first.trackDetail.offsetInMicros - second.trackDetail.offsetInMicros
      ));
    }
  }

  audioManager.rescheduleAllTracks(trackDetails, slicesToReschedule);

  return trackDetails;
}

function setTrackOffsetToAFinalPoint(
  trackDetails: AudioTrackDetails[][],
  trackChangeDetails: {
    trackNumber: number
    audioIndex: number
    startOffsetInMicros: number
    endOffsetInMicros: number
    offsetInMicros: number
  }
) {
  const {
    trackNumber,
    audioIndex,
    offsetInMicros,
    startOffsetInMicros,
    endOffsetInMicros
  } = trackChangeDetails;

  trackDetails[trackNumber][audioIndex].trackDetail.offsetInMicros = offsetInMicros;
  trackDetails[trackNumber][audioIndex].trackDetail.endOffsetInMicros = endOffsetInMicros;
  trackDetails[trackNumber][audioIndex].trackDetail.startOffsetInMicros = startOffsetInMicros;

  return trackDetails;
}

function setMultipleOffsets(
  trackDetails: AudioTrackDetails[][],
  tracksChangeDetails: {
    allTrackNumbers: number[],
    allAudioIndexes: number[],
    allOffsetsInMicros: number[],
    allStartOffsetsInMicros: number[],
    allEndOffsetsInMicros: number[]
  }
) {
  const {
    allTrackNumbers,
    allAudioIndexes,
    allOffsetsInMicros,
    allStartOffsetsInMicros,
    allEndOffsetsInMicros
  } = tracksChangeDetails;

  if (
    allAudioIndexes.length !== allTrackNumbers.length ||
    allAudioIndexes.length !== allOffsetsInMicros.length ||
    allAudioIndexes.length !== allStartOffsetsInMicros.length ||
    allAudioIndexes.length !== allEndOffsetsInMicros.length
  ) {
    return trackDetails;
  }

  for (let index = 0; index < allTrackNumbers.length; ++index) {
    const trackNumber = allTrackNumbers[index];
    const audioIndex = allAudioIndexes[index];
    const offsetInMicros = allOffsetsInMicros[index];
    const startOffsetInMicros = allStartOffsetsInMicros[index];
    const endOffsetInMicros = allEndOffsetsInMicros[index];

    trackDetails[trackNumber][audioIndex].trackDetail.offsetInMicros = offsetInMicros;
    trackDetails[trackNumber][audioIndex].trackDetail.startOffsetInMicros = startOffsetInMicros;
    trackDetails[trackNumber][audioIndex].trackDetail.endOffsetInMicros = endOffsetInMicros;
  }

  return trackDetails;
}

export type AudioTrackChangeDetails = AudioTrackDetails & {
  trackNumber: number
  audioIndex: number
}

export function undoSnapshotChange(
  trackDetails: AudioTrackDetails[][],
  changeDetails: ChangeDetails<AudioTrackChangeDetails>[]
) {
  for (const changeDetail of changeDetails) {
    switch (changeDetail.changeType) {
      // Remove the values.
      case ChangeType.NewlyCreated: {
        const { trackNumber, audioIndex, trackDetail: { scheduledKey } } = changeDetail.data;
        const { scheduledKey: currentScheduledKey } = trackDetails[trackNumber][audioIndex].trackDetail;

        console.assert(scheduledKey === currentScheduledKey);
        audioManager.removeTrackFromScheduledNodes(trackDetails[trackNumber][audioIndex]);
        trackDetails[trackNumber].splice(audioIndex, 1);

        break;
      };

      // Add them back
      case ChangeType.Removed: {
        const { trackNumber, audioIndex, ...rest } = changeDetail.data;
        trackDetails[trackNumber].splice(audioIndex, 0, rest);
        audioManager.scheduleSingleTrack(rest.audioId, trackDetails[trackNumber][audioIndex].trackDetail)

        break;
      };

      // Change to previous
      case ChangeType.Updated: {
        const { trackNumber, audioIndex, ...rest } = changeDetail.data.previous;
        const { scheduledKey: currentScheduledKey } = trackDetails[trackNumber][audioIndex].trackDetail;
        console.assert(rest.trackDetail.scheduledKey === currentScheduledKey);
        trackDetails[trackNumber][audioIndex] = rest;
        audioManager.rescheduleTrackFromScheduledNodes(currentScheduledKey, trackDetails[trackNumber][audioIndex].trackDetail)

        break;
      }
    }
  }
}

/**
 * @description Compare snapshot with previous snapshot.
 * @param snapshot captured snapshot,
 * @param trackDetails 
 */
export function compareSnapshots(
  snapshot: Snapshot<AudioTrackDetails[][]>, 
  trackDetails: AudioTrackDetails[][]
): Array<ChangeDetails<AudioTrackChangeDetails>> {
  const { state } = snapshot;
  const changedDetails: ChangeDetails<AudioTrackChangeDetails>[] = [];

  for (let trackIndex = 0; trackIndex < trackDetails.length; ++trackIndex) {
    const previousTrack = state[trackIndex];
    const currentTrack = trackDetails[trackIndex];

    // Get all unique keys
    const visitedScheduledTracks = currentTrack
      .map(track => track.trackDetail.scheduledKey)
      .concat(previousTrack.map(track => track.trackDetail.scheduledKey))
      .filter((trackKey, index, trackArray) => trackArray.indexOf(trackKey) === index);

    // Check if two keys are same.
    for (const key of visitedScheduledTracks) {
      const currentScheduledTrackIndex = currentTrack.findIndex(track => (
        track.trackDetail.scheduledKey === key
      ));
      const previousScheduledTrackIndex = previousTrack.findIndex(track => (
        track.trackDetail.scheduledKey === key
      ));

      if (currentScheduledTrackIndex > -1 && previousScheduledTrackIndex > -1) {
        // Perform action if both are not equal.
        // Add updated values to the track
        if (!compareValues(currentTrack[currentScheduledTrackIndex], previousTrack[previousScheduledTrackIndex])) {
          changedDetails.push({
            changeType: ChangeType.Updated,
            data: {
              previous: {
                ...previousTrack[previousScheduledTrackIndex],
                trackNumber: trackIndex,
                audioIndex: previousScheduledTrackIndex
              },
              current: {
                ...currentTrack[currentScheduledTrackIndex],
                trackNumber: trackIndex,
                audioIndex: previousScheduledTrackIndex
              }
            }
          });
        }
      } else if (currentScheduledTrackIndex > -1) {
        // Newly added
        changedDetails.push({
          changeType: ChangeType.NewlyCreated,
          data: {
            ...currentTrack[currentScheduledTrackIndex],
            trackNumber: trackIndex,
            audioIndex: currentScheduledTrackIndex
          }
        });
      } else {
        // This will always run, if nothing else.
        changedDetails.push({
          changeType: ChangeType.Removed,
          data: {
            ...previousTrack[previousScheduledTrackIndex],
            trackNumber: trackIndex,
            audioIndex: previousScheduledTrackIndex
          }
        });
      }
    }
  }

  return changedDetails;
}

export const trackDetailsSlice = createSlice({
  name: 'trackDetailSlices',
  initialState,
  reducers: {
    /**
     * @description Toggle status of track
     * @param state current state of the track
     * @param action payload, to pause or play the track
     */
    togglePlay(state, action: PayloadAction<Status>) {
      state.status = action.payload;

      if (state.status === Status.Pause) {
        audioService.useAudioContext().suspend().then(function() {
          audioManager.useManager().suspend();
          animationBatcher.stopAnimation();
        });
      } else {
        audioService.useAudioContext().resume().then(function() {
          audioManager.useManager().resume();
          animationBatcher.runAnimations(); 
        });
      }
    },
    /// Add an audio to certain track number
    addAudioToTrack(state, action: PayloadAction<{ trackNumber: number, track: AudioTrackDetails }>) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, addNewAudioToTrack);
      // Calculate the maxTime 
      const { track } = action.payload;
      const currentTime = state.maxTimeMicros - twoMinuteInMicros;
      // Should always exist in seconds
      const startTimeOfTrack = track.trackDetail.startOffsetInMicros ?? 0;
      const endTimeOfTrack = track.trackDetail.endOffsetInMicros ?? ((track.duration as number) * SEC_TO_MICROSEC);

      const trackTotalTime = endTimeOfTrack - startTimeOfTrack;
      const endTime = track.trackDetail.offsetInMicros + trackTotalTime;

      if (currentTime < endTime) {
        state.maxTimeMicros = endTime + twoMinuteInMicros;
        audioManager.setLoopEnd(endTime);
      }
    },
    /// Delete the audio to certain track number
    deleteAudioFromTrack(state, action: PayloadAction<{trackNumber: number, audioIndex: number}>) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, deleteAudioFromTrack_);
      // Now find the next longest track among all the tracks exists with offset
      const maxTime = getMaxTime(state.trackDetails);

      state.maxTimeMicros = maxTime + twoMinuteInMicros;
      audioManager.setLoopEnd(maxTime);
    },
    /// Selecting multiple tracks at once.
    selectTracksWithinSpecifiedRegion(state, action: PayloadAction<RegionSelection>) {
      const { trackStart, trackEnd, pointEndSec, pointStartSec } = action.payload;

      for (let index = 0; index < state.trackDetails.length; ++index) {
        for (const track of state.trackDetails[index]) {
          if (index < trackStart || index > trackEnd) {
            track.trackDetail.selected = false;
          } else {
            track.trackDetail.selected = isWithinRegionAndNotSelected(track, pointStartSec, pointEndSec);
          }
        }
      }
    },
    /// Selecting multiple tracks at once.
    selectTracksWithinSelectedSeekbarSection(state, action: PayloadAction<TimeSectionSelection>) {
      const {
        startTimeMicros,
        endTimeMicros
      } = action.payload;
      const pointStartSec = startTimeMicros / SEC_TO_MICROSEC;
      const pointEndSec = endTimeMicros / SEC_TO_MICROSEC;

      for (let index = 0; index < state.trackDetails.length; ++index) {
        for (const track of state.trackDetails[index]) {
          track.trackDetail.selected = isWithinRegionAndNotSelected(track, pointStartSec, pointEndSec);
        }
      }
    },
    /// Selecting all tracks.
    selectAllTracks(state) {
      markSelectionForAllAudioTracks(state.trackDetails, true);
    },
    /// Selecting all tracks.
    deselectAllTracks(state) {
      markSelectionForAllAudioTracks(state.trackDetails, false);
    },
    /**
     * Create a clone of multiple audio tracks.
     * @param state current state
     * @param action track details to be cloned.
     */
    cloneMultipleAudioTrack(
      state,
      action: PayloadAction<{
        trackNumbers: number[],
        audioIndexes: number[]
      }>
    ) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, cloneMultipleAudioTracks);
    },
    /**
     * Delete multiple audio track.
     * @param state current state
     * @param action track details to be cloned.
     */
    deleteMultipleAudioTrack(
      state,
      action: PayloadAction<{
        trackNumbers: number[],
        audioIndexes: number[]
      }>
    ) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, bulkDeleteTracks);

      const maxTime = getMaxTime(state.trackDetails);
      state.maxTimeMicros = maxTime + twoMinuteInMicros;
      audioManager.setLoopEnd(maxTime);
    },
    /**
     * Create a clone of the audio track.
     * @param state current state
     * @param action track details to be cloned.
     */
    cloneAudioTrack(
      state,
      action: PayloadAction<{
        trackNumber: number,
        audioIndex: number
      }>
    ) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, cloneSingleAudioTrack);
    },
    /**
     * Slice tracks into two different region based on information mentioned in Slicer
     * selection
     * 
     * @param state Current state
     * @param action action to perform
     */
    sliceAudioTracks(state, action: PayloadAction<SlicerSelection>) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, sliceAudioTracksAtPoint);
    },

    /**
     * @description All transformation that should made are calculated here; after releasing trigger from the mouse.
     * The offsets calculated from the editor are brought here and are set to the particular scheduled audio track 
     * that the user interacted with.
     * 
     * @param state Current State
     * @param action Information related to the changes:
     * - `trackNumber`: track number in which audio is scheduled.
     * - `audioIndex`: index in this track, which can be referenced in 2d array as `state[trackNumber][audioIndex]`
     * - `offsetInMillis`: Offset in track, measured from starting point of the **Workspace** `'00:00'` in millis.
     * - `startOffsetInMillis`: Offset denoting where the track should start, measured from starting point of the **Audio**.
     * - `endOffsetInMillis`: Offset denoting where the track should end, measured from starting point of the **Audio**
     */
    setOffsetDetailsToAudioTrack(
      state,
      action: PayloadAction<{
        trackNumber: number,
        audioIndex: number,
        offsetInMicros: number,
        startOffsetInMicros: number,
        endOffsetInMicros: number
      }>
    ) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, setTrackOffsetToAFinalPoint);
      const {
        trackNumber,
        audioIndex,
        offsetInMicros
      } = action.payload;

      const trackDetails = state.trackDetails[trackNumber][audioIndex];
      const currentTime = state.maxTimeMicros - twoMinuteInMicros;

      // Should always exist in milliseconds
      const startTimeOfTrack = trackDetails.trackDetail.startOffsetInMicros ?? 0;
      const endTimeOfTrack = trackDetails.trackDetail.endOffsetInMicros ?? ((trackDetails.duration as number) * SEC_TO_MICROSEC);
      const trackTotalTime = endTimeOfTrack - startTimeOfTrack;

      const endTime = offsetInMicros + trackTotalTime;

      if (currentTime < endTime) {
        state.maxTimeMicros = endTime + twoMinuteInMicros;
        audioManager.setLoopEnd(endTime);
      } else {
        const maxTime = getMaxTime(state.trackDetails);
        state.maxTimeMicros = maxTime + twoMinuteInMicros;
        audioManager.setLoopEnd(maxTime);
      }
    },
    /**
     * @description Set new buffer to audio.
     * @param state current state 
     * @param action action to perform.
     */
    applyChangesToModifiedAudio(
      state,
      action: PayloadAction<{
        audioId: symbol,
        transformation: AudioTransformation
      }>
    ) {
      const { audioId, transformation } = action.payload;

      for (const track of state.trackDetails) {
        for (const audio of track) {
          if (audio.audioId === audioId) {
            const index = audio.effects.indexOf(transformation);

            if (index > -1) {
              audio.effects.splice(index, 1);
            } else {
              audio.effects.push(transformation);
            }
          }
        }
      }
    },

    /**
     * All transformation that should made are calculated here; after releasing trigger from the mouse.
     * The offsets calculated from the editor are brought here and are set to *Multiple selected scheduled* audio track that 
     * the user interacted with.
     * 
     * @param state Current State
     * @param action Information related to the changes, all in array:
     * - `trackNumber`: track number in which audio is scheduled.
     * - `audioIndex`: index in this track, which can be referenced in 2d array as `state[trackNumber][audioIndex]`
     * - `offsetInMillis`: Offset in track, measured from starting point of the **Workspace** `'00:00'` in millis.
     * - `startOffsetInMillis`: Offset denoting where the track should start, measured from starting point of the **Audio**.
     * - `endOffsetInMillis`: Offset denoting where the track should end, measured from starting point of the **Audio**
     */
    setOffsetDetailsToMultipleAudioTrack(
      state,
      action: PayloadAction<{
        allTrackNumbers: number[],
        allAudioIndexes: number[],
        allOffsetsInMicros: number[],
        allStartOffsetsInMicros: number[],
        allEndOffsetsInMicros: number[]
      }>)
    {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, setMultipleOffsets)
      const maxTime = getMaxTime(state.trackDetails);
      state.maxTimeMicros = maxTime + twoMinuteInMicros;
      audioManager.setLoopEnd(maxTime);
    },
    /// Remove all the tracks related to this audio ID.
    removeAudioFromAllTracks(state, action: PayloadAction<symbol>){
      const snapshot = createSnapshot(state.trackDetails);
      const { payload: audioIdToDelete } = action;

      /// Filter all the tracks that contains this Audio
      for (let index = 0; index < state.trackDetails.length; ++index) {
        state.trackDetails[index] = state.trackDetails[index].filter(detail => detail.audioId !== audioIdToDelete);
      }

      const maxTime = getMaxTime(state.trackDetails);
      state.maxTimeMicros = maxTime + twoMinuteInMicros;
      audioManager.setLoopEnd(maxTime);
      changeHistory.storeChanges(snapshot, state.trackDetails, WorkspaceChange.TrackChanges);
    },

    rollbackChanges(state, action: PayloadAction<ChangeDetails<AudioTrackChangeDetails>[]>) {
      undoSnapshotChange(state.trackDetails, action.payload);
      const maxTime = getMaxTime(state.trackDetails);
      state.maxTimeMicros = maxTime + twoMinuteInMicros;
      audioManager.setLoopEnd(maxTime);
    }
  }
});

export const {
  addAudioToTrack,
  deleteAudioFromTrack,
  selectTracksWithinSpecifiedRegion,
  selectTracksWithinSelectedSeekbarSection,
  setOffsetDetailsToAudioTrack,
  sliceAudioTracks,
  applyChangesToModifiedAudio,
  cloneAudioTrack,
  cloneMultipleAudioTrack,
  deleteMultipleAudioTrack,
  selectAllTracks,
  deselectAllTracks,
  setOffsetDetailsToMultipleAudioTrack,
  togglePlay,
  removeAudioFromAllTracks,
  rollbackChanges
} = trackDetailsSlice.actions;

export default trackDetailsSlice.reducer;
