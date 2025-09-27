import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {AudioDetails} from '../audiostate';
import {audioService} from '@/app/services/audioservice';
import {audioManager} from '@/app/services/audio/audiotrackmanager';
import {RegionSelection} from '@/app/components/editor/regionselect';
import {SlicerSelection} from '@/app/components/editor/slicer';
import {AudioTransformation} from '@/app/services/interfaces';
import {TimeSectionSelection} from '@/app/components/editor/seekbar';
import {animationBatcher} from '@/app/services/animationbatch';
import {cloneValues} from '@/app/services/audio/noderegistry';
import {
  ChangeDetails,
  changeHistory,
  createSnapshot,
  WorkspaceChange
} from '@/app/services/changehistory';
import {TimeframeMode} from '@/app/components/player/player';
import {getRandomTrackId, randomColor} from '@/app/services/random';
import {
  AudioTrackChangeDetails,
  HistoryAction,
  undoSnapshotChange
} from './tracksnapshots';
import {ScheduledTrackAutomation} from './trackautomation';
import {getMaxTimeOverall} from './trackutils';
import {
  addNewAudioToTrack,
  bulkDeleteTracks,
  cloneMultipleAudioTracks,
  cloneSingleAudioTrack,
  deleteSingleAudioTrack,
  markSelectionForAllAudioTracks,
  removeAudioFromAllScheduledTrack,
  setMultipleOffsets,
  setTrackOffsetToAFinalPoint,
  sliceAudioTracksAtPoint
} from './audiotracks';

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

export type ScheduledAudioTrack = AudioDetails & {
  trackDetail: ScheduledInformation & TrackInformation
}

export type AudioTrackDetails = ScheduledAudioTrack;

/// Setting extra time buffer to 2 minutes.
const initialState: {
  status: Status
  maxTimeMicros: number
  timeframeMode: TimeframeMode
  timePerUnitLineInSeconds: number
  trackDetails: AudioTrackDetails[][]
  trackAutomation: ScheduledTrackAutomation[][]
  trackUniqueIds: Array<number>
} = {
  status: Status.Pause,
  maxTimeMicros: twoMinuteInMicros,
  timeframeMode: TimeframeMode.Time,
  timePerUnitLineInSeconds: 5,
  trackDetails: Array.from({length: 30}, () => []),
  trackAutomation: Array.from({length: 30}, () => []),
  trackUniqueIds: new Array<number>(),
};

function isWithinRegionAndNotSelected(
  track: AudioTrackDetails,
  pointStartSec: number,
  pointEndSec: number
): boolean {
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

  changeHistory.storeChanges(
    initialState,
    cloneValues(finalState),
    WorkspaceChange.TrackChanges
  );

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
    createAutomation(state, action: PayloadAction<{
      aParam: AudioParam,
      aParamDesc: string
    }>) {
      // TODO: Decide in which track does this automation goes.
      const {aParam, aParamDesc} = action.payload;
      const trackNumber = 0;
      // const annotationColor = ;
      // First we need to get the first and last point of this current track.
      const automation: ScheduledTrackAutomation = {
        nodeId: Symbol(),
        aParam,
        points: [{time: 0, value: 1}, {time: 20, value: 1}],
        colorAnnotation: randomColor(),
        offsetMicros: 0,
        startOffsetMicros: 0,
        endOffsetMicros: 20 * SEC_TO_MICROSEC,
        selected: false,
        automationKey: aParamDesc
      };

      state.trackAutomation[trackNumber].push(automation);
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
      state.trackDetails = processTrackHistory(
        state.trackDetails, 
        action.payload,
        deleteSingleAudioTrack
      );

      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);

      // Now find the next longest track among all the tracks exists with offset
      const maxTime = getMaxTimeOverall(state.trackDetails, state.trackAutomation);

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
            track.trackDetail.selected = isWithinRegionAndNotSelected(
              track,
              pointStartSec,
              pointEndSec
            );
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
      state.trackDetails = processTrackHistory(
        state.trackDetails,
        action.payload,
        cloneMultipleAudioTracks
      );
      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);
    },
    deleteMultipleAudioTrack(
      state,
      action: PayloadAction<{
        trackNumbers: number[],
        audioIndexes: number[]
      }>
    ) {
      state.trackDetails = processTrackHistory(
        state.trackDetails,
        action.payload,
        bulkDeleteTracks
      );
      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);
  
      const maxTime = getMaxTimeOverall(state.trackDetails, state.trackAutomation);
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
      state.trackDetails = processTrackHistory(
        state.trackDetails,
        action.payload,
        cloneSingleAudioTrack
      );
      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);
    },

    sliceAudioTracks(state, action: PayloadAction<SlicerSelection>) {
      state.trackDetails = processTrackHistory(
        state.trackDetails,
        action.payload,
        sliceAudioTracksAtPoint
      );
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
      state.trackDetails = processTrackHistory(
        state.trackDetails,
        action.payload,
        setTrackOffsetToAFinalPoint
      );
      const {
        trackNumber,
        audioIndex,
        offsetInMicros
      } = action.payload;

      const trackDetails = state.trackDetails[trackNumber][audioIndex];
      const currentTime = state.maxTimeMicros - twoMinuteInMicros;

      // Should always exist in milliseconds
      const startTimeOfTrack = trackDetails.trackDetail.startOffsetInMicros ?? 0;
      const endTimeOfTrack = trackDetails.trackDetail.endOffsetInMicros ?? 
        ((trackDetails.duration as number) * SEC_TO_MICROSEC);
      const trackTotalTime = endTimeOfTrack - startTimeOfTrack;

      const endTime = offsetInMicros + trackTotalTime;

      if (currentTime < endTime) {
        state.maxTimeMicros = endTime + twoMinuteInMicros;
        audioManager.setLoopEnd(endTime);
      } else {
        const maxTime = getMaxTimeOverall(state.trackDetails, state.trackAutomation);
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
      state.trackDetails = processTrackHistory(state.trackDetails, action.payload, setMultipleOffsets);

      const maxTime = getMaxTimeOverall(state.trackDetails, state.trackAutomation);
      state.maxTimeMicros = maxTime + twoMinuteInMicros;
      audioManager.setLoopEnd(maxTime);
    },
    /// Remove all the tracks related to this audio ID.
    removeAudioFromAllTracks(state, action: PayloadAction<{
      audioId: symbol,
      noSnapshot: true
    }>){
      const {audioId, noSnapshot} = action.payload;

      state.trackDetails = !noSnapshot ?
        processTrackHistory(state.trackDetails, audioId, removeAudioFromAllScheduledTrack) :
        removeAudioFromAllScheduledTrack(state.trackDetails, audioId);

      state.trackUniqueIds = syncAllIds(state.trackDetails, state.trackUniqueIds);

      const maxTime = getMaxTimeOverall(state.trackDetails, state.trackAutomation);
      state.maxTimeMicros = maxTime + twoMinuteInMicros;
      audioManager.setLoopEnd(maxTime);
    },

    rollbackChanges(state, action: PayloadAction<{
      updatedChanges: ChangeDetails<AudioTrackChangeDetails>[],
      action: HistoryAction
    }>) {
      const {updatedChanges, action: act} = action.payload;

      undoSnapshotChange(state.trackDetails, updatedChanges, act);
      state.trackUniqueIds = syncAllIds(
        state.trackDetails,
        state.trackUniqueIds
      );

      const maxTime = getMaxTimeOverall(
        state.trackDetails,
        state.trackAutomation
      );
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
  createAutomation,
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
