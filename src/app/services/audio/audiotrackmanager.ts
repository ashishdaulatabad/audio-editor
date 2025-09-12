import { TimeSectionSelection } from '@/app/components/editor/seekbar';
import { AudioDetails } from '@/app/state/audiostate';
import { audioService } from '@/app/services/audioservice';
import { Maybe } from '@/app/services/interfaces';
import { Mixer } from '@/app/services/mixer';
import {
  registerAudioNode,
  deregisterAudioNode,
  getAudioNode
} from '@/app/services/audio/noderegistry';
import {
  AudioTrackDetails,
  SEC_TO_MICROSEC
} from '@/app/state/trackdetails/trackdetails';
import { MultiSelectTracker, SelectedTrackInfo, TransformedAudioTrackDetails } from './multiselect';
import { ScheduledTrackAutomation } from '@/app/state/trackdetails/trackautomation';

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

const REGION_SELECT_TIMELIMIT_MICROSEC = 100000;
const DEFAULT_MIN_TIME_LOOP_SEC = 5;
const DEFAULT_SAMPLE_RATE = 48000;
const DEFAULT_CHANNELS = 2;

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

type ScheduledAutomation = {
  [k: symbol]: ScheduledTrackAutomation
}

class AudioTrackManager {
  isInitialized = false;
  paused = true;
  scheduled = false;
  startTimestamp = 0;
  runningTimestamp = 0;
  loopEnd = DEFAULT_MIN_TIME_LOOP_SEC;
  timeframeSelectionDetails: Maybe<TimeSectionSelection> = null;
  mixer: Mixer

  // Audio-specific nodes
  masterGainNode: GainNode | null = null 
  leftAnalyserNode: AnalyserNode | null = null;
  rightAnalyserNode: AnalyserNode | null = null;
  splitChannel: ChannelSplitterNode | null = null;
  audioBank: AudioBank = {};

  /// Store objects
  scheduledNodes: ScheduledNodesInformation = {};
  scheduledAutomation: ScheduledAutomation = {}
  offlineScheduledNodes: ScheduledNodesInformation = {};

  // Classes
  private multiSelectTracker: MultiSelectTracker;

  audioCanvas: {
    [k: symbol]: OffscreenCanvas
  } = {};

  constructor(
    public totalTrackSize: number,
    public totalMixers: number
  ) {
    this.multiSelectTracker = new MultiSelectTracker();
    this.mixer = new Mixer(totalMixers);
  }

