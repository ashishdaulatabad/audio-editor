import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AudioNonScheduledDetails, AudioTrackDetails } from "./trackdetails";

export interface SelectedAudioTrack {
  value: AudioNonScheduledDetails
}

const initialState: SelectedAudioTrack = {
  value: {
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
  }
};

export const selectedAudioSlice = createSlice({
  name: 'selectAudioLibSlice',
  initialState: initialState,
  reducers: {
    selectAudio: function (state, action: PayloadAction<AudioNonScheduledDetails>) {
      state.value = action.payload;
    }
  }
});

export const { selectAudio } = selectedAudioSlice.actions;

export default selectedAudioSlice.reducer;
