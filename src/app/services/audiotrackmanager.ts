import { TimeSectionSelection } from '../components/editor/seekbar';
import { AudioDetails } from '../state/audiostate';
import { AudioTrackDetails, SEC_TO_MICROSEC } from '../state/trackdetails';
import { clamp } from '../utils';
import { audioService } from './audioservice';
import { Maybe } from './interfaces';
import { Mixer } from './mixer';
import { addToAudioNodeRegistryList, deregisterFromAudioNodeRegistryList } from './noderegistry';

/**
 * @description Type of Multiselected DOM elements that are selected.
 */
export type SelectedAudioTrackDetails = AudioTrackDetails & {
  domElement: HTMLElement
  initialPosition: number
  initialWidth: number
  initialScrollLeft: number
}

export type TransformedAudioTrackDetails = SelectedAudioTrackDetails & {
  finalPosition: number
  finalScrollLeft: number
  finalWidth: number
}

export type SelectedTrackInfo = {
  trackNumbers: number[]
  audioIndexes: number[]
  scheduledKeys: symbol[]
}

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

export type ScheduleChangeDetails = {
  newTrack?: AudioTrackDetails
  newMixerValue?: number
}

type Idx<T, K extends string> = K extends keyof T ? T[K] : never;

export type SubType<T, K extends string> = T extends Object ? (
  K extends `${infer F}.${infer R}` ? SubType<Idx<T, F>, R> : Idx<T, K>
) : never;

/**
 * @description Schedule Node Information related to the tracks.
 */
export type ScheduledNodesInformation = {
  [k: symbol]: {
    audioId: symbol
    buffer: AudioBufferSourceNode
    details: SubType<AudioTrackDetails, 'trackDetail'>
  }
};

class AudioTrackManager {
  isInitialized = false;
  paused = true;
  scheduled = false;
  startTimestamp = 0;
  runningTimestamp = 0;
  loopEnd = 5;
  timeframeSelectionDetails: Maybe<TimeSectionSelection> = null;
  mixer: Mixer

  // Audio-specific nodes
  masterGainNode: GainNode | null = null 
  leftAnalyserNode: AnalyserNode | null = null;
  rightAnalyserNode: AnalyserNode | null = null;
  splitChannel: ChannelSplitterNode | null = null;
  audioBank: AudioBank = {};

  /// Store objects
  multiSelectedDOMElements: SelectedAudioTrackDetails[] = [];
  scheduledNodes: ScheduledNodesInformation = {};
  offlineScheduledNodes: ScheduledNodesInformation = {};

  audioCanvas: {
    [k: symbol]: OffscreenCanvas
  } = {};

  constructor(
    public totalTrackSize: number,
    public totalMixers: number
  ) {
    this.mixer = new Mixer(totalMixers);
  }

  initialize(context: BaseAudioContext): [GainNode[], StereoPannerNode[], GainNode] {
    const audioContext = context;
    const masterGainNode = audioContext.createGain();

    const gainNodes = Array.from({ length: this.totalTrackSize }, () => {
      const gainNode = audioContext.createGain();
      gainNode.connect(masterGainNode as GainNode);
      return gainNode;
    });

    const pannerNodes = Array.from({ length: this.totalTrackSize }, (_, index: number) => {
      const pannerNode = audioContext.createStereoPanner()
      pannerNode.connect(gainNodes[index]);
      return pannerNode;
    });

    return [gainNodes, pannerNodes, masterGainNode];
  }

  setPannerForAudio(audioId: symbol, pan: number) {
    const { panner } = this.audioBank[audioId];
    panner.pan.value = pan;
  }

  getPannerForAudio(audioId: symbol) {
    const { panner } = this.audioBank[audioId];
    return panner.pan.value;
  }

  setGainForAudio(audioId: symbol, value: number) {
    const { gain } = this.audioBank[audioId];
    gain.gain.value = value;
  }

  getGainForAudio(audioId: symbol) {
    const { gain } = this.audioBank[audioId];
    return gain.gain.value;
  }

