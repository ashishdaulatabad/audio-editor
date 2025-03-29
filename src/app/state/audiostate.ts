import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AudioTransformation } from '../services/interfaces';

/**
 * To do: Keep track of all the changes done by the users.
 */
export interface AudioDetails {
  /**
   * @description Audio Name
   */
  audioName: string
  /**
   * @description Duration of audio
   */
  duration: number
  /**
   * @description Duration of audio
   */
  mixerNumber: number
  /**
   * @description Audio Identifier
   */
  audioId: symbol
  /**
   * @description Color annotation
   */
  colorAnnotation: string
  /**
   * @description Applied Effects of transformation
   */
  effects: AudioTransformation[]
}

export interface AudioContentState {
  contents: AudioDetails[]
}

const initialState: AudioContentState = {
  contents: []
}

const audioSlice = createSlice({
  name: 'audioLibSlice',
  initialState,
  reducers: {
    /**
     * @description Add audio to the audio list.
     * @param state current state
     * @param action Audio to perform
     */
    addAudio(state, action: PayloadAction<AudioDetails>) {
      state.contents.push(action.payload);
    },
    /**
     * @description Remove audio from the track
     * @param state current state
     * @param action index of the current audio track in the state.
     */
    removeAudio(state, action: PayloadAction<number>) {
      state.contents.splice(action.payload, 1);
    }
  }
});

export const {
  addAudio,
  removeAudio,
} = audioSlice.actions;

export default audioSlice.reducer;
