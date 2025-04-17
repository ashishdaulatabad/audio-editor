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
import { TimeframeMode } from '../components/player/player';
import { deleteTrackId, getRandomTrackId } from '../services/random';

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
  id: number,
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
  status: Status
  maxTimeMicros: number
  timeframeMode: TimeframeMode
  timePerUnitLineInSeconds: number
  trackDetails: AudioTrackDetails[][]
  trackUniqueIds: Array<number>
} = {
  status: Status.Pause,
  maxTimeMicros: twoMinuteInMicros,
  timeframeMode: TimeframeMode.Time,
  timePerUnitLineInSeconds: 5,
  trackDetails: Array.from({length: 30}, () => []),
  trackUniqueIds: new Array<number>(),
};

/**
 * @description Get max time the track should run.
 * @param trackDetails Track Details
 * @returns Max Time in microseconds.
 */
function getMaxTime(trackDetails: AudioTrackDetails[][]): number {
  return trackDetails.reduce((maxTime: number, currentArray) => {
    const maxTimeInCurrentTrack = currentArray.reduce((maxTime: number, currentTrack) => {
      // Should always exist in microseconds
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

function syncAllIds(state: AudioTrackDetails[][], existingIds: Array<number>) {
  const newIds = [];

  for (const trackElements of state) {
    for (const trackElement of trackElements) {
      const id = trackElement.trackDetail.id;

      if (id === -1) {
        const newId = getRandomTrackId(existingIds);
        trackElement.trackDetail.id = newId;
      }

      newIds.push(trackElement.trackDetail.id);
    }
  }

  return newIds;
}

function addNewAudioToTrack(
  trackDetails: AudioTrackDetails[][],
  action: {
    trackNumber: number,
    track: AudioTrackDetails
  }
): AudioTrackDetails[][] {
  const { track, trackNumber } = action;
  trackDetails[trackNumber].push(track);
  // Probably sort array based on the appearance of each scheduled track?
  // This enable a domino-effect, making user's life easier to pull
  // out overlapping tracks.
  trackDetails[trackNumber] = trackDetails[trackNumber].sort((a, b) => (
    a.trackDetail.offsetInMicros - b.trackDetail.offsetInMicros
  ));

  return trackDetails;
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
      id: -1,
    }
  };

  clonedDetails.trackDetail.selected = false;

  // Todo: Check adding immediately near the specified position, at the start or 
  // at the end, need to create a domino effect while scheduling track.
  trackDetails[trackNumber].push(clonedDetails);
  trackDetails[trackNumber] = trackDetails[trackNumber].sort((a, b) => (
    a.trackDetail.offsetInMicros - b.trackDetail.offsetInMicros
  ));

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
        // New cloned data: so new scheduled data.
        scheduledKey: Symbol(),
        id: -1,
      }
    };
    clonedDetails.trackDetail.selected = false;

    trackDetails[trackNumber].push(clonedDetails);
  });

  return trackDetails;
}

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
    const includedTracks: AudioTrackDetails[] = [], excludedTracks: AudioTrackDetails[] = [];

    trackDetails[trackNumber].forEach((track, audioIndex) => {
      if (!audioIndexes.includes(audioIndex)) {
        includedTracks.push(track)
      } else {
        excludedTracks.push(track);
      }
    });

    trackDetails[trackNumber] = includedTracks;
  });

  return trackDetails;
}

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

        // Creating a new track
        const secondHalf: AudioTrackDetails = {
          ...audio,
          trackDetail: {
            ...audio.trackDetail,
            scheduledKey: Symbol(),
            offsetInMicros: newEndPoint,
            startOffsetInMicros: oldStartOffset + firstEndDuration,
            id: -1
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

    // if (pendingTracksToAppend.length > 0) {
    //   audioTracks = audioTracks.sort((first, second) => (
    //     first.trackDetail.offsetInMicros - second.trackDetail.offsetInMicros
    //   ));
    // }
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

  // trackDetails[trackNumber] = trackDetails[trackNumber].sort((a, b) => (
  //   a.trackDetail.offsetInMicros - b.trackDetail.offsetInMicros
  // ));

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

  // const uniqueTrackNumbers = [...new Set(allTrackNumbers)];
  // uniqueTrackNumbers.forEach(trackNumber => {
  //   trackDetails[trackNumber] = trackDetails[trackNumber].sort((a, b) => (
  //     a.trackDetail.offsetInMicros - b.trackDetail.offsetInMicros
  //   ));
  // });

  // Todo: Sort them after moving all these tracks.

  return trackDetails;
}

function removeAudioFromAllScheduledTrack(
  trackDetails: AudioTrackDetails[][],
  audioId: symbol,
) {
  /// Filter all the tracks that contains this Audio
  for (let index = 0; index < trackDetails.length; ++index) {
    trackDetails[index] = trackDetails[index].filter(detail => detail.audioId !== audioId);
  }

  return trackDetails;
}

export type AudioTrackChangeDetails = AudioTrackDetails & {
  trackNumber: number
  audioIndex: number
}

// Todo: Revisit and change based on scheduledKeys instead of trackNumber and audioIndex,
// unless they are removed or added.
export function undoSnapshotChange(
  trackDetails: AudioTrackDetails[][],
  changeDetails: ChangeDetails<AudioTrackChangeDetails>[],
  trackIdSet: Array<number>,
  redo = false
) {
  // Reverse order: changes are inserted in order, splicing
  // should keep all indexes intact.
  // Another way is to do filter.
  const tracksToAdd: AudioTrackDetails[][] = Array.from({ length: trackDetails.length }, () => []);
  const audioTracksToRemove: number[][] = Array.from({ length: trackDetails.length }, () => []);

  for (const changeDetail of changeDetails) {
    switch (changeDetail.changeType) {
      // Remove the values.
      case ChangeType.NewlyCreated: {
        const {
          trackNumber,
          audioIndex,
          audioId,
          trackDetail
        } = changeDetail.data;

        // Undo state: Remove
        if (!redo) {
          const {
            scheduledKey: currentScheduledKey,
            id 
          } = trackDetails[trackNumber][audioIndex].trackDetail;
          console.assert(trackDetail.scheduledKey === currentScheduledKey);
          deleteTrackId(trackIdSet, id);
          // console.log(audioIndex, cloneValues(trackDetails[trackNumber]), trackDetail.scheduledKey === currentScheduledKey, deleteTrackId(id));
          audioManager.removeTrackFromScheduledNodes(trackDetails[trackNumber][audioIndex]);
          // Tracks cannot be removed like this:
          audioTracksToRemove[trackNumber].push(audioIndex);
          // trackDetails[trackNumber].splice(audioIndex, 1);
        } else {
          const newData = {
            ...changeDetail.data,
            trackDetail: {
              ...changeDetail.data.trackDetail,
              // We create a new one to avoid collision.
              id: -1
            }
          };
          tracksToAdd[trackNumber].push(newData);
          audioManager.scheduleSingleTrack(audioId, newData.trackDetail);
          // trackDetails[trackNumber].splice(audioIndex, 0, newData);
        }

        break;
      };

      // Add them back
      case ChangeType.Removed: {
        const {
          trackNumber,
          audioIndex,
          ...rest
        } = changeDetail.data;

        if (!redo) {
          const newData = {
            ...rest,
            trackDetail: {
              ...rest.trackDetail,
              id: -1,
            }
          };
          tracksToAdd[trackNumber].push(newData);
          // trackDetails[trackNumber].splice(audioIndex, 0, newData);
          audioManager.scheduleSingleTrack(rest.audioId, newData.trackDetail)
        } else {
          console.assert(trackDetails[trackNumber][audioIndex].trackDetail.scheduledKey === rest.trackDetail.scheduledKey);

          const trackId = trackDetails[trackNumber][audioIndex].trackDetail.id;

          deleteTrackId(trackIdSet, trackId);
          audioManager.removeTrackFromScheduledNodes(trackDetails[trackNumber][audioIndex]);
          audioTracksToRemove[trackNumber].push(audioIndex);
          // trackDetails[trackNumber].splice(audioIndex, 1);
        }

        break;
      };

      // Change to previous
      case ChangeType.Updated: {
        const { trackNumber, audioIndex, ...rest } = !redo ? 
          changeDetail.data.previous :
          changeDetail.data.current;
        const { audioIndex: previousAudioIndex } = !redo ? 
          changeDetail.data.current :
          changeDetail.data.previous;

        const { scheduledKey: currentScheduledKey } = trackDetails[trackNumber][previousAudioIndex].trackDetail;
        console.assert(rest.trackDetail.scheduledKey === currentScheduledKey);
        trackDetails[trackNumber][previousAudioIndex] = rest;
        audioManager.rescheduleTrackFromScheduledNodes(currentScheduledKey, trackDetails[trackNumber][previousAudioIndex].trackDetail);

        break;
      }
    }
  }

  tracksToAdd.forEach((track, trackNumber) => {
    const audioIndexes = audioTracksToRemove[trackNumber];

    trackDetails[trackNumber] = trackDetails[trackNumber]
      .filter((_, index) => audioIndexes.indexOf(index) === -1)
      .concat(track)
      // .sort((a, b) => a.trackDetail.offsetInMicros - b.trackDetail.offsetInMicros);
  });
}

/**
 * @description Compare snapshot with previous snapshot, used with change history
 * for storing changes between action..
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
                audioIndex: currentScheduledTrackIndex
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
    changeTimeframeMode(state, action: PayloadAction<TimeframeMode>) {
      // Based on this, the timer may change.
      state.timeframeMode = action.payload;
    },
    /// Add an audio to certain track number
    addAudioToTrack(
      state,
      action: PayloadAction<{
        trackNumber: number,
        track: AudioTrackDetails
      }>
    ) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, addNewAudioToTrack);
      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);
      // Calculate the maxTime 
      const { track } = action.payload;
      const currentTime = state.maxTimeMicros - twoMinuteInMicros;

      const startTimeOfTrack = track.trackDetail.startOffsetInMicros;
      const endTimeOfTrack = track.trackDetail.endOffsetInMicros;

      const trackTotalTime = endTimeOfTrack - startTimeOfTrack;
      const endTime = track.trackDetail.offsetInMicros + trackTotalTime;

      if (currentTime < endTime) {
        state.maxTimeMicros = endTime + twoMinuteInMicros;
        audioManager.setLoopEnd(endTime);
      }
    },
    /// Delete the audio to certain track number
    deleteAudioFromTrack(
      state,
      action: PayloadAction<{
        trackNumber: number, 
        audioIndex: number
      }>
    ) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, deleteSingleAudioTrack);
      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);
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
    selectAllTracks(state) {
      markSelectionForAllAudioTracks(state.trackDetails, true);
    },
    deselectAllTracks(state) {
      markSelectionForAllAudioTracks(state.trackDetails, false);
    },
    cloneMultipleAudioTrack(
      state,
      action: PayloadAction<{
        trackNumbers: number[],
        audioIndexes: number[]
      }>
    ) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, cloneMultipleAudioTracks);
      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);
    },
    deleteMultipleAudioTrack(
      state,
      action: PayloadAction<{
        trackNumbers: number[],
        audioIndexes: number[]
      }>
    ) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, bulkDeleteTracks);
      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);

      const maxTime = getMaxTime(state.trackDetails);
      state.maxTimeMicros = maxTime + twoMinuteInMicros;
      audioManager.setLoopEnd(maxTime);
    },
    cloneAudioTrack(
      state,
      action: PayloadAction<{
        trackNumber: number,
        audioIndex: number
      }>
    ) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, cloneSingleAudioTrack);
      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);
    },

    sliceAudioTracks(state, action: PayloadAction<SlicerSelection>) {
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, sliceAudioTracksAtPoint);
      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);
    },

    /**
     * @description All transformation that should made are calculated here; after releasing trigger from the mouse.
     * The offsets calculated from the editor are brought here and are set to the particular scheduled audio track 
     * that the user interacted with.
     * 
     * Similar changes to all track changes.
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
    applyChangesToModifiedAudio(
      state,
      action: PayloadAction<{
        audioId: symbol,
        transformation: AudioTransformation
      }>
    ) {
      const {
        audioId,
        transformation
      } = action.payload;

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
    removeAudioFromAllTracks(state, action: PayloadAction<{
      audioId: symbol,
      noSnapshot: true
    }>){
      const {
        audioId,
        noSnapshot
      } = action.payload;
      if (!noSnapshot) {
        state.trackDetails = processTrackHistory(state.trackDetails, audioId, removeAudioFromAllScheduledTrack);
      } else {
        state.trackDetails = removeAudioFromAllScheduledTrack(state.trackDetails, audioId);
      }
      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);

      const maxTime = getMaxTime(state.trackDetails);
      state.maxTimeMicros = maxTime + twoMinuteInMicros;
      audioManager.setLoopEnd(maxTime);
    },

    rollbackChanges(state, action: PayloadAction<{
      updatedChanges: ChangeDetails<AudioTrackChangeDetails>[],
      redo: boolean
    }>) {
      const { updatedChanges, redo } = action.payload;

      undoSnapshotChange(state.trackDetails, updatedChanges, state.trackUniqueIds, redo);
      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);
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
