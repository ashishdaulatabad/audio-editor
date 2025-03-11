class Mixer {
  private masterGainNode: GainNode | null = null;
  private masterPanNode: StereoPannerNode | null = null;
  private gainNodes: GainNode[] = [];
  private panNodes: StereoPannerNode[] = [];

  constructor(
    private totalMixerCount: number
  ) {}

  initialize(context: BaseAudioContext) {}

  connectNodeToMixer(node: AudioNode, mixerNumber: number) {
    node.connect(this.panNodes[mixerNumber]);
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

export const mixer = new Mixer(30);