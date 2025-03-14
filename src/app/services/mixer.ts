import { audioService } from "./audioservice";

export class Mixer {
  masterGainNode: GainNode | null = null;
  private gainNodes: GainNode[] = [];
  private channelSplitterNodes: ChannelSplitterNode[] = [];
  analyserNodes: {
    left: AnalyserNode,
    right: AnalyserNode
  }[] = [];
  private panNodes: StereoPannerNode[] = [];
  private mixerViewIdentifier: symbol = Symbol();
  private isInitialized = false;

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
    if (mixerNumber === 0) {
      return this.masterGainNode?.gain.value as number;
    }
    return this.gainNodes[mixerNumber - 1].gain.value;
  }

  getPanValue(mixerNumber: number) {
    return this.panNodes[mixerNumber - 1].pan.value;
  }

  initialize(context: BaseAudioContext): [GainNode[], StereoPannerNode[], GainNode] {
    const audioContext = context;
    const masterGainNode = audioContext.createGain();

    const gainNodes = Array.from({ length: this.totalMixerCount }, () => {
      const gainNode = audioContext.createGain();
      gainNode.connect(masterGainNode as GainNode);
      return gainNode;
    });

    const pannerNodes = Array.from({ length: this.totalMixerCount }, (_, index: number) => {
      const pannerNode = audioContext.createStereoPanner()
      pannerNode.connect(gainNodes[index]);
      return pannerNode;
    });

    return [gainNodes, pannerNodes, masterGainNode];
  }

  useMixer() {
    if (!this.isInitialized) {
      const context = audioService.useAudioContext();
      [this.gainNodes, this.panNodes, this.masterGainNode] = this.initialize(context);
      this.isInitialized = true;

      this.analyserNodes = Array.from({ length: this.totalMixerCount }, (_, index: number) => {
        const left = context.createAnalyser();
        const right = context.createAnalyser()
        return { left, right };
      });

      this.channelSplitterNodes = Array.from({ length: this.totalMixerCount }, (_, index: number) => {
        const channelSplitter = context.createChannelSplitter();
        this.gainNodes[index].connect(channelSplitter);
        const { left, right } = this.analyserNodes[index];
        channelSplitter.connect(left, 0);
        channelSplitter.connect(right, 1);
        return channelSplitter;
      });
    }

    return this;
  }

  connectNodeToMixer(node: AudioNode, mixerNumber: number) {
    if (mixerNumber === 0) {
      node.connect(this.masterGainNode as GainNode);
    } else {
      node.connect(this.panNodes[mixerNumber - 1]);
    }
  }

  connectMixerOutputTo(node: AudioNode, mixerNumber: number) {
    this.gainNodes[mixerNumber].connect(node);
  }

  setGainValue(mixerNumber: number, value: number) {
    console.assert(value >= 0 && value <= 2);
    this.gainNodes[mixerNumber].gain.value = value;
  }

  setPanValue(mixerNumber: number, value: number) {
    console.assert(value >= -1 && value <= 1);
    this.panNodes[mixerNumber].pan.value = value;
  }
};
