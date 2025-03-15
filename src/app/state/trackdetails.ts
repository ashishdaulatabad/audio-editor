import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AudioDetails } from './audiostate';
import { audioService } from '../services/audioservice';
import { audioManager } from '../services/audiotrackmanager';
import { RegionSelection } from '../components/editor/regionselect';
import { SlicerSelection } from '../components/editor/slicer';
import { AudioTransformation } from '../services/interfaces';
import { TimeSectionSelection } from '../components/editor/seekbar';

/**
 * Information of the track, like start offset, end offset and selection.
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

function getMaxTime(trackDetails: AudioTrackDetails[][]) {
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
      const currentTime = state.maxTimeMicros - twoMinuteInMicros;
      // Should always exist in seconds
      const startTimeOfTrack = trackDetails.trackDetail.startOffsetInMicros ?? 0;
      const endTimeOfTrack = trackDetails.trackDetail.endOffsetInMicros ?? ((trackDetails.duration as number) * SEC_TO_MICROSEC);

      const trackTotalTime = endTimeOfTrack - startTimeOfTrack;
      const endTime = trackDetails.trackDetail.offsetInMicros + trackTotalTime;

      if (currentTime < endTime) {
        state.maxTimeMicros = endTime + twoMinuteInMicros;
        audioManager.setLoopEnd(endTime);
      } else {
        const maxTime = getMaxTime(state.trackDetails);
        state.maxTimeMicros = maxTime + twoMinuteInMicros;
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
      let trackIndex = 0;

      for (let index = 0; index < state.trackDetails.length; ++index) {
        for (const track of state.trackDetails[index]) {
          track.trackDetail.selected = true;
        }
        ++trackIndex;
      }
    },
    /// Selecting all tracks.
    deselectAllTracks(state) {
      let trackIndex = 0;

      for (let index = 0; index < state.trackDetails.length; ++index) {
        for (const track of state.trackDetails[index]) {
          track.trackDetail.selected = false;
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
      }
      audioManager.rescheduleAllTracks(state.trackDetails, slicesToReschedule);
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
      const {
        trackNumber,
        audioIndex,
        offsetInMicros,
        startOffsetInMicros,
        endOffsetInMicros
      } = action.payload;
      state.trackDetails[trackNumber][audioIndex].trackDetail.offsetInMicros = offsetInMicros;
      state.trackDetails[trackNumber][audioIndex].trackDetail.startOffsetInMicros = startOffsetInMicros;
      state.trackDetails[trackNumber][audioIndex].trackDetail.endOffsetInMicros = endOffsetInMicros;

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
      const {
        allTrackNumbers,
        allAudioIndexes,
        allOffsetsInMicros,
        allStartOffsetsInMicros,
        allEndOffsetsInMicros
      } = action.payload;

      if (
        allAudioIndexes.length !== allTrackNumbers.length ||
        allAudioIndexes.length !== allOffsetsInMicros.length ||
        allAudioIndexes.length !== allStartOffsetsInMicros.length ||
        allAudioIndexes.length !== allEndOffsetsInMicros.length
      ) {
        return;
      }

      for (let index = 0; index < allTrackNumbers.length; ++index) {
        const trackNumber = allTrackNumbers[index];
        const audioIndex = allAudioIndexes[index];
        const offsetInMicros = allOffsetsInMicros[index];
        const startOffsetInMicros = allStartOffsetsInMicros[index];
        const endOffsetInMicros = allEndOffsetsInMicros[index];

        state.trackDetails[trackNumber][audioIndex].trackDetail.offsetInMicros = offsetInMicros;
        state.trackDetails[trackNumber][audioIndex].trackDetail.startOffsetInMicros = startOffsetInMicros;
        state.trackDetails[trackNumber][audioIndex].trackDetail.endOffsetInMicros = endOffsetInMicros;
      }

      const maxTime = getMaxTime(state.trackDetails);
      state.maxTimeMicros = maxTime + twoMinuteInMicros;
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
  removeAudioFromAllTracks
} = trackDetailsSlice.actions;

export default trackDetailsSlice.reducer;
