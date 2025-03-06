import { AudioDetails } from '../state/audiostate';
import { AudioTrackDetails } from '../state/trackdetails';
import { clamp } from '../utils';
import { audioService } from './audioservice';

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
  }
};

class AudioTrackManager {
  isInitialized = false;
  paused = true;
  scheduled = false;
  startTimestamp = 0;
  runningTimestamp = 0;
  loopEnd = 5;

  // Audio-specific nodes
  masterGainNode: GainNode | null = null 
  gainNodes: GainNode[] = [];
  pannerNodes: StereoPannerNode[] = [];
  leftAnalyserNode: AnalyserNode | null = null;
  rightAnalyserNode: AnalyserNode | null = null;
  splitChannel: ChannelSplitterNode | null = null;
  audioBank: AudioBank = {};

  /// Store objects
  multiSelectedDOMElements: SelectedAudioTrackDetails[] = [];
  scheduledNodes: {
    [k: symbol]: {
      audioId: symbol,
      buffer: AudioBufferSourceNode,
      // May need additional details when waveforms are shrinked.
      pendingReschedule?: {
        offsetInMillis: number,
        newTrack?: AudioTrackDetails,
        trackNumber: number
      }
    }
  } = {};
  audioCanvas: {
    [k: symbol]: OffscreenCanvas
  } = {};

  constructor(
    public totalTrackSize: number,
  ) {}

  initialize() {
    const audioContext = audioService.useAudioContext();

    this.gainNodes = Array.from({ length: this.totalTrackSize }, () => {
      const gainNode = audioContext.createGain();
      gainNode.connect(this.masterGainNode as GainNode);
      return gainNode;
    });

    this.pannerNodes = Array.from({ length: this.totalTrackSize }, (_, index: number) => {
      const pannerNode = audioContext.createStereoPanner()
      pannerNode.connect(this.gainNodes[index]);
      return pannerNode;
    });

    this.isInitialized = true;
  }

  /**
   * @description Store registered audio bank in an audio bank registry
   * @param audioDetails details regarding the Audio
   * @param audioBuffer Audio Buffer
   * @returns A unique symbol that identifies this audio reference.
   */
  registerAudioInAudioBank(
    audioDetails: Omit<AudioDetails, 'audioId'>,
    audioBuffer: AudioBuffer
  ): symbol {
    const symbol = Symbol();

    this.audioBank[symbol] = {
      audioDetails,
      buffer: audioBuffer
    };

    return symbol;
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
      delete this.audioBank[sym];
      return true;
    }

