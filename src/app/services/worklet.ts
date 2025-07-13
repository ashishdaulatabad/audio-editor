
enum AudioRendering {
  PitchShift
}

enum AudioTransformation {
  Reverse,
  ReversePolarity,
  SwapStereo,
  Normalization
}

interface InputAudioTransformationDetails {
  transformationType: AudioTransformation,
  buffer: Array<Float32Array>,
}

self.addEventListener(
  'message',
  function(event: MessageEvent<InputAudioTransformationDetails>) {
    handleTransformation(event.data);
    self.postMessage(
      event.data, 
      // @ts-expect-error
      [event.data.buffer[0].buffer, event.data.buffer[1].buffer]
    );
  });

function handleTransformation(data: InputAudioTransformationDetails) {
  const { transformationType, buffer } = data;

  switch (transformationType) {
    case AudioTransformation.Reverse: {
      reverseAudio(buffer);
      break;
    }
    case AudioTransformation.Normalization: {
      normalizeAudio(buffer);
      break;
    }

    case AudioTransformation.ReversePolarity: {
      reversePolarity(buffer);
      break;
    }

    case AudioTransformation.SwapStereo: {
      swapStereo(buffer);
      break;
    }
  }
}

function reverseAudio(buffer: Array<Float32Array>) {
  for (let index = 0; index < buffer.length; ++index) {
    buffer[index] = buffer[index].reverse();
  }
}

function reversePolarity(buffer: Array<Float32Array>) {
  const length = buffer.length;

  for (let index = 0; index < length; ++index) {
    const channel = buffer[index];
    const channelLength = channel.length;

    for (let sample = 0; sample < channelLength; ++sample) {
      channel[index] *= -1;
    }
  }
}

function swapStereo(buffer: Array<Float32Array>) {
  const length = buffer.length;
  const temporaryArray = new Float32Array(buffer[0].length)

  /// Just exchange the stereo
  for (let index = 0; index < length - index - 1; ++index) {
    temporaryArray.set(buffer[index]);
    buffer[index].set(buffer[length - index - 1]);
    buffer[length - index - 1].set(temporaryArray);
  }
}

function normalizeAudio(
  buffer: Array<Float32Array>
) {
  let maxValue = 0;
  for (let index = 0; index < buffer.length; ++index) {
    const channel = buffer[index];
    const channelLength = channel.length;

    for (let sample = 0; sample < channelLength; ++sample) {
      maxValue = Math.max(maxValue, Math.abs(channel[sample]))
    }
  }

  if (maxValue > 0) {
    const normalizationFactor = 1 / maxValue;

    for (let index = 0; index < buffer.length; ++index) {
      const channel = buffer[index];
      const channelLength = channel.length;
  
      for (let sample = 0; sample < channelLength; ++sample) {
        channel[sample] *= normalizationFactor;
      }
    } 
  }
}
