import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AudioDetails } from './audiostate';
import { audioService } from '../services/audioservice';
import { audioManager } from '../services/audiotrackmanager';
import { RegionSelection } from '../components/editor/regionselect';
import { SlicerSelection } from '../components/editor/slicer';
import { AudioTransformation } from '../services/interfaces';

/**
 * Information of the track, like start offset, end offset and selection.
 * Maybe store additional data.
 */
export type TrackInformation = {
  /**
   * Start offset relative to the audio.
   */
  startOffsetInMillis: number,
  /**
   * End offset relative to the audio.
   */
  endOffsetInMillis: number,
  /**
   * Boolean if selected or not.
   */
  selected: boolean
}

export enum Status {
  Pause,
  Play
}

const twoMinuteInMillis: number = 2 * 60 * 1000;

export type ScheduledInformation = {
  offsetInMillis: number,
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
  maxTimeMillis: number,
  trackDetails: AudioTrackDetails[][]
} = {
  status: Status.Pause,
  maxTimeMillis: twoMinuteInMillis,
  trackDetails: Array.from({length: audioManager.totalTrackSize}, () => [])
}

function getMaxTime(trackDetails: AudioTrackDetails[][]) {
  return trackDetails.reduce((maxTime: number, currentArray) => {
    const maxTimeInCurrentTrack = currentArray.reduce((maxTime: number, currentTrack) => {
      // Should always exist in seconds
      const startTimeOfTrack = currentTrack.trackDetail.startOffsetInMillis;
      const endTimeOfTrack = currentTrack.trackDetail.endOffsetInMillis;

      const trackTotalTime = endTimeOfTrack - startTimeOfTrack;
      const endTime = currentTrack.trackDetail.offsetInMillis + trackTotalTime;
      return Math.max(maxTime, endTime);
    }, 0)

    return Math.max(maxTime, maxTimeInCurrentTrack);
  }, 0);
}

