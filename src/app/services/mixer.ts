import { audioService } from './audioservice';
import { Maybe } from './interfaces';
import { registerAudioNode } from './audio/noderegistry';

export class Mixer {
  // TODO: Create all nodes in array, and assign first ref to masterGainNode.
  masterGainNode: Maybe<GainNode> = null;
  masterGainRegistry: symbol = Symbol();

  // TODO: Create all nodes in array, and assign first ref to masterPannerNode.
  masterPannerNode: Maybe<StereoPannerNode> = null;
  masterPannerRegistry: symbol = Symbol();

  private _channelSplitterNodes: ChannelSplitterNode[] = [];

  // Gain node information
  private gainNodes: GainNode[] = [];
  private gainNodeIds: symbol[] = [];

  // Pan node information
  private panNodes: StereoPannerNode[] = [];
  private panNodeIds: symbol[] = [];

  private mixerViewIdentifier: symbol = Symbol();
  private isInitialized = false;

  masterAnalyserNodes: {
    left: AnalyserNode,
    right: AnalyserNode
  } | null = null;
  analyserNodes: {
    left: AnalyserNode,
    right: AnalyserNode
  }[] = [];

  constructor(
    private totalMixerCount: number
  ) {}

  get totalMixers() {
    return this.totalMixerCount;
  }

  get viewId() {
    return this.mixerViewIdentifier;
  }

  getGainValue(mixerNumber: number) {
    console.assert(mixerNumber >= 0 && mixerNumber <= this.totalMixerCount);
    return this.gainNodes[mixerNumber].gain.value;
  }

  getPanValue(mixerNumber: number) {
    console.assert(mixerNumber >= 0 && mixerNumber <= this.totalMixerCount);
    return this.panNodes[mixerNumber].pan.value;
  }

  /**
   * @description Initialize all the necessary nodes.
   * @param context audio context to use.
   * @param register Register to audio node to create a registry.
   * @returns List of all nodes, created based on BaseAudioContext.
   */
  initialize(
    context: BaseAudioContext,
    register: boolean = true
  ): [GainNode[], StereoPannerNode[], GainNode, StereoPannerNode] {
    const audioContext = context;
    const masterGainNode = audioContext.createGain();
    const masterPannerNode = audioContext.createStereoPanner();

    const gainNodes = Array.from({ length: this.totalMixerCount }, () => {
      const gainNode = audioContext.createGain();
      gainNode.connect(masterPannerNode);
      return gainNode;
    });

    const pannerNodes = Array.from(
      { length: this.totalMixerCount },
      (_, index: number) => {
        const pannerNode = audioContext.createStereoPanner()
        pannerNode.connect(gainNodes[index]);
        return pannerNode;
      });

    gainNodes.unshift(masterGainNode);
    pannerNodes.unshift(masterPannerNode);

    masterPannerNode.connect(masterGainNode);

    // When register is true, add to Audio Node List for tracking changes 
    // performed during the session.
    if (register) {
      this.masterGainRegistry = registerAudioNode(masterGainNode);
      this.masterPannerRegistry = registerAudioNode(masterPannerNode);

      pannerNodes.forEach((panNode) => (
        this.panNodeIds.push(registerAudioNode(panNode))
      ));

      gainNodes.forEach((gainNode) => (
        this.gainNodeIds.push(registerAudioNode(gainNode))
      ));
    }

    return [gainNodes, pannerNodes, masterGainNode, masterPannerNode];
  }

  useMixer() {
    if (!this.isInitialized) {
      const context = audioService.useAudioContext();
      [this.gainNodes, this.panNodes, this.masterGainNode, this.masterPannerNode] = this.initialize(context);

      this.analyserNodes = Array.from(
        { length: this.totalMixerCount }, 
        (_, index: number) => {
          const left = context.createAnalyser();
          const right = context.createAnalyser()
          return { left, right };
        });

      this.masterAnalyserNodes = {
        left: context.createAnalyser(),
        right: context.createAnalyser()
      };

      this._channelSplitterNodes = Array.from(
        { length: this.totalMixerCount }, 
        (_, index: number) => {
          const channelSplitter = context.createChannelSplitter();
          this.gainNodes[index].connect(channelSplitter);
          const { left, right } = this.analyserNodes[index];
          channelSplitter.connect(left, 0);
          channelSplitter.connect(right, 1);
          // left.fftSize = 512;
          // right.fftSize = 512;
          // left.smoothingTimeConstant = 0.4;
          // right.smoothingTimeConstant = 0.4;

          return channelSplitter;
        });

      const masterSplitterNode = context.createChannelSplitter();
      this.masterGainNode.connect(masterSplitterNode);
      masterSplitterNode.connect(this.masterAnalyserNodes.left, 0);
      masterSplitterNode.connect(this.masterAnalyserNodes.right, 1);
      // this.masterAnalyserNodes.left.fftSize = 512;
      // this.masterAnalyserNodes.right.fftSize = 512;
      // this.masterAnalyserNodes.left.smoothingTimeConstant = 0.4;
      // this.masterAnalyserNodes.right.smoothingTimeConstant = 0.4;
      this.isInitialized = true;
    }

    return this;
  }

  connectNodeToMixer(node: AudioNode, mixerNumber: number) {
    node.connect(this.panNodes[mixerNumber]);
  }

  // TODO: make mixer number uniform.
  connectMixerOutputTo(node: AudioNode, mixerNumber: number) {
    this.gainNodes[mixerNumber].connect(node);
  }

  setGainValue(mixerNumber: number, value: number) {
    console.assert(value >= 0 && value <= 2);
    console.assert(
      mixerNumber >= 0 && mixerNumber <= this.totalMixerCount, 
      'Invalid mixer number: ' + mixerNumber
    );

    this.gainNodes[mixerNumber].gain.value = value;
  }

  setPanValue(mixerNumber: number, value: number) {
    console.assert(value >= -1 && value <= 1);
    console.assert(
      mixerNumber >= 0 && mixerNumber <= this.totalMixerCount, 
      'Invalid mixer number: ' + mixerNumber
    );

    this.gainNodes[mixerNumber].gain.value = value;
  }
};
