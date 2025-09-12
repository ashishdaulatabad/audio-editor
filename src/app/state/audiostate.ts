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
  audioBankList: AudioDetails[]
}

const initialState: AudioContentState = {
  audioBankList: []
}

const audioSlice = createSlice({
  name: 'audioLibSlice',
  initialState,
  reducers: {
    addIntoAudioBank(state, action: PayloadAction<AudioDetails>) {
      state.audioBankList.push(action.payload);
    },
    removeAudioFromBank(state, action: PayloadAction<number>) {
      state.audioBankList.splice(action.payload, 1);
    }
  }
});

export const {addIntoAudioBank, removeAudioFromBank} = audioSlice.actions;

export default audioSlice.reducer;