function isWithinRegionAndNotSelected(
  track: AudioTrackDetails,
  pointStartSec: number,
  pointEndSec: number
) {
  const startTime = track.trackDetail.offsetInMillis / 1000;
  const startOffset = track.trackDetail.startOffsetInMillis / 1000;
  const endOffset = track.trackDetail.endOffsetInMillis / 1000;
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

export const trackDetailsSlice = createSlice({
  name: 'addAudioToTrack',
  initialState,
  reducers: {
    /**
     * Toggle status of track
     * 
     * @param state current state of the track
     * @param action payload, to pause or play the track
     */
    togglePlay(state, action: PayloadAction<Status>) {
      state.status = action.payload;

      if (state.status === Status.Pause) {
        audioService.useAudioContext().suspend().then(function() {
          audioManager.useManager().suspend();
        });
      } else {
        audioService.useAudioContext().resume().then(function() {
          audioManager.useManager().resume();
        });
      }
    },
    /// Add an audio to certain track number
    addAudioToTrack(state, action: PayloadAction<{ trackNumber: number, trackDetails: AudioTrackDetails }>) {
      const { trackNumber, trackDetails } = action.payload;
      state.trackDetails[trackNumber].push(trackDetails);
      // Calculate the maxTime 
      const currentTime = state.maxTimeMillis - twoMinuteInMillis;
      // Should always exist in seconds
      const startTimeOfTrack = trackDetails.trackDetail.startOffsetInMillis ?? 0;
      const endTimeOfTrack = trackDetails.trackDetail.endOffsetInMillis ?? ((trackDetails.buffer?.duration as number) * 1000);

      const trackTotalTime = endTimeOfTrack - startTimeOfTrack;
      const endTime = trackDetails.trackDetail.offsetInMillis + trackTotalTime;

      if (currentTime < endTime) {
        state.maxTimeMillis = endTime + twoMinuteInMillis;
        audioManager.setLoopEnd(endTime);
      } else {
        const maxTime = getMaxTime(state.trackDetails);
        state.maxTimeMillis = maxTime + twoMinuteInMillis;
        audioManager.setLoopEnd(maxTime);
      }
    },
    /// Delete the audio to certain track number
    deleteAudioFromTrack(state, action: PayloadAction<{trackNumber: number, audioIndex: number}>) {
      const { trackNumber, audioIndex } = action.payload;
      /// Delete from the track
      state.trackDetails[trackNumber].splice(audioIndex, 1);
      /// Now find the next longest track among all the tracks exists with offset
      const maxTime = getMaxTime(state.trackDetails);

      state.maxTimeMillis = maxTime + twoMinuteInMillis;
      audioManager.setLoopEnd(maxTime);
    },
    /// Selecting multiple tracks at once.
    selectTracksWithinSpecifiedRegion(state, action: PayloadAction<RegionSelection>) {
      const { trackStart, trackEnd, pointEndSec, pointStartSec } = action.payload;

      let trackIndex = 0;
      for (let index = 0; index < state.trackDetails.length; ++index) {
        for (const track of state.trackDetails[index]) {
          if (trackIndex < trackStart || trackIndex > trackEnd) {
            track.trackDetail.selected = false;
          } else {
            track.trackDetail.selected = isWithinRegionAndNotSelected(track, pointStartSec, pointEndSec);
          }
        }
        ++trackIndex;
      }
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
      const { trackNumbers, audioIndexes } = action.payload;
      const length = trackNumbers.length;

      for (let index = 0; index < length; ++index) {
        const trackNumber = trackNumbers[index];
        const audioIndex = audioIndexes[index];

        const clonedDetails: AudioTrackDetails = {
          ...state.trackDetails[trackNumber][audioIndex],
          trackDetail: {
            ...state.trackDetails[trackNumber][audioIndex].trackDetail,
            scheduledKey: Symbol(),
            selected: false
          }
        };
  
        state.trackDetails[trackNumber].push(clonedDetails);
      }
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
      const { trackNumbers, audioIndexes } = action.payload;
      const length = trackNumbers.length;

      const aggregateIndex: Array<Array<number>> = Array.from(
        { length: audioManager.totalTrackSize },
        () => []
      );

      for (let index = 0; index < length; ++index) {
        const trackNumber = trackNumbers[index];
        const audioIndex = audioIndexes[index];

        aggregateIndex[trackNumber].push(audioIndex);
      }

      for (let index = 0; index < audioManager.totalTrackSize; ++index) {
        state.trackDetails[index] = state.trackDetails[index].filter((_, audioIndex) => (
          aggregateIndex[index].indexOf(audioIndex) === -1
        ));
      }
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
      const { trackNumber, audioIndex } = action.payload;

      const clonedDetails: AudioTrackDetails = {
        ...state.trackDetails[trackNumber][audioIndex],
        trackDetail: {
          ...state.trackDetails[trackNumber][audioIndex].trackDetail,
          scheduledKey: Symbol(),
        }
      };

      state.trackDetails[trackNumber].push(clonedDetails);
    },
    /**
     * Slice tracks into two different region based on information mentioned in Slicer
     * selection
     * 
     * @param state Current state
     * @param action action to perform
     */
    sliceAudioTracks(state, action: PayloadAction<SlicerSelection>) {
      const { startTrack, endTrack, pointOfSliceSecs } = action.payload;
      const slicesToReschedule = [];
      
      for (let trackIndex = startTrack; trackIndex <= endTrack; ++trackIndex) {
        let audioTracks = state.trackDetails[trackIndex];
        const pendingTracksToAppend: AudioTrackDetails[] = [];

        for (let audioIndex = 0; audioIndex < audioTracks.length; ++audioIndex) {
          const audio = audioTracks[audioIndex];
          const offsetInMillis = audio.trackDetail.offsetInMillis;
          const offsetInSecs = offsetInMillis / 1000;
          const oldStartOffset = audio.trackDetail.startOffsetInMillis;
          const oldEndOffset = audio.trackDetail.endOffsetInMillis;
          const oldEndDuration = oldEndOffset - oldStartOffset;
          const endOffsetSecs = (offsetInMillis + oldEndDuration) / 1000;

          /// Check if intersects.
          if (endOffsetSecs > pointOfSliceSecs && pointOfSliceSecs > offsetInSecs) {
            const newEndPoint = (pointOfSliceSecs * 1000);
            const firstEndDuration = (newEndPoint - offsetInMillis);

            const firstHalf: AudioTrackDetails = {
              ...audio,
              trackDetail: {
                ...audio.trackDetail,
                endOffsetInMillis: oldStartOffset + firstEndDuration
              }
            }

            const secondHalf: AudioTrackDetails = {
              ...audio,
              trackDetail: {
                ...audio.trackDetail,
                scheduledKey: Symbol(),
                offsetInMillis: newEndPoint,
                startOffsetInMillis: oldStartOffset + firstEndDuration,
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
      }
      // To do: call from source instead of from here.
      audioManager.rescheduleAllTracks(state.trackDetails, slicesToReschedule);
    },

    /**
     * All transformation that should made are calculated here; after releasing trigger from the mouse.
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
    setOffsetInMillisToAudioTrack(
      state,
      action: PayloadAction<{
        trackNumber: number,
        audioIndex: number,
        offsetInMillis: number,
        startOffsetInMillis: number,
        endOffsetInMillis: number
      }>
    ) {
      const {
        trackNumber,
        audioIndex,
        offsetInMillis,
        startOffsetInMillis,
        endOffsetInMillis
      } = action.payload;
      state.trackDetails[trackNumber][audioIndex].trackDetail.offsetInMillis = offsetInMillis;
      state.trackDetails[trackNumber][audioIndex].trackDetail.startOffsetInMillis = startOffsetInMillis;
      state.trackDetails[trackNumber][audioIndex].trackDetail.endOffsetInMillis = endOffsetInMillis;

      const trackDetails = state.trackDetails[trackNumber][audioIndex];
      const currentTime = state.maxTimeMillis - twoMinuteInMillis;

      // Should always exist in milliseconds
      const startTimeOfTrack = trackDetails.trackDetail.startOffsetInMillis ?? 0;
      const endTimeOfTrack = trackDetails.trackDetail.endOffsetInMillis ?? ((trackDetails.buffer?.duration as number) * 1000);
      const trackTotalTime = endTimeOfTrack - startTimeOfTrack;

      const endTime = offsetInMillis + trackTotalTime;

      if (currentTime < endTime) {
        state.maxTimeMillis = endTime + twoMinuteInMillis;
        audioManager.setLoopEnd(endTime);
      } else {
        const maxTime = getMaxTime(state.trackDetails);
        state.maxTimeMillis = maxTime + twoMinuteInMillis;
        audioManager.setLoopEnd(maxTime);
      }
    },

    applyChangesToModifiedAudio(
      state,
      action: PayloadAction<{
        audioId: symbol,
        buffer: AudioBuffer,
        transformation: AudioTransformation
      }>
    ) {
      const { audioId, buffer, transformation } = action.payload;

      for (const track of state.trackDetails) {
        for (const audio of track) {
          if (audio.audioId === audioId) {
            audio.buffer = buffer;
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
    setOffsetInMillisToMultipleAudioTrack(
      state,
      action: PayloadAction<{
        allTrackNumbers: number[],
        allAudioIndexes: number[],
        allOffsetsInMillis: number[],
        allStartOffsetsInMillis: number[],
        allEndOffsetsInMillis: number[]
      }>) 
    {
      const {
        allTrackNumbers,
        allAudioIndexes,
        allOffsetsInMillis,
        allStartOffsetsInMillis,
        allEndOffsetsInMillis
      } = action.payload;

      if (
        allAudioIndexes.length !== allTrackNumbers.length ||
        allAudioIndexes.length !== allOffsetsInMillis.length ||
        allAudioIndexes.length !== allStartOffsetsInMillis.length ||
        allAudioIndexes.length !== allEndOffsetsInMillis.length
      ) {
        return;
      }

      for (let index = 0; index < allTrackNumbers.length; ++index) {
        const trackNumber = allTrackNumbers[index];
        const audioIndex = allAudioIndexes[index];
        const offsetInMillis = allOffsetsInMillis[index];
        const startOffsetInMillis = allStartOffsetsInMillis[index];
        const endOffsetInMillis = allEndOffsetsInMillis[index];

        state.trackDetails[trackNumber][audioIndex].trackDetail.offsetInMillis = offsetInMillis;
        state.trackDetails[trackNumber][audioIndex].trackDetail.startOffsetInMillis = startOffsetInMillis;
        state.trackDetails[trackNumber][audioIndex].trackDetail.endOffsetInMillis = endOffsetInMillis;
      }

      const maxTime = getMaxTime(state.trackDetails);
      state.maxTimeMillis = maxTime + twoMinuteInMillis;
      audioManager.setLoopEnd(maxTime);
    },
    /// Remove all the tracks related to this audio ID.
    removeAudioFromAllTracks(state, action: PayloadAction<symbol>){
      const { payload: audioIdToDelete } = action;

      /// Filter all the tracks that contains this Audio
      for (let index = 0; index < state.trackDetails.length; ++index) {
        state.trackDetails[index] = state.trackDetails[index].filter(detail => detail.audioId !== audioIdToDelete);
      }

      const maxTime = getMaxTime(state.trackDetails);
      state.maxTimeMillis = maxTime + twoMinuteInMillis;
      audioManager.setLoopEnd(maxTime);
    }
  }
});

export const {
  addAudioToTrack,
  deleteAudioFromTrack,
  selectTracksWithinSpecifiedRegion,
  setOffsetInMillisToAudioTrack,
  sliceAudioTracks,
  applyChangesToModifiedAudio,
  cloneAudioTrack,
  cloneMultipleAudioTrack,
  deleteMultipleAudioTrack,
  // resetChangesToAudio,
  setOffsetInMillisToMultipleAudioTrack,
  togglePlay,
  removeAudioFromAllTracks
} = trackDetailsSlice.actions;

export default trackDetailsSlice.reducer;
