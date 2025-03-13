import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AudioNonScheduledDetails } from './trackdetails';

/**
 * @description Stores currently selected audio track to schedule.
 */
export interface SelectedAudioTrack {
  value: AudioNonScheduledDetails
}

function getDefaultSelectedTrack(): AudioNonScheduledDetails {
  return {
    audioName: '',
    audioId: Symbol(),
    effects: [],
    duration: 0,
    mixerNumber: 0,
    colorAnnotation: '',
    trackDetail: {
      startOffsetInMicros: 0,
      endOffsetInMicros: 0,
      playbackRate: 1,
      selected: false
    }
  };
}

const initialState: SelectedAudioTrack = {
  value: getDefaultSelectedTrack()
};

export const selectedAudioSlice = createSlice({
  name: 'selectAudioLibSlice',
  initialState: initialState,
  reducers: {
    /**
     * @description Select current audio for scheduling in workspace. 
     * @param state current state.
     * @param action Action to set
     */
    selectAudio(state, action: PayloadAction<AudioNonScheduledDetails>) {
      state.value = action.payload;
    },
    /**
     * Reset to default, an empty audio.
     * @param state current state
     * @param _ void action
     */
    resetToDefault(state, _: PayloadAction<void>) {
      state.value = getDefaultSelectedTrack();
    }
  }
});

export const {
  selectAudio,
  resetToDefault
} = selectedAudioSlice.actions;

export default selectedAudioSlice.reducer;
