import { configureStore } from '@reduxjs/toolkit';
import audioReducer from './audiostate'; 
import selectedAudioSliceReducer from './selectedaudiostate';
import trackDetailsReducer from './trackdetails/trackdetails';
import windowStoreReducer from './windowstore';

export const store = configureStore({
  reducer: {
    audioReducer,
    selectedAudioSliceReducer,
    trackDetailsReducer,
    windowStoreReducer,
  },
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware({
      serializableCheck: false
    })
  } 
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch;
