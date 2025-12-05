import {TimeSectionSelection} from '@/app/components/editor/seekbar';
import {AudioDetails} from '@/app/state/audiostate';
import {audioService} from '@/app/services/audioservice';
import {Maybe} from '@/app/services/interfaces';
import {Mixer} from '@/app/services/mixer';
import {getAudioNodeFromRegistry} from '@/app/services/audio/noderegistry';
import {
  AudioTrackDetails,
  SEC_TO_MICROSEC
} from '@/app/state/trackdetails/trackdetails';
import {
  MultiSelectTracker,
  SelectedTrackInfo,
  TransformedAudioTrackDetails
} from './multiselect';
import {ScheduledTrackAutomation} from '@/app/state/trackdetails/trackautomation';
import {SingletonStore} from '../singlestore';
import {AudioSyncClock} from './clock';
import {AudioStore} from './audiobank';
import {Scheduler} from './scheduler';

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
  mixer: Mixer = SingletonStore.getInstance(Mixer);

  // Audio-specific nodes
  masterGainNode: GainNode | null = null 
  leftAnalyserNode: AnalyserNode | null = null;
  rightAnalyserNode: AnalyserNode | null = null;
  splitChannel: ChannelSplitterNode | null = null;
  audioStore: AudioStore = SingletonStore.getInstance(AudioStore)!;
  clock = SingletonStore.getInstance(AudioSyncClock)!;
  scheduler = SingletonStore.getInstance(Scheduler)!;

  /// Store objects
  scheduledAutomation: ScheduledAutomation = {}
  offlineScheduledNodes: ScheduledNodesInformation = {};

  // Classes
  private multiSelectTracker: MultiSelectTracker = SingletonStore.getInstance(
    MultiSelectTracker
  );

  audioCanvas: {
    [k: symbol]: OffscreenCanvas  
  } = {};

  constructor(
    public totalTrackSize: number,
    public totalMixers: number
  ) {}

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
    this.audioStore.setPannerForAudio(audioId, pan);
  }

  getPannerForAudio(audioId: symbol) {
    return this.audioStore.getPannerForAudio(audioId);
  }

  setGainForAudio(audioId: symbol, value: number) {
    this.audioStore.setGainForAudio(audioId, value);
  }

  getGainForAudio(audioId: symbol) {
    return this.audioStore.getGainForAudio(audioId);
  }
  
  getGainParamForAudio(audioId: symbol) {
    return this.audioStore.getGainParamForAudio(audioId);
  }

  /**
   * @description Simulates all the connections into offline.
   * TODO: Allow user to specify the sample rate, and channels.
   * @param scheduledTracks all the scheduled tracks currently done.
   * @returns rendered raw audio data.
   */
  async simulateIntoOfflineAudio(scheduledTracks: AudioTrackDetails[][]) {
    const channels = DEFAULT_CHANNELS;
    const bufferLength = Math.ceil(
      DEFAULT_SAMPLE_RATE * this.clock.loopEnd / SEC_TO_MICROSEC
    );
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
    return this.audioStore.registerAudioInAudioBank(audioDetails, audioBuffer);
  }

  /**
   * @description Unregister Audio from Audio Buffer
   * @returns boolean value where audio buffer is successfully removed or not.
   */
  updateRegisteredAudioFromAudioBank(sym: symbol, updatedBuffer: AudioBuffer) {
    this.audioStore.updateRegisteredAudioFromAudioBank(sym, updatedBuffer);
  }

  /**
   * @description Unregister Audio from Audio Buffer
   * @returns boolean value where audio buffer is successfully removed or not.
   */
  unregisterAudioFromAudioBank(sym: symbol): boolean {
    return this.audioStore.unregisterAudioFromAudioBank(sym);
  }

  getAudioBuffer(symbol: symbol): AudioBuffer | null {
    return this.audioStore.getAudioBuffer(symbol);
  }

  getMixerValue(symbol: symbol): number {
    return this.audioStore.getMixerValue(symbol);
  }

  setMixerValue(symbol: symbol, mixerValue: number) {
    this.audioStore.setMixerValue(symbol, mixerValue);
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
    this.clock.selectTimeframe(timeSelection);
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
    this.clock.setLoopEnd(valueMicros / SEC_TO_MICROSEC);
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

  schedule(audioTrackDetails: AudioTrackDetails[][]) {
    this.scheduler.scheduleTracks(audioTrackDetails);
  }

  scheduleAutomation(trackAutomationDetails: ScheduledTrackAutomation[][]) {
    for (const automations of trackAutomationDetails) {
      for (const automation of automations) {
        this._scheduleAutomationInternal(automation);
      }
    }
  }

  private _scheduleAutomationInternal(automation: ScheduledTrackAutomation) {
    const seekbarOffsetInMicros = this.clock.getRunningTimestamp() * SEC_TO_MICROSEC;
    const context = audioService.useAudioContext();
    const currentTime = context.currentTime;

    const startTime = automation.startOffsetMicros;
    const endTime = automation.endOffsetMicros;
    const offsetMicros = automation.offsetMicros

    if (offsetMicros + (endTime - startTime) < seekbarOffsetInMicros) {
      const key = automation.nodeId;

      if (Object.hasOwn(this.scheduledAutomation, key)) {
        const node = getAudioNodeFromRegistry(key);
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
    this.scheduler.removeTrackFromScheduledNodes(track);
  }

  removeScheduledTracksFromScheduledKeys(scheduledKeys: symbol[]) {
    this.scheduler.removeScheduledTracksFromScheduledKeys(scheduledKeys);
  }

  removeScheduledAudioInstancesFromScheduledNodes(id: symbol) {
    this.scheduler.removeScheduledAudioInstancesFromScheduledNodes(id);
  }

  scheduleSingleTrack(
    audioId: symbol,
    trackDetails: SubType<AudioTrackDetails, 'trackDetail'>
  ) {
    this.scheduler.scheduleSingleTrack(audioId, trackDetails);
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

      if (Object.hasOwn(this.offlineScheduledNodes, key)) {
        this.offlineScheduledNodes[key].buffer.stop();
        delete this.offlineScheduledNodes[key];
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

  /**
   * @description Reschedule audio tracks, with changed details to accomodate new changes.
   * @param audioTrackDetails All track details
   * @param movedAudioTracks Moved scheduled that contains additional information to override.
   */
  rescheduleAllTracks(
    audioTrackDetails: AudioTrackDetails[][],
    movedAudioTracks?: AudioTrackDetails[]
  ) {
    this.scheduler.rescheduleAllTracks(audioTrackDetails, movedAudioTracks);
  }

  rescheduleAudioFromScheduledNodes(audioKey: symbol) {
    this.scheduler.rescheduleAudioFromScheduledNodes(audioKey);
  }

  rescheduleTrackFromScheduledNodes(
    scheduledKey: symbol,
    trackDetail: SubType<AudioTrackDetails, 'trackDetail'>
  ) {
    this.scheduler.rescheduleTrackFromScheduledNodes(scheduledKey, trackDetail);
  }

  rescheduleTrack(scheduledKey: symbol, trackDetails: AudioTrackDetails) {
    this.scheduler.rescheduleTrack(scheduledKey, trackDetails);
  }

  rescheduleMovedTrackFromScheduledNodes(
    audioId: symbol,
    trackDetail: SubType<AudioTrackDetails, 'trackDetail'>, 
    trackOffsetMicros: number
  ) {
    this.scheduler.rescheduleMovedTrackFromScheduledNodes(audioId, trackDetail, trackOffsetMicros);
  }

  /**
   * @description Removes all scheduled nodes that are running/pending.
   * @returns void
   */
  removeAllScheduledTracks() {
    this.scheduler.removeAllScheduledTracks();
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
    const {left, right} = this.mixer.useMixer().analyserNodes[mixer];

    left.getByteTimeDomainData(stereoLeftBuffer);
    right.getByteTimeDomainData(stereoRightBuffer);
  }

  /**
   * @description Update timestamp in seconds
   * @returns true if by updating timestamp, time goes out of bounds.
   */
  updateTimestamp(): boolean {
    return this.clock.updateTimestamp();
  }

  /**
   * @description Set timestamp in seconds
   * @returns true if by setting timestamp, time goes out of bounds.
   */
  setTimestamp(startValue: number) {
    return this.clock.setTimestamp(startValue);
  }

  /**
   * @description Get timestamp in seconds
   * @returns number
   */
  getTimestamp() {
    return this.clock.getRunningTimestamp();
  }
}

export const audioManager = new AudioTrackManager(30, 30);
