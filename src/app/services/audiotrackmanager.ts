import { AudioTrackDetails } from "../state/trackdetails";
import { audioService } from "./audioservice";
 
export type SelectedAudioTrackDetails = AudioTrackDetails & {
  domElement: HTMLElement,
  initialPosition: number,
}

export type TransformedAudioTrackDetails = SelectedAudioTrackDetails & {
  finalPosition: number
}

class AudioTrackManager {
  isInitialized = false;
  masterGainNode: GainNode | null = null 
  gainNodes: GainNode[] = [];
  pannerNodes: StereoPannerNode[] = [];
  paused = true;
  scheduled = false;
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
  startTimestamp = 0;
  runningTimestamp = 0;
  loopEnd = 5;
  multiSelectedDOMElements: SelectedAudioTrackDetails[] = [];
  leftAnalyserNode: AnalyserNode | null = null;
  rightAnalyserNode: AnalyserNode | null = null;
  splitChannel: ChannelSplitterNode | null = null;

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
        initialPosition: domElement.offsetLeft
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
  applyResizingToMultipleSelectedTracks(diffX: number) {
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

  applyNewPositionForMultipleSelectedTracks(): TransformedAudioTrackDetails[] {
    const newElements: TransformedAudioTrackDetails[] = [];
    
    this.multiSelectedDOMElements.forEach(element => {
      const left = element.domElement.style.left ?? '0px';
      const finalPosition = parseFloat(left.substring(0, left.length - 2));

      newElements.push({
        ...element,
        finalPosition
      });

      element.initialPosition = finalPosition;
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

  /**
   * Reschedule all audio that are scheduled in the tracks.
   * 
   * @param audio Audio Details
   * @return void.
   */
  rescheduleAudioFromScheduledNodes(
    allTracks: AudioTrackDetails[][],
    audioId: symbol
  ) {
    let trackNumber = 0;

    for (const track of allTracks) {
      for (const audio of track) {
        if (audio.audioId === audioId) {
          const scheduledKey = audio.trackDetail.scheduledKey;
          
          if (Object.hasOwn(this.scheduledNodes, scheduledKey)) {
            const node = this.scheduledNodes[scheduledKey];
            
            node.pendingReschedule = {
              offsetInMillis: audio.trackDetail.offsetInMillis,
              newTrack: audio,
              trackNumber
            };
          }
        }
      }
      ++trackNumber;
    }
  }

  private _scheduleInternal(track: AudioTrackDetails, trackOffsetMillis: number, trackNumber: number) {
    const seekbarOffsetInMillis = this.runningTimestamp * 1000;
    const context = audioService.useAudioContext();
    const currentTime = context.currentTime;

    const {
      buffer,
      audioId,
      trackDetail: {
        scheduledKey
      }
    } = track;

    const startTime = track.trackDetail.startOffsetInMillis;
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
    bufferSource.buffer = buffer;
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
            /// Copy of this track might be different from
            /// the rescheduled key, after any alteration is done.
            /// Should work on this ASAP.
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
   * 
   * @param audioTrackDetails 
   * @param movedAudioTracks 
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
        } else {
          this._scheduleInternal(audio, audio.trackDetail.offsetInMillis, trackNumber);
        }
      }
      ++trackNumber;
    } 
  }

  rescheduleTrackFromScheduledNodes(
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
    }
  }

  /// Removes all scheduled tracks by the scheduler
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
