import { AudioTrackDetails } from "../state/trackdetails";
import { AudioTransformation } from "./interfaces";


export function transformAudio(
  audioInputs: AudioTrackDetails,
  transformationType: AudioTransformation
): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    const audioBuffer = audioInputs.buffer as AudioBuffer;
    const totalChannels = audioBuffer.numberOfChannels;
    const allBuffers = [];

    for (let channel = 0; channel < totalChannels; ++channel) {
      const channelData = audioBuffer.getChannelData(channel);
      allBuffers.push(channelData);
    }

    const worklet = new Worker(new URL('./worklet.ts', import.meta.url));

    worklet.onmessage = function(event: MessageEvent<any>) {
      const buffer = event.data.buffer;

      for (let channel = 0; channel < totalChannels; ++channel) {
        audioBuffer.copyToChannel(buffer[channel], channel);
      }
      resolve(audioBuffer);

      worklet.terminate();
    }

    worklet.postMessage({
      buffer: allBuffers,
      type: transformationType
    });
  });
}

export type CanvasRedrawInformation = {
  canvas: OffscreenCanvas,
  buffer: Array<Float32Array>,
}

export function canvasRedraw(
  canvas: OffscreenCanvas,
  audioBuffer: AudioBuffer
) {
  return new Promise<OffscreenCanvas>((resolve, reject) => {
    const newCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const worker = new Worker(new URL('./canvas.ts', import.meta.url));

    worker.onmessage = function(event: MessageEvent<{done: boolean}>) {
      if (event.data.done) {
        resolve(newCanvas);
      }
    }

    const totalChannels = audioBuffer.numberOfChannels;
    const allBuffers = [];

    for (let channel = 0; channel < totalChannels; ++channel) {
      const channelData = audioBuffer.getChannelData(channel);
      allBuffers.push(channelData);
    }

    worker.postMessage({
      canvas: newCanvas,
      buffer: allBuffers,
    }, [newCanvas, allBuffers[0].buffer, allBuffers[1].buffer]);
  });
}

/**
 * Transform audio input with certain details to certain output, as per the
 * parameters (todo)
 * 
 * @param audioInput Input audio track
 * @returns 
 */
export function renderAudio(
  audioInput: AudioTrackDetails,
  options?: Array<any>
) {
  return new Promise<AudioBuffer>((resolve, reject) => {
    const buffer = audioInput.buffer as AudioBuffer;
    const offlineAudioContext = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);

    offlineAudioContext.audioWorklet.addModule(new URL('./audioworklet.js', import.meta.url)).then(() => {
      // To do: Assign certain details to perform before rendering the audio.
      const workletNode = new AudioWorkletNode(offlineAudioContext, 'transformation');
      const bufferSourceNode = offlineAudioContext.createBufferSource();
      bufferSourceNode.buffer = buffer;
      bufferSourceNode.connect(workletNode).connect(offlineAudioContext.destination);
      
      /// Acknowledged that the message is processed successfully.
      workletNode.port.onmessage = function (event: MessageEvent<any>) {
        if (event.data.received) {
          offlineAudioContext.startRendering();
          bufferSourceNode.start();
        } else {
          reject();
        }
      }

      if (options) {
        workletNode.port.postMessage({
          settings: options
        });
      }
    
      offlineAudioContext.oncomplete = function (ev: OfflineAudioCompletionEvent) {
        resolve(ev.renderedBuffer);
      }
    });
  });
}