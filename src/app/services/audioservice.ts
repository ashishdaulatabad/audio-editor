export class GlobalAudioService {
  // @ts-expect-error Needs user interaction
  audioContext: AudioContext;
  paused = true;
  initialized = false;

  constructor() {}

  useAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.audioContext.suspend();
    }

    this.initialized = true;
    return this.audioContext;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  isInitialized() {
    return this.initialized;
  }

  isPaused() {
    return this.paused;
  }

  resume(): Promise<void> {
    this.paused = false;
    return this.useAudioContext().resume();
  }

  pause(): Promise<void> {
    this.paused = true;
    return this.useAudioContext().suspend();
  }
}

export const audioService = new GlobalAudioService();
