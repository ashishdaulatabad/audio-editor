import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AudioNonScheduledDetails } from '@/app/state/trackdetails/trackdetails';

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
    selectAudio(state, action: PayloadAction<AudioNonScheduledDetails>) {
      state.value = action.payload;
    },
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
