class Processor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this.transformOption = [];

    this.onmessage = function (e) {
      this.transformOption = e.data.settings;
      this.port.postMessage({
        received: true
      });
    }
  }

  process(inputs, outputs) {
    const numberOfInputs = inputs.length;
    
    for (let inputIndex = 0; inputIndex < numberOfInputs; ++inputIndex) {
      const input = inputs[inputIndex];
      const output = outputs[inputIndex];
      const totalChannels = input.length;
      
      for (let channelIndex = 0; channelIndex < totalChannels; ++channelIndex) {
        const channel = input[channelIndex];
        const outputChannel = output[channelIndex];

        for (let sample = 0; sample < channel.length; ++sample) {
          outputChannel[sample] = channel[sample]
        }
      }
    }
  }
}


registerProcessor('transformation', Processor)