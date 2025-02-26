
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

/**
 * Transformation store.
 */
export interface AudioTransformationDetails {
  /**
   * @description Type of transformation.
   */
  type: AudioTransformation,
  /**
   * @description Value used for transformation.
   */
  value: number
}

export interface InputAudioTransformationDetails {
  type: AudioTransformation,
  buffer: Array<Float32Array>,
}