    console.warn('Audio Bank not found');
    return false;
  }

  /**
   * @description Get Raw Audio Buffer.
   * @param symbol identifier of audio in audio bank
   * @returns buffer reference
   */
  getAudioBuffer(symbol: symbol) {
    return this.audioBank[symbol].buffer;
  }

  /**
   * @description Clear all selection of DOM Elements
   */
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
   * Set element as Multi-selected.
   * 
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
    }
  }

  /**
   * Set element as Multi-selected.
   * 
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
   * Set element as Multi-selected.
   * 
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
   * Apply move transformation to these selected DOM elements
   * 
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

      if (!minShrinkSet) {
        minShrinkValue = trackWidth;
        minShrinkSet = true;
      } else if (minShrinkValue > trackWidth) {
        minShrinkValue = trackWidth;
      }

      if (!minExpandSet) {
        minExpandValue = trackScrollLeft;
        minExpandSet = true;
      } else if (minExpandValue > trackScrollLeft) {
        minExpandValue = trackScrollLeft;
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
   * Apply move transformation to these selected DOM elements
   * 
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
      const left = element.domElement.style.left ?? '0px';
      const scrollLeft = element.domElement.scrollLeft;
      const width = element.domElement.offsetWidth;

      const finalPosition = parseFloat(left.substring(0, left.length - 2));

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

  /**
   * Safety function to initialize audiocontext before
   * using audiomanager
   * 
   * @returns Self; the Audio Manager.
   */
  useManager() {
    if (!this.isInitialized) {
      const context = audioService.useAudioContext();
      this.masterGainNode = context.createGain();
      this.initialize();
      this.leftAnalyserNode = context.createAnalyser();
      this.rightAnalyserNode = context.createAnalyser();

      this.splitChannel = context.createChannelSplitter(2);
      this.masterGainNode.connect(context.destination);
      this.masterGainNode.connect(this.splitChannel);

      this.splitChannel.connect(this.leftAnalyserNode, 0);
      this.splitChannel.connect(this.rightAnalyserNode, 1);
    }

    return this;
  }

  setLoopEnd(valueMillis: number) {
    this.loopEnd = Math.max(5, valueMillis / 1000);
  }

  setGainNodeForMaster(vol: number) {
    this.masterGainNode?.gain.setValueAtTime(vol, 0);
  }

  setGainNodeForTrack(track: number, vol: number) {
    this.gainNodes[track].gain.setValueAtTime(vol, 0);
  }

  setPannerNodeForTrack(track: number, pan: number) {
    this.pannerNodes[track].pan.setValueAtTime(pan, 0);
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
   * Schedule all audio tracks
   * 
   * @param audioTrackDetails 2D array containing all tracks.
   */
  schedule(audioTrackDetails: AudioTrackDetails[][]) {
    let trackIndex = 0;
    // const context = audioService.useAudioContext();
    // const currentTime = context.currentTime;
    for (const trackContents of audioTrackDetails) {
      for (const track of trackContents) {
        this._scheduleInternal(track, track.trackDetail.offsetInMillis, trackIndex);
      }
      ++trackIndex;
    }
  }

  /**
   * Removes scheduled tracks.
   * @param track 
   */
  removeTrackFromScheduledNodes(track: AudioTrackDetails) {
    const symbolKey = track.trackDetail.scheduledKey;

    if (Object.hasOwn(this.scheduledNodes, symbolKey)) {
      this.scheduledNodes[symbolKey].buffer.stop();
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
        node.buffer.disconnect();
        delete node.pendingReschedule;
        delete this.scheduledNodes[key];;
      }
    }
  }

  /**
   * @description Remove all scheduled nodes from this audio
   * @param id audio id to remove
   * @returns void
   */
  removeAllAudioFromScheduledNodes(id: symbol) {
    const allKeys = Object.getOwnPropertySymbols(this.scheduledNodes);

    for (const key of allKeys) {
      const node = this.scheduledNodes[key];

      if (node.audioId === id) {
        node.buffer.stop(0);
        node.buffer.disconnect();
        delete node.pendingReschedule;
        delete this.scheduledNodes[key];
      }
    }
  }

  /**
   * Schedule a single track at a given offset.
   * 
   * @param track Track to schedule
   * @param trackNumber Track number to join to
   * @param trackOffsetMillis Offset in `ms`
   */
  scheduleSingleTrack(
    track: AudioTrackDetails,
    trackNumber: number,
    trackOffsetMillis: number
  ) {
    this._scheduleInternal(track, trackOffsetMillis, trackNumber);
  }

  private _scheduleInternal(track: AudioTrackDetails, trackOffsetMillis: number, trackNumber: number) {
    const seekbarOffsetInMillis = this.runningTimestamp * 1000;
    const context = audioService.useAudioContext();
    const currentTime = context.currentTime;

    const {
      audioId,
      trackDetail: {
        scheduledKey
      }
    } = track;

    // Not scaled with playback rate.
    const startTime = track.trackDetail.startOffsetInMillis;
    // Not scaled with playback rate.
    const endTime = track.trackDetail.endOffsetInMillis;

    if (trackOffsetMillis + (endTime - startTime) < seekbarOffsetInMillis) {
      const key = track.trackDetail.scheduledKey;

      if (Object.hasOwn(this.scheduledNodes, key)) {
        this.scheduledNodes[key].buffer.stop();
        delete this.scheduledNodes[key];
      }
      return;
    }

    const startTimeSecs = startTime / 1000;
    const trackDurationSecs = endTime / 1000;
    const distance = (seekbarOffsetInMillis - trackOffsetMillis) / 1000;

    const bufferSource = context.createBufferSource();
    bufferSource.buffer = this.getAudioBuffer(audioId);
    bufferSource.connect(this.pannerNodes[trackNumber]);

    const offsetStart = startTimeSecs + Math.max(distance, 0);

    bufferSource.start(
      currentTime + Math.max(-distance, 0), 
      offsetStart,
      trackDurationSecs - offsetStart
    );
    this.scheduledNodes[scheduledKey] = {
      audioId,
      buffer: bufferSource,
    };

    bufferSource.onended = () => {
      if (Object.hasOwn(this.scheduledNodes, scheduledKey)) {
        const node = this.scheduledNodes[scheduledKey];
        node.buffer.disconnect();

        if (!node.pendingReschedule) {
          delete this.scheduledNodes[scheduledKey];
        } else {
          if (node.pendingReschedule) {
            const {
              offsetInMillis,
              newTrack,
              trackNumber: newTrackNumber
            } = node.pendingReschedule;
            if (newTrack) {
              // console.log('reschedule new modified');
              this._scheduleInternal(newTrack, offsetInMillis, newTrackNumber);
            } else {
              // console.log('reschedule current modified');
              this._scheduleInternal(track, offsetInMillis, newTrackNumber);
            }
          } else {
            this._scheduleInternal(track, track.trackDetail.offsetInMillis, trackNumber);
          }
        }
      }
    }
  }

  /**
   * Reschedule all audio tracks that are scheduled, or to be scheduled.
   * 
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

          if (typeof audioTrackIndex === 'number' && audioTrackIndex > -1) {
            const newTrack = (movedAudioTracks as AudioTrackDetails[])[audioTrackIndex];
            node.pendingReschedule = {
              offsetInMillis: newTrack.trackDetail.offsetInMillis,
              newTrack,
              trackNumber
            };
          } else {
            node.pendingReschedule = {
              offsetInMillis: audio.trackDetail.offsetInMillis,
              trackNumber
            };
          }
          node.buffer.stop(0);
          node.buffer.disconnect();
        } else {
          this._scheduleInternal(audio, audio.trackDetail.offsetInMillis, trackNumber);
        }
      }
      ++trackNumber;
    } 
  }

  rescheduleTrackFromScheduledNodes(
    track: AudioTrackDetails
  ) {
    const symbolKey = track.trackDetail.scheduledKey;

    if (Object.hasOwn(this.scheduledNodes, symbolKey)) {
      const node = this.scheduledNodes[symbolKey];
      node.pendingReschedule = {
        offsetInMillis: track.trackDetail.offsetInMillis,
        newTrack: track,
        trackNumber: track.trackDetail.trackNumber
      };

      node.buffer.stop(0);
      node.buffer.disconnect();
    }
  }

  rescheduleMovedTrackFromScheduledNodes(
    track: AudioTrackDetails,
    trackNumber: number,
    trackOffsetMillis: number
  ) {
    const symbolKey = track.trackDetail.scheduledKey;

    if (Object.hasOwn(this.scheduledNodes, symbolKey)) {
      const node = this.scheduledNodes[symbolKey];
      node.pendingReschedule = {
        offsetInMillis: trackOffsetMillis,
        newTrack: track,
        trackNumber
      };

      node.buffer.stop(0);
      node.buffer.disconnect();
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
    (this.leftAnalyserNode as AnalyserNode).getByteTimeDomainData(leftArray);
    (this.rightAnalyserNode as AnalyserNode).getByteTimeDomainData(rightArray);
  }

  updateTimestamp(): boolean {
    const context = audioService.useAudioContext();
    const time = context.currentTime;

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

  setTimestamp(startValue: number) {
    const context = audioService.useAudioContext();
    const time = context.currentTime;

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

  getTimestamp() {
    return this.runningTimestamp;
  }
}

export const audioManager = new AudioTrackManager(10);
