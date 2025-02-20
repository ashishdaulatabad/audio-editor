import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AudioTransformation } from '../services/interfaces';

/**
 * To do: Keep track of all the changes done by the users.
 */
export interface AudioDetails {
  audioName: string,
  audioId: symbol,
  buffer: AudioBuffer | null,
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
    addAudio(state, action: PayloadAction<AudioDetails>) {
      state.contents.push(action.payload);
    },
    changeModifiedAudio(state, action: PayloadAction<{ buffer: AudioBuffer, audioId: symbol, transformation: AudioTransformation }>) {
      const { audioId, buffer, transformation } = action.payload;
      
      const index = state.contents.findIndex(data => data.audioId === audioId);
      if (index > -1) {
        state.contents[index].buffer = buffer;
        const value = state.contents[index].effects.indexOf(transformation);

        if (value > -1) {
          state.contents[index].effects.splice(value, 1);
        } else {
          state.contents[index].effects.push(transformation);
        }
      }
    }
  }
});

export const { addAudio, changeModifiedAudio } = audioSlice.actions;

export default audioSlice.reducer;
