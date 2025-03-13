import { audioService } from "./audioservice";

export class Mixer {
  masterGainNode: GainNode | null = null;
  private gainNodes: GainNode[] = [];
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

      // this.leftAnalyserNode = context.createAnalyser();
      // this.rightAnalyserNode = context.createAnalyser();

      // this.splitChannel = context.createChannelSplitter(2);
      // this.masterGainNode.connect(context.destination);
      // this.masterGainNode.connect(this.splitChannel);

      // this.splitChannel.connect(this.leftAnalyserNode, 0);
      // this.splitChannel.connect(this.rightAnalyserNode, 1);
    }
  }

  connectNodeToMixer(node: AudioNode, mixerNumber: number) {
    console.log(this.masterGainNode, mixerNumber);
    if (mixerNumber < 0) {
      node.connect(this.masterGainNode as GainNode);
    } else {
      node.connect(this.panNodes[mixerNumber]);
    }
  }

  connectMixerOutputTo(node: AudioNode, mixerNumber: number) {
    this.gainNodes[mixerNumber].connect(node);
  }

  setGainValue(mixerNumber: number, value: number) {
    console.assert(value >= 0 && value <= 1);
    this.gainNodes[mixerNumber].gain.value = value;
  }

  setPanValue(mixerNumber: number, value: number) {
    console.assert(value >= -1 && value <= 1);
    this.gainNodes[mixerNumber].gain.value = value;
  }
};