  initialize(context: BaseAudioContext): [GainNode[], StereoPannerNode[], GainNode] {
    const audioContext = context;
    const masterGainNode = audioContext.createGain();

    const gainNodes = Array.from(
      { length: this.totalTrackSize }, 
      () => {
        const gainNode = audioContext.createGain();
        gainNode.connect(masterGainNode as GainNode);
        return gainNode;
      });

    const pannerNodes = Array.from(
      { length: this.totalTrackSize }, 
      (_, index: number) => {
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
   * TODO: Allow user to specify the sample rate, and channels.
   * @param scheduledTracks all the scheduled tracks currently done.
   * @returns rendered raw audio data.
   */
  async simulateIntoOfflineAudio(scheduledTracks: AudioTrackDetails[][]) {
    const channels = DEFAULT_CHANNELS;
    const bufferLength = Math.ceil(DEFAULT_SAMPLE_RATE * this.loopEnd);
    const sampleRate = DEFAULT_SAMPLE_RATE;

    const offlineAudioContext = new OfflineAudioContext(
      channels,
      bufferLength,
      sampleRate
    );
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

  clearSelection() {
    this.multiSelectTracker.clearSelection();
  }

  isMultiSelected() {
    return this.multiSelectTracker.isMultiSelected();
  }

  addIntoSelectedAudioTracks(
    track: AudioTrackDetails,
    domElement: HTMLElement
  ) {
    this.multiSelectTracker.addIntoSelectedAudioTracks(track, domElement);
  }

  deleteFromSelectedAudioTracks(scheduledTrackId: symbol) {
    this.multiSelectTracker.deleteFromSelectedAudioTracks(scheduledTrackId);
  }

  cleanupSelectedDOMElements() {
    this.multiSelectTracker.cleanupSelectedDOMElements();
  }

  deleteAudioFromSelectedAudioTracks(audioId: symbol) {
    this.multiSelectTracker.deleteAudioFromSelectedAudioTracks(audioId);
  }

  applyTransformationToMultipleSelectedTracks(diffX: number) {
    this.multiSelectTracker.applyTransformationToMultipleSelectedTracks(diffX);
  }

  applyResizingStartToMultipleSelectedTracks(diffX: number) {
    this.multiSelectTracker.applyResizingStartToMultipleSelectedTracks(diffX);
  }

  applyResizingEndToMultipleSelectedTracks(diffX: number) {
    this.multiSelectTracker.applyResizingEndToMultipleSelectedTracks(diffX);
  }

  getMultiSelectedTrackInformation(): SelectedTrackInfo {
    return this.multiSelectTracker.getMultiSelectedTrackInformation();
  }

  getNewPositionForMultipleSelectedTracks(): TransformedAudioTrackDetails[] {
    return this.multiSelectTracker.getNewPositionForMultipleSelectedTracks();
  }

  selectTimeframe(timeSelection: Maybe<TimeSectionSelection>) {
    if (timeSelection) {
      const {endTimeMicros, startTimeMicros} = timeSelection;
      
      if (endTimeMicros - startTimeMicros < REGION_SELECT_TIMELIMIT_MICROSEC) {
        return
      };
    }

    this.timeframeSelectionDetails = timeSelection;
  }

  /**
   * @description Safety function to initialize audiocontext before using 
   * audiomanager
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

  cleanupAudioData(audioId: symbol) {
    this.removeScheduledAudioInstancesFromScheduledNodes(audioId);
    this.deleteAudioFromSelectedAudioTracks(audioId);
    this.removeOffscreenCanvas(audioId);
    this.unregisterAudioFromAudioBank(audioId);
  }

  // TODO: When moved to Tempo, allow dynamic min loop end time.
  setLoopEnd(valueMicros: number) {
    this.loopEnd = Math.max(
      DEFAULT_MIN_TIME_LOOP_SEC, 
      valueMicros / SEC_TO_MICROSEC
    );
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

  scheduleAutomation(trackAutomationDetails: ScheduledTrackAutomation[][]) {
    for (const automations of trackAutomationDetails) {
      for (const automation of automations) {
        this._scheduleAutomationInternal(automation);
      }
    }
  }

  private _scheduleAutomationInternal(automation: ScheduledTrackAutomation) {
    const seekbarOffsetInMicros = this.runningTimestamp * SEC_TO_MICROSEC;
    const context = audioService.useAudioContext();
    const currentTime = context.currentTime;

    const startTime = automation.startOffsetMicros;
    const endTime = automation.endOffsetMicros;
    const offsetMicros = automation.offsetMicros

    if (offsetMicros + (endTime - startTime) < seekbarOffsetInMicros) {
      const key = automation.nodeId;

      if (Object.hasOwn(this.scheduledAutomation, key)) {
        const node = getAudioNode(key);
        // Deduce automation being performed on this node.

        if (node !== undefined) {
          if (AudioNode.name === 'GainNode') {
            const aParam = (node as GainNode).gain;
            aParam.cancelScheduledValues(0);
          }
        }
        
        delete this.scheduledAutomation[key];
      }

      return;
    }

    let index = 0;

    // Change strategy based on the total points 
    while (index < automation.points.length && offsetMicros + automation.points[index].time < seekbarOffsetInMicros) {
      ++index;
    }

    --index;

    // Currently assume that all points are linear
    // Get current value
    const currPoint = automation.points[index];
    const nextPoint = automation.points[index + 1];
    const proportion = (seekbarOffsetInMicros - currPoint.time) / (nextPoint.time - currPoint.time);
    const currentValue = (nextPoint.value - currPoint.value) * proportion + currPoint.value;

    // const sear

    // const startTimeSecs = startTime / SEC_TO_MICROSEC;
    // const trackDurationSecs = endTime / SEC_TO_MICROSEC;
    // const distance = (seekbarOffsetInMicros - trackOffsetMicros) / SEC_TO_MICROSEC;

    // const bufferSource = context.createBufferSource();
    // bufferSource.buffer = this.getAudioBuffer(audioId);
    // bufferSource.connect(pannerNodes);

    // const offsetStart = startTimeSecs + Math.max(distance, 0);

    // bufferSource.start(
    //   currentTime + Math.max(-distance, 0), 
    //   offsetStart,
    //   trackDurationSecs - offsetStart
    // );

    // this.offlineScheduledNodes[scheduledKey] = {
    //   audioId,
    //   buffer: bufferSource,
    //   details: track.trackDetail
    // };

    // bufferSource.onended = () => {
    //   if (Object.hasOwn(this.offlineScheduledNodes, scheduledKey)) {
    //     const node = this.offlineScheduledNodes[scheduledKey];
    //     node.buffer.disconnect();
    //     delete this.offlineScheduledNodes[scheduledKey];
    //   }
    // }
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

      let multiSelectedDomElements = this
        .multiSelectTracker
        .multiSelectedDOMElements;

      multiSelectedDomElements = multiSelectedDomElements.filter((element) => (
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

    const {audioId, trackDetail: {scheduledKey}} = track;

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

          node.buffer.stop(0);
          node.buffer.disconnect();
          delete this.scheduledNodes[symbolKey];

          this._scheduleInternal(trackToSchedule.audioId, trackToSchedule.trackDetail);
        } else {
          this._scheduleInternal(audio.audioId, audio.trackDetail);
        }
      }
      ++trackNumber;
    } 
  }

  rescheduleAudioFromScheduledNodes(audioKey: symbol) {
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
      delete this.scheduledNodes[scheduledKey];
      this._scheduleInternal(node.audioId, trackDetail);
    }
  }

  rescheduleTrack(scheduledKey: symbol, trackDetails: AudioTrackDetails) {
    if (Object.hasOwn(this.scheduledNodes, scheduledKey)) {
      const node = this.scheduledNodes[scheduledKey];
      node.buffer.stop(0);
      node.buffer.disconnect();
      delete this.scheduledNodes[scheduledKey];
    }

    this._scheduleInternal(trackDetails.audioId, trackDetails.trackDetail);
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

  getTimeData(
    stereoLeftBuffer: Uint8Array<ArrayBuffer>, 
    stereoRightBuffer: Uint8Array<ArrayBuffer>
  ) {
    const left = (this.leftAnalyserNode as AnalyserNode);
    const right = (this.rightAnalyserNode as AnalyserNode);

    left.getByteTimeDomainData(stereoLeftBuffer);
    right.getByteTimeDomainData(stereoRightBuffer);
  }

  getTimeDataFromMixer(
    mixer: number,
    stereoLeftBuffer: Uint8Array<ArrayBuffer>, 
    stereoRightBuffer: Uint8Array<ArrayBuffer>
  ) {
    const {
      left,
      right
    } = mixer > 0 ? 
      this.mixer.useMixer().analyserNodes[mixer - 1] :
      this.mixer.useMixer().masterAnalyserNodes as {
        left: AnalyserNode,
        right: AnalyserNode
      };

    left.getByteTimeDomainData(stereoLeftBuffer);
    right.getByteTimeDomainData(stereoRightBuffer);
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
