export type Maybe<T> = T | null;

export enum AudioRendering {
  PitchShift
}

export enum AudioTransformation {
  Reverse,
  ReversePolarity,
  SwapStereo,
  Normalization,
  ForceReset
}

export interface AudioTransformationDetails {
  transformationType: AudioTransformation,
  value: number
}

export interface InputAudioTransformationDetails {
  transformationType: AudioTransformation,
  buffer: Array<Float32Array>,
}