  /**
   * @description Simulates all the connections into offline.
   * @param scheduledTracks all the scheduled tracks currently done.
   * @returns rendered raw audio data.
   */
  async simulateIntoOfflineAudio(scheduledTracks: AudioTrackDetails[][]) {
    const channels = 2;
    const bufferLength = Math.ceil(48000 * this.loopEnd);
    const sampleRate = 48000;

    const offlineAudioContext = new OfflineAudioContext(channels, bufferLength, sampleRate);
    const [gainNodes, pannerNodes, masterGainNode] = this.initialize(offlineAudioContext);

    masterGainNode.connect(offlineAudioContext.destination);

    this.scheduleOffline(
      scheduledTracks,
      pannerNodes,
      offlineAudioContext
    );

    const data = await offlineAudioContext.startRendering();
    return data;
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
    const gainRegister = addToAudioNodeRegistryList(gain);
    const pannerRegister = addToAudioNodeRegistryList(panner);

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
      const {
        gainRegister,
        pannerRegister
      } = this.audioBank[sym];

      deregisterFromAudioNodeRegistryList(gainRegister);
      deregisterFromAudioNodeRegistryList(pannerRegister);

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

  clearSelection() {
    this.multiSelectedDOMElements = [];
  }

  /**
   * @description Check if at least one of the DOM elements is multi-selected
   */
  isMultiSelected() {
    return this.multiSelectedDOMElements.length > 0;
  }

  /**
   * @description Set element as Multi-selected.
   * @param track Track to add into selected elements
   * @param domElement DOM element associated with the selection
   * @returns void
   */
  addIntoSelectedAudioTracks(
    track: AudioTrackDetails,
    domElement: HTMLElement
  ) {
    const existingElementIndex = this.multiSelectedDOMElements.findIndex(element => (
      element.trackDetail.scheduledKey === track.trackDetail.scheduledKey
    ));

    if (existingElementIndex === -1) {
      this.multiSelectedDOMElements.push({
        ...track,
        domElement,
        initialPosition: domElement.offsetLeft,
        initialWidth: domElement.offsetWidth,
        initialScrollLeft: domElement.scrollLeft,
      });
    } else {
      this.multiSelectedDOMElements[existingElementIndex].domElement = domElement;
      this.multiSelectedDOMElements[existingElementIndex].initialPosition = domElement.offsetLeft;
      this.multiSelectedDOMElements[existingElementIndex].initialWidth = domElement.offsetWidth;
      this.multiSelectedDOMElements[existingElementIndex].initialScrollLeft = domElement.scrollLeft;
    }
  }

  /**
   * @description Set element as Multi-selected.
   * @param track Track to add into selected elements
   * @param domElement DOM element associated with the selection
   * @returns void
   */
  deleteFromSelectedAudioTracks(
    scheduledTrackId: symbol,
  ) {
    const existingElementIndex = this.multiSelectedDOMElements.findIndex(element => (
      element.trackDetail.scheduledKey === scheduledTrackId
    ));

    if (existingElementIndex > -1) {
      this.multiSelectedDOMElements.splice(existingElementIndex, 1);
    }
  }

  /**
   * @description Cleanup Selection: Remove elements not attached to DOM element
   */
  cleanupSelectedDOMElements() {
    this.multiSelectedDOMElements = this.multiSelectedDOMElements.filter(dom => (
      dom.domElement.isConnected
    ));
  }

  /**
   * @description Set element as Multi-selected.
   * @param track Track to add into selected elements
   * @param domElement DOM element associated with the selection
   * @returns void
   */
  deleteAudioFromSelectedAudioTracks(
    audioId: symbol,
  ) {
    this.multiSelectedDOMElements = this.multiSelectedDOMElements.filter(element => (
      element.audioId === audioId
    ));
  }

  /**
   * Apply move transformation to these selected DOM elements
   * 
   * @param diffX Move track by `diffX` from `initialPosition`
   * @returns void
   */
  applyTransformationToMultipleSelectedTracks(diffX: number) {
    let diffOffsetToNegate = 0;

    for (const selectedTrack of this.multiSelectedDOMElements) {
      const newLeft = selectedTrack.initialPosition + diffX;

      if (newLeft < 0) {
        diffOffsetToNegate = Math.max(diffOffsetToNegate, -newLeft);
      }
    }

    for (const selectedTrack of this.multiSelectedDOMElements) {
      const initPosition = selectedTrack.initialPosition;
      selectedTrack.domElement.style.left = (initPosition + diffX + diffOffsetToNegate) + 'px'
    }
  }

  /**
   * @description Apply move transformation to these selected DOM elements
   * @param diffX Move track by `diffX` from `initialPosition`
   * @returns void
   */
  applyResizingStartToMultipleSelectedTracks(diffX: number) {
    // Making sure one of the width does not move to zero
    let minShrinkValue = 0;
    let minShrinkSet = false;
    // Making sure one of the width does not exceed while expanding inward.
    let minExpandValue = 0
    let minExpandSet = false;

    // Rewriting this loop.
    for (const selectedTrack of this.multiSelectedDOMElements) {
      const trackWidth = selectedTrack.initialWidth;
      const trackScrollLeft = selectedTrack.initialScrollLeft;
      const trackPosition = selectedTrack.initialPosition;

      if (!minShrinkSet) {
        minShrinkValue = trackWidth;
        minShrinkSet = true;
      } else if (minShrinkValue > trackWidth) {
        minShrinkValue = trackWidth;
      }

      if (!minExpandSet) {
        minExpandValue = Math.min(trackPosition, trackScrollLeft);
        minExpandSet = true;
      } else if (minExpandValue > trackScrollLeft) {
        minExpandValue = Math.min(trackScrollLeft, trackPosition);
      }
    }

    for (const selectedTrack of this.multiSelectedDOMElements) {
      const initPosition = selectedTrack.initialPosition;
      const initScrollLeft = selectedTrack.initialScrollLeft;
      const initWidth = selectedTrack.initialWidth;

      Object.assign(
        selectedTrack.domElement.style,
        {
          width: clamp(
            initWidth - diffX,
            initWidth - minShrinkValue,
            initWidth + minExpandValue,
          ) + 'px',
          left: clamp(
            initPosition + diffX,
            initPosition - minExpandValue,
            initPosition + minShrinkValue,
          ) + 'px'
        }
      );

      selectedTrack.domElement.scrollLeft = clamp(
        initScrollLeft + diffX,
        initScrollLeft - minExpandValue,
        initScrollLeft + minShrinkValue,
      );
    }
  }

  /**
   * @description Apply move transformation to these selected DOM elements
   * @param diffX Move track by `diffX` from `initialPosition`
   * @returns void
   */
  applyResizingEndToMultipleSelectedTracks(diffX: number) {
    let minExpandValue = 0
    let minExpandSet = false;

    let minShrinkValue = 0
    let minShrinkSet = false;

    // Rewriting this loop.
    for (const selectedTrack of this.multiSelectedDOMElements) {
      const trackWidth = selectedTrack.initialWidth;
      const trackScrollLeft = selectedTrack.initialScrollLeft;
      const totalWidth = selectedTrack.domElement.scrollWidth;

      const expandableDist = totalWidth - 2 * trackScrollLeft - trackWidth;

      if (!minExpandSet) {
        minExpandValue = expandableDist;
        minExpandSet = true;
      } else if (minExpandValue > expandableDist) {
        minExpandValue = expandableDist;
      }

      if (!minShrinkSet) {
        minShrinkValue = trackWidth;
        minShrinkSet = true;
      } else if (minShrinkValue > trackWidth) {
        minShrinkValue = trackWidth;
      }
    }

    for (const selectedTrack of this.multiSelectedDOMElements) {
      const initWidth = selectedTrack.initialWidth;

      selectedTrack.domElement.style.width = clamp(
        initWidth + diffX,
        initWidth - minShrinkValue,
        initWidth + minExpandValue,
      ) + 'px'
    }
  }

  /**
   * @description Retrieves all the positions of the current tracks.
   * @returns 
   */
  getMultiSelectedTrackInformation(): SelectedTrackInfo {
    const newElements: SelectedTrackInfo = {
      trackNumbers: [],
      audioIndexes: [],
      scheduledKeys: []
    };
    
    this.multiSelectedDOMElements.forEach(element => {
      const trackNumber = parseInt(element.domElement.getAttribute('data-trackid') as string);
      const audioIndex = parseInt(element.domElement.getAttribute('data-audioid') as string);

      newElements.trackNumbers.push(trackNumber);
      newElements.audioIndexes.push(audioIndex);
      newElements.scheduledKeys.push(element.trackDetail.scheduledKey);
    });

    return newElements;
  }

  /**
   * @description Retrieves all the positions of the current tracks.
   * @returns 
   */
  getNewPositionForMultipleSelectedTracks(): TransformedAudioTrackDetails[] {
    const newElements: TransformedAudioTrackDetails[] = [];
    
    this.multiSelectedDOMElements.forEach(element => {
      const scrollLeft = element.domElement.scrollLeft;
      const width = element.domElement.offsetWidth;
      const finalPosition = element.domElement.offsetLeft;

      newElements.push({
        ...element,
        finalPosition,
        finalScrollLeft: scrollLeft,
        finalWidth: width
      });

      /// Probably make a separate method to 
      /// set all from initial to final values.
      element.initialPosition = finalPosition;
      element.initialScrollLeft = scrollLeft;
      element.initialWidth = width;
    });

    return newElements;
  }

  selectTimeframe(timeSelection: Maybe<TimeSectionSelection>) {
    // To do: Make 500000 global variable??
    if (timeSelection) {
      if (timeSelection.endTimeMicros - timeSelection.startTimeMicros < 500000) return;
    }

    this.timeframeSelectionDetails = timeSelection;
  }

  /**
   * @description Safety function to initialize audiocontext before using audiomanager
   * @returns Self; the Audio Manager.
   */
  useManager() {
    if (!this.isInitialized) {
      const context = audioService.useAudioContext();
      this.mixer.useMixer();
      this.isInitialized = true;

      this.leftAnalyserNode = context.createAnalyser();
      this.rightAnalyserNode = context.createAnalyser();

      this.splitChannel = context.createChannelSplitter(2);
      this.mixer.masterGainNode?.connect(context.destination);
      this.mixer.masterGainNode?.connect(this.splitChannel);

      this.splitChannel.connect(this.leftAnalyserNode, 0);
      this.splitChannel.connect(this.rightAnalyserNode, 1);

      // this.leftAnalyserNode.fftSize = 512;
      // this.rightAnalyserNode.fftSize = 512;
      // this.leftAnalyserNode.smoothingTimeConstant = 0.4;
      // this.rightAnalyserNode.smoothingTimeConstant = 0.4;
    }

    return this;
  }

  setLoopEnd(valueMicros: number) {
    this.loopEnd = Math.max(5, valueMicros / SEC_TO_MICROSEC);
  }

  setGainNodeForMaster(vol: number) {
    this.masterGainNode?.gain.setValueAtTime(vol, 0);
  }

  setGainNodeForMixer(mixer: number, vol: number) {
    this.mixer.useMixer().setGainValue(mixer, vol);
  }

  setPannerNodeForMixer(mixer: number, pan: number) {
    this.mixer.useMixer().setPanValue(mixer, pan);
  }

  storeOffscreenCanvasDrawn(audioSymbolKey: symbol, canvas: OffscreenCanvas) {
    this.audioCanvas[audioSymbolKey] = canvas;
  }

  removeOffscreenCanvas(audioSymbolKey: symbol) {
    delete this.audioCanvas[audioSymbolKey];
  }

  getOffscreenCanvasDrawn(audioKey: symbol) {
    return this.audioCanvas[audioKey];
  }

  /**
   * @description Schedule all audio tracks
   * @param audioTrackDetails 2D array containing all tracks.
   */
  schedule(audioTrackDetails: AudioTrackDetails[][]) {
    for (const trackContents of audioTrackDetails) {
      for (const track of trackContents) {
        this._scheduleInternal(track.audioId, track.trackDetail);
      }
    }
  }

  scheduleOffline(
    audioTrackDetails: AudioTrackDetails[][],
    pannerNodes: StereoPannerNode[],
    context: BaseAudioContext
  ) {
    let trackIndex = 0;
    // const context = audioService.useAudioContext();
    // const currentTime = context.currentTime;
    for (const trackContents of audioTrackDetails) {
      for (const track of trackContents) {
        this._scheduleOffline(
          track,
          track.trackDetail.offsetInMicros,
          context,
          pannerNodes[trackIndex]
        );
      }
      ++trackIndex;
    }
  }

  removeTrackFromScheduledNodes(track: AudioTrackDetails) {
    const symbolKey = track.trackDetail.scheduledKey;

    if (Object.hasOwn(this.scheduledNodes, symbolKey)) {
      this.scheduledNodes[symbolKey].buffer.stop(0);
      this.scheduledNodes[symbolKey].buffer.disconnect();
      this.multiSelectedDOMElements = this.multiSelectedDOMElements.filter((element) => (
        element.trackDetail.scheduledKey !== symbolKey
      ));
      delete this.scheduledNodes[symbolKey];
    }
  }

  removeScheduledTracksFromScheduledKeys(scheduledKeys: symbol[]) {
    for (const key of scheduledKeys) {
      const node = this.scheduledNodes[key]

      if (node) {
        node.buffer.stop(0);
        delete this.scheduledNodes[key];
      }
    }
  }

  removeScheduledAudioInstancesFromScheduledNodes(id: symbol) {
    const allKeys = Object.getOwnPropertySymbols(this.scheduledNodes);

    for (const key of allKeys) {
      const node = this.scheduledNodes[key];

      if (node.audioId === id) {
        node.buffer.stop(0);
        node.buffer.disconnect();
        delete this.scheduledNodes[key];
      }
    }
  }

  scheduleSingleTrack(
    audioId: symbol,
    trackDetails: SubType<AudioTrackDetails, 'trackDetail'>
  ) {
    this._scheduleInternal(audioId, trackDetails);
  }

  private _scheduleOffline(
    track: AudioTrackDetails,
    trackOffsetMicros: number,
    context: BaseAudioContext,
    pannerNodes: StereoPannerNode
  ) {
    const seekbarOffsetInMicros = 0;
    const currentTime = context.currentTime;

    const {
      audioId,
      trackDetail: {
        scheduledKey
      }
    } = track;

    // Not scaled with playback rate.
    const startTime = track.trackDetail.startOffsetInMicros;
    // Not scaled with playback rate.
    const endTime = track.trackDetail.endOffsetInMicros;

    if (trackOffsetMicros + (endTime - startTime) < seekbarOffsetInMicros) {
      const key = track.trackDetail.scheduledKey;

      if (Object.hasOwn(this.scheduledNodes, key)) {
        this.scheduledNodes[key].buffer.stop();
        delete this.scheduledNodes[key];
      }
      return;
    }

    const startTimeSecs = startTime / SEC_TO_MICROSEC;
    const trackDurationSecs = endTime / SEC_TO_MICROSEC;
    const distance = (seekbarOffsetInMicros - trackOffsetMicros) / SEC_TO_MICROSEC;

    const bufferSource = context.createBufferSource();
    bufferSource.buffer = this.getAudioBuffer(audioId);
    bufferSource.connect(pannerNodes);

    const offsetStart = startTimeSecs + Math.max(distance, 0);

    bufferSource.start(
      currentTime + Math.max(-distance, 0), 
      offsetStart,
      trackDurationSecs - offsetStart
    );

    this.offlineScheduledNodes[scheduledKey] = {
      audioId,
      buffer: bufferSource,
      details: track.trackDetail
    };

    bufferSource.onended = () => {
      if (Object.hasOwn(this.offlineScheduledNodes, scheduledKey)) {
        const node = this.offlineScheduledNodes[scheduledKey];
        node.buffer.disconnect();
        delete this.offlineScheduledNodes[scheduledKey];
      }
    }
  }

  private _scheduleInternal(
    audioId: symbol,
    trackDetail: SubType<AudioTrackDetails, 'trackDetail'>,
  ) {
    const seekbarOffsetInMicros = this.runningTimestamp * SEC_TO_MICROSEC;
    const context = audioService.useAudioContext();
    const currentTime = context.currentTime;

    const {
      scheduledKey,
      startOffsetInMicros,
      endOffsetInMicros,
      offsetInMicros: trackOffsetMicros
    } = trackDetail;

    // Not scaled with playback rate.
    const startTime = startOffsetInMicros;
    // Not scaled with playback rate.
    const endTime = endOffsetInMicros;

    if (trackOffsetMicros + (endTime - startTime) < seekbarOffsetInMicros) {
      const key = scheduledKey;

      if (Object.hasOwn(this.scheduledNodes, key)) {
        this.scheduledNodes[key].buffer.stop();
        delete this.scheduledNodes[key];
      }
      return;
    }

    const startTimeSecs = startTime / SEC_TO_MICROSEC;
    const trackDurationSecs = endTime / SEC_TO_MICROSEC;
    const distance = (seekbarOffsetInMicros - trackOffsetMicros);
    const startFrom = ((currentTime * SEC_TO_MICROSEC) + Math.max(-distance, 0)) / SEC_TO_MICROSEC;
    
    const bufferSource = context.createBufferSource();
    bufferSource.buffer = this.getAudioBuffer(audioId);

    const {
      gain,
      panner,
      audioDetails: {
        mixerNumber
      }
    } = this.audioBank[audioId];

    const destination = bufferSource.connect(gain).connect(panner);
    this.mixer.useMixer().connectNodeToMixer(destination, mixerNumber);

    const offsetStart = startTimeSecs + (Math.max(distance, 0)) / SEC_TO_MICROSEC;

    bufferSource.start(
      startFrom, 
      offsetStart,
      trackDurationSecs - offsetStart
    );
    this.scheduledNodes[scheduledKey] = {
      audioId,
      buffer: bufferSource,
      details: trackDetail
    };

    bufferSource.onended = () => {};
  }

  /**
   * @description Reschedule audio tracks, with changed details to accomodate new changes.
   * @param audioTrackDetails All track details
   * @param movedAudioTracks Moved scheduled that contains additional information to override.
   */
  rescheduleAllTracks(
    audioTrackDetails: AudioTrackDetails[][],
    movedAudioTracks?: AudioTrackDetails[]
  ) {
    let trackNumber = 0;

    for (const track of audioTrackDetails) {
      for (const audio of track) {
        const symbolKey = audio.trackDetail.scheduledKey;

        if (Object.hasOwn(this.scheduledNodes, symbolKey)) {
          const audioTrackIndex = movedAudioTracks?.findIndex(value => value.trackDetail.scheduledKey === symbolKey);
          const node = this.scheduledNodes[symbolKey];

          const trackToSchedule = typeof audioTrackIndex === 'number' && audioTrackIndex > -1 ?
            (movedAudioTracks as AudioTrackDetails[])[audioTrackIndex] :
            audio;

          delete this.scheduledNodes[symbolKey];
          this._scheduleInternal(trackToSchedule.audioId, trackToSchedule.trackDetail);
          node.buffer.stop(0);
          node.buffer.disconnect();
        } else {
          this._scheduleInternal(audio.audioId, audio.trackDetail);
        }
      }
      ++trackNumber;
    } 
  }

  rescheduleAudioFromScheduledNodes(
    audioKey: symbol
  ) {
    for (const key of Object.getOwnPropertySymbols(this.scheduledNodes)) {
      const node = this.scheduledNodes[key];

      if (node.audioId === audioKey) {
        node.buffer.stop(0);
        node.buffer.disconnect();
        this._scheduleInternal(this.scheduledNodes[key].audioId, this.scheduledNodes[key].details);
      }
    }
  }

  rescheduleTrackFromScheduledNodes(
    scheduledKey: symbol,
    trackDetail: SubType<AudioTrackDetails, 'trackDetail'>
  ) {
    if (Object.hasOwn(this.scheduledNodes, scheduledKey)) {
      const node = this.scheduledNodes[scheduledKey];
      node.buffer.stop(0);
      node.buffer.disconnect();
      delete this.scheduledNodes[node.audioId];
      this._scheduleInternal(node.audioId, trackDetail);
    }
  }

  rescheduleMovedTrackFromScheduledNodes(
    audioId: symbol,
    trackDetail: SubType<AudioTrackDetails, 'trackDetail'>, 
    trackOffsetMicros: number
  ) {
    const symbolKey = trackDetail.scheduledKey;

    if (Object.hasOwn(this.scheduledNodes, symbolKey)) {
      const node = this.scheduledNodes[symbolKey];
      node.buffer.stop(0);
      node.buffer.disconnect();
      delete this.scheduledNodes[symbolKey];
      this._scheduleInternal(audioId, { ...trackDetail, offsetInMicros: trackOffsetMicros });
    }
  }

  /**
   * @description Removes all scheduled nodes that are running/pending.
   * @returns void
   */
  removeAllScheduledTracks() {
    for (const symbolKey of Object.getOwnPropertySymbols(this.scheduledNodes)) {
      this.scheduledNodes[symbolKey].buffer.stop(0);
      this.scheduledNodes[symbolKey].buffer.disconnect();
      delete this.scheduledNodes[symbolKey];
    }
  }

  isPaused() {
    return this.paused;
  }

  suspend() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  getTimeData(leftArray: Uint8Array, rightArray: Uint8Array) {
    const left = (this.leftAnalyserNode as AnalyserNode);
    const right = (this.rightAnalyserNode as AnalyserNode);

    left.getByteTimeDomainData(leftArray);
    right.getByteTimeDomainData(rightArray);
  }

  getTimeDataFromMixer(mixer: number, leftArray: Uint8Array, rightArray: Uint8Array) {
    const {
      left,
      right
    } = mixer > 0 ? 
      this.mixer.useMixer().analyserNodes[mixer - 1] :
      this.mixer.useMixer().masterAnalyserNodes as {
        left: AnalyserNode,
        right: AnalyserNode
      };

    left.getByteTimeDomainData(leftArray);
    right.getByteTimeDomainData(rightArray);
  }

  private _updateTimestampOnSelectedTimeframe() {
    const {
      startTimeMicros,
      endTimeMicros
    } = this.timeframeSelectionDetails as TimeSectionSelection;

    const startTimeSecs = startTimeMicros / SEC_TO_MICROSEC;
    const endTimeSecs = endTimeMicros / SEC_TO_MICROSEC;

    const context = audioService.useAudioContext();
    const time = context.currentTime;

    if (time - this.startTimestamp >= endTimeSecs) {
      const diffCorrection = time - this.startTimestamp - endTimeSecs;
      this.startTimestamp = time - startTimeSecs;
      this.runningTimestamp = time - this.startTimestamp + diffCorrection;
      return true;
    } else {
      this.runningTimestamp = time - this.startTimestamp;
      return false;
    }
  }

  /**
   * @description Update timestamp in seconds
   * @returns true if by updating timestamp, time goes out of bounds.
   */
  updateTimestamp(): boolean {
    const context = audioService.useAudioContext();
    const time = context.currentTime;

    if (this.timeframeSelectionDetails) {
      return this._updateTimestampOnSelectedTimeframe()
    }

    if (time - this.startTimestamp > this.loopEnd) {
      let diff = time - this.startTimestamp - this.loopEnd;

      if (diff > this.loopEnd) {
        const multiplier = Math.floor(Math.abs(diff) / this.loopEnd);
        diff = Math.abs(diff) - multiplier * this.loopEnd;
      }

      this.startTimestamp = time - diff;
      this.runningTimestamp = time - this.startTimestamp;
      return true;
    } else {
      this.runningTimestamp = time - this.startTimestamp;
      return false;
    }
  }

  private _setTimestampOnSelectedTimeframe(valueSecs: number) {
    const {
      startTimeMicros,
      endTimeMicros
    } = this.timeframeSelectionDetails as TimeSectionSelection;

    const startTimeSecs = startTimeMicros / SEC_TO_MICROSEC;
    const endTimeSecs = endTimeMicros / SEC_TO_MICROSEC;

    const context = audioService.useAudioContext();
    const time = context.currentTime;

    if (valueSecs > endTimeSecs) {
      this.startTimestamp = time - startTimeSecs;
      this.runningTimestamp = time - this.startTimestamp;
      return true;
    } else {
      this.startTimestamp = time - valueSecs;
      this.runningTimestamp = time - this.startTimestamp;
      return false;
    }
  }

  /**
   * @description Set timestamp in seconds
   * @returns true if by setting timestamp, time goes out of bounds.
   */
  setTimestamp(startValue: number) {
    const context = audioService.useAudioContext();
    const time = context.currentTime;

    if (this.timeframeSelectionDetails) {
      return this._setTimestampOnSelectedTimeframe(startValue);
    }

    if (startValue > this.loopEnd) {
      let diff = this.loopEnd - startValue;

      if (diff < 0 || diff > this.loopEnd) {
        const multiplier = Math.floor(Math.abs(diff) / this.loopEnd);
        diff = Math.abs(diff) - multiplier * this.loopEnd;
      }

      this.startTimestamp = time - diff;
      this.runningTimestamp = time - this.startTimestamp;
      return true;
    } else {
      this.startTimestamp = time - startValue;
      this.runningTimestamp = time - this.startTimestamp;
      return false;
    }
  }

  /**
   * @description Get timestamp in seconds
   * @returns number
   */
  getTimestamp() {
    return this.runningTimestamp;
  }
}

export const audioManager = new AudioTrackManager(30, 30);
