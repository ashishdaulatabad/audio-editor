import {AudioDetails} from '@/app/state/audiostate';
import {SingletonStore} from '../singlestore';
import {deregisterAudioNode, registerAudioNode} from './noderegistry';
import {audioService} from '../audioservice';
import {Mixer} from '../mixer';

export type AudioBank = {
  [audioId: symbol]: {
    audioDetails: Omit<AudioDetails, 'audioId'>
    buffer: AudioBuffer
    panner: StereoPannerNode
    pannerRegister: symbol,
    gain: GainNode
    gainRegister: symbol
  }
};

export class AudioStore {
  audioBank: AudioBank = {};
  mixer: Mixer = SingletonStore.getInstance(Mixer);
  constructor() {}

  setPannerForAudio(audioId: symbol, pan: number) {
    const {panner} = this.audioBank[audioId];
    panner.pan.value = pan;
  }

  getPannerForAudio(audioId: symbol) {
    const {panner} = this.audioBank[audioId];
    return panner.pan.value;
  }

  setGainForAudio(audioId: symbol, value: number) {
    const {gain} = this.audioBank[audioId];
    gain.gain.value = value;
  }

  getGainForAudio(audioId: symbol) {
    const {gain} = this.audioBank[audioId];
    return gain.gain.value;
  }

  getGainParamForAudio(audioId: symbol) {
    const {gain} = this.audioBank[audioId];
    return gain;
  }

  /**
   * @description Store registered audio bank in an audio bank registry
   * - Stores registry with node registry list for undo/redo operation.
   * @param audioDetails details regarding the Audio
   * @param audioBuffer Audio Buffer
   * @returns A unique symbol that identifies this audio reference.
   */
  registerAudioInAudioBank(
    audioDetails: Omit<AudioDetails, 'audioId'>,
    audioBuffer: AudioBuffer
  ): symbol {
    const audioBankSymbol = Symbol();
    const context = audioService.useAudioContext();

    const gain = context.createGain();
    const panner = context.createStereoPanner();
    const gainRegister = registerAudioNode(gain);
    const pannerRegister = registerAudioNode(panner);

    this.audioBank[audioBankSymbol] = {
      audioDetails,
      buffer: audioBuffer,
      gainRegister,
      gain,
      pannerRegister,
      panner
    };

    return audioBankSymbol;
  }

  /**
   * @description Unregister Audio from Audio Buffer
   * @returns boolean value where audio buffer is successfully removed or not.
   */
  updateRegisteredAudioFromAudioBank(sym: symbol, updatedBuffer: AudioBuffer) {
    if (Object.hasOwn(this.audioBank, sym)) {
      this.audioBank[sym].buffer = updatedBuffer;
    }
  }

  /**
   * @description Unregister Audio from Audio Buffer
   * @returns boolean value where audio buffer is successfully removed or not.
   */
  unregisterAudioFromAudioBank(sym: symbol): boolean {
    if (Object.hasOwn(this.audioBank, sym)) {
      // Remove all the settings from the bank.
      const {gainRegister, pannerRegister} = this.audioBank[sym];

      deregisterAudioNode(gainRegister);
      deregisterAudioNode(pannerRegister);

      delete this.audioBank[sym];
      return true;
    }

    console.warn('Audio Bank not found');
    return false;
  }

  getAudioBuffer(symbol: symbol): AudioBuffer | null {
    if (Object.hasOwn(this.audioBank, symbol)) {
      return this.audioBank[symbol].buffer;
    }

    return null;
  }

  getMixerValue(symbol: symbol): number {
    return this.audioBank[symbol].audioDetails.mixerNumber;
  }


  setMixerValue(symbol: symbol, mixerValue: number) {
    this.audioBank[symbol].audioDetails.mixerNumber = mixerValue;
    this.audioBank[symbol].panner.disconnect();
    const newPanner = audioService.useAudioContext().createStereoPanner();
    this.mixer.useMixer().connectNodeToMixer(newPanner, mixerValue);
    this.audioBank[symbol].panner = newPanner;
  }
};

const audioStore = new AudioStore();
SingletonStore.setInstance(AudioStore, audioStore);
