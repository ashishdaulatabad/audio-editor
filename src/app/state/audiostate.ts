import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AudioTransformation } from '../services/interfaces';

/**
 * To do: Keep track of all the changes done by the users.
 */
export interface AudioDetails {
  /**
   * Audio Name
   */
  audioName: string
  /**
   * Audio Identifier
   */
  audioId: symbol
  /**
   * Color depiction
   */
  colorAnnotation: string,
  /**
   * Raw Buffer
   */
  buffer: AudioBuffer
  /**
   * Transformed buffer
   */
  transformedBuffer: AudioBuffer
  /**
   * Applied Effects of transformation
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
     * Add audio to the audio list.
     * 
     * @param state current state
     * @param action Audio to perform
     */
    addAudio(state, action: PayloadAction<AudioDetails>) {
      state.contents.push(action.payload);
    },
    /**
     * Remove audio from the track
     * 
     * @param state current state
     * @param action index of the current audio track in the state.
     */
    removeAudio(state, action: PayloadAction<number>) {
      state.contents.splice(action.payload, 1);
    },
    /**
     * Add transformed audio 
     * 
     * @param state 
     * @param action 
     */
    applyTransformationToAudio(state, action: PayloadAction<{ buffer: AudioBuffer, audioId: symbol, transformation: AudioTransformation }>) {
      const { audioId, buffer, transformation } = action.payload;
      
      const index = state.contents.findIndex(data => data.audioId === audioId);
      if (index > -1) {
        state.contents[index].transformedBuffer = buffer;
        const value = state.contents[index].effects.indexOf(transformation);

        if (value > -1) {
          state.contents[index].effects.splice(value, 1);
        } else {
          state.contents[index].effects.push(transformation);
        }
      }
    },
    /**
     * Restore Original Audio
     * 
     * @param state original state
     * @param action index of current track
     */
    restoreAudioFromAudioId(state, action: PayloadAction<symbol>) {
      const index = state.contents.findIndex(({ audioId }) => audioId === action.payload);

      if (index > -1) {
        state.contents[index].transformedBuffer = state.contents[index].buffer;
        state.contents[index].effects = [];
      }
    }
  }
});

export const {
  addAudio,
  applyTransformationToAudio,
  removeAudio,
  restoreAudioFromAudioId
} = audioSlice.actions;

export default audioSlice.reducer;
