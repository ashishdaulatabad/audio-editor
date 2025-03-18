import { audioService } from "./audioservice";
import { Maybe } from "./interfaces";

export class Mixer {
  masterGainNode: Maybe<GainNode> = null;
  masterPannerNode: Maybe<StereoPannerNode> = null;
  private gainNodes: GainNode[] = [];
  private channelSplitterNodes: ChannelSplitterNode[] = [];
  private panNodes: StereoPannerNode[] = [];
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
    if (mixerNumber === 0) {
      return this.masterGainNode?.gain.value as number;
    }
    return this.gainNodes[mixerNumber - 1].gain.value;
  }

  getPanValue(mixerNumber: number) {
    if (mixerNumber === 0) {
      return this.masterPannerNode?.pan.value as number;
    }

    return this.panNodes[mixerNumber - 1].pan.value;
  }

  initialize(context: BaseAudioContext): [GainNode[], StereoPannerNode[], GainNode, StereoPannerNode] {
    const audioContext = context;
    const masterGainNode = audioContext.createGain();
    const masterPannerNode = audioContext.createStereoPanner();

    const gainNodes = Array.from({ length: this.totalMixerCount }, () => {
      const gainNode = audioContext.createGain();
      gainNode.connect(masterPannerNode);
      return gainNode;
    });

    const pannerNodes = Array.from({ length: this.totalMixerCount }, (_, index: number) => {
      const pannerNode = audioContext.createStereoPanner()
      pannerNode.connect(gainNodes[index]);
      return pannerNode;
    });

    masterPannerNode.connect(masterGainNode);

    return [gainNodes, pannerNodes, masterGainNode, masterPannerNode];
  }

  useMixer() {
    if (!this.isInitialized) {
      const context = audioService.useAudioContext();
      [this.gainNodes, this.panNodes, this.masterGainNode, this.masterPannerNode] = this.initialize(context);

      this.analyserNodes = Array.from({ length: this.totalMixerCount }, (_, index: number) => {
        const left = context.createAnalyser();
        const right = context.createAnalyser()
        return { left, right };
      });

      this.masterAnalyserNodes = {
        left: context.createAnalyser(),
        right: context.createAnalyser()
      };

      this.channelSplitterNodes = Array.from({ length: this.totalMixerCount }, (_, index: number) => {
        const channelSplitter = context.createChannelSplitter();
        this.gainNodes[index].connect(channelSplitter);
        const { left, right } = this.analyserNodes[index];
        channelSplitter.connect(left, 0);
        channelSplitter.connect(right, 1);
        return channelSplitter;
      });

      const masterSplitterNode = context.createChannelSplitter();
      this.masterGainNode.connect(masterSplitterNode);
      masterSplitterNode.connect(this.masterAnalyserNodes.left, 0);
      masterSplitterNode.connect(this.masterAnalyserNodes.right, 1);
      this.isInitialized = true;
    }

    return this;
  }

  connectNodeToMixer(node: AudioNode, mixerNumber: number) {
    if (mixerNumber === 0) {
      node.connect(this.masterPannerNode as StereoPannerNode);
    } else {
      node.connect(this.panNodes[mixerNumber - 1]);
    }
  }

  connectMixerOutputTo(node: AudioNode, mixerNumber: number) {
    this.gainNodes[mixerNumber].connect(node);
  }

  setGainValue(mixerNumber: number, value: number) {
    console.assert(value >= 0 && value <= 2);

    if (mixerNumber > 0) {
      this.gainNodes[mixerNumber - 1].gain.value = value;
    } else {
      if (this.masterGainNode) {
        this.masterGainNode.gain.value = value;
      }
    }
  }

  setPanValue(mixerNumber: number, value: number) {
    console.assert(value >= -1 && value <= 1);

    if (mixerNumber > 0) {
      this.panNodes[mixerNumber - 1].pan.value = value;
    } else {
      if (this.masterPannerNode) {
        this.masterPannerNode.pan.value = value;
      }
    }
  }
};
