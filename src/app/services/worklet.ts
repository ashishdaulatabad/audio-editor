
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
  type: AudioTransformation,
  buffer: Array<Float32Array>,
}

self.addEventListener(
  'message',
  function(event: MessageEvent<InputAudioTransformationDetails>) {
    handleTransformation(event.data);
    // @ts-expect-error
    self.postMessage(event.data, [event.data.buffer[0].buffer, event.data.buffer[1].buffer]);
  });

function handleTransformation(data: InputAudioTransformationDetails) {
  const { type, buffer } = data;
  switch (type) {
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

/**
 * Reverses the audio buffer.
 * @param buffer Float32Array buffer.
 * @returns void
 */
function reverseAudio(buffer: Array<Float32Array>) {
  for (let index = 0; index < buffer.length; ++index) {
    buffer[index] = buffer[index].reverse();
  }
}

/**
 * Reverse the audio polarity
 * @param buffer 
 */
function reversePolarity(buffer: Array<Float32Array>) {
  const length = buffer.length;
  /// Just exchange the stereo
  for (let index = 0; index < length; ++index) {
    const channel = buffer[index];
    const channelLength = channel.length;

    for (let sample = 0; sample < channelLength; ++sample) {
      channel[index] = -channel[index];
    }
  }
}

/**
 * Swapping the stereo
 * @param buffer 
 */
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

/**
 * Normalize Audio by taking peak value of the current track.
 * - [ ] To do: store this value, to undo/redo the normalization.
 * @param buffer Float32Array buffer.
 * @returns void (in future should return Normalize Factor).
 */
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
