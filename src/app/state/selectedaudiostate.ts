import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AudioNonScheduledDetails, AudioTrackDetails } from "./trackdetails";

export interface SelectedAudioTrack {
  value: AudioNonScheduledDetails
}

export function getDefaultSelectedTrack() {
  return {
    audioName: '',
    audioId: Symbol(),
    buffer: null,
    effects: [],
    colorAnnotation: '',
    trackDetail: {
      startOffsetInMillis: 0,
      endOffsetInMillis: 0,
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
    selectAudio: function (state, action: PayloadAction<AudioNonScheduledDetails>) {
      state.value = action.payload;
    },
    resetToDefault(state, action: PayloadAction<void>) {
      state.value = getDefaultSelectedTrack();
    }
  }
});

export const {
  selectAudio,
  resetToDefault
} = selectedAudioSlice.actions;

export default selectedAudioSlice.reducer;
