import React from 'react';
import { audioManager } from '@/app/services/audiotrackmanager';
import { applyChangesToModifiedAudio, SEC_TO_MICROSEC } from '@/app/state/trackdetails';
import { Checkbox } from '../checkbox';
import { transformAudio } from '@/app/services/audiotransform';
import { useDispatch, useSelector } from 'react-redux';
import { renderAudioWaveform } from '../editor/trackaudio';
import { AudioTransformation } from '@/app/services/interfaces';
import { Knob } from '../knob';
import { RootState } from '@/app/state/store';
import { WaveformSeekbar } from './waveformseekbar';

/**
 * @description Settings for Waveform Editor
 */
export interface WaveformEditorProps {
  /**
   * @description Track Number.
   */
  trackNumber: number
  /**
   * @description Audio ID of the current track.
   */
  audioId: number
  /**
   * @description Time per unit line distance in seconds
   */
  timePerUnitLineDistanceSecs: number
  /**
   * @description Width of the full window.
   */
  w: number
  /**
   * @description Height of the full window
   */
  h: number
}

/**
 * @description Creates the waveform editor for current `AudioTrack`.
 * 
 * Note that multiple scheduled track will refer to same instance of the raw `AudioBuffer`, but the
 * scheduled information will be shown at the bottom with red region.
 * 
 * - [ ] To do: Figure out how the internal width and height will be set up:
 * should be handled by the parent element itself.
 */
export function AudioWaveformEditor(props: React.PropsWithoutRef<WaveformEditorProps>) {
  const { trackNumber, audioId } = props;
  const track = useSelector((state: RootState) => (
    state.trackDetailsReducer.trackDetails[trackNumber][audioId]
  ));
  const ref = React.createRef<HTMLCanvasElement>();
  const divRef = React.createRef<HTMLDivElement>();
  const dispatch = useDispatch();

  // States
  const [transformationInProgress, setTransformationInProgress] = React.useState(false);
  const [pitch, setPitch] = React.useState(1);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [audioVolume, setAudioVolume] = React.useState(audioManager.getGainForAudio(track.audioId));
  const [audioPanner, setAudioPanner] = React.useState(audioManager.getPannerForAudio(track.audioId));
  const [audioMixer, setAudioMixer] = React.useState<number>(audioManager.getMixerValue(track.audioId));
  const [pitchBendingThreshold, setPitchBendingThreshold] = React.useState(2);

  // Declarations.
  const endTime = track.duration as number;
  const { timePerUnitLineDistanceSecs } = props;
  const totalLines = endTime / timePerUnitLineDistanceSecs;
  const lineDist = props.w / totalLines;
  const { startOffsetInMicros, endOffsetInMicros } = track.trackDetail;
  const measuredDuration = (endOffsetInMicros - startOffsetInMicros);
  const isPartial = Math.abs((measuredDuration - endTime * SEC_TO_MICROSEC)) > 1;

  React.useEffect(() => {
    /// Draw canvas
    if (ref.current && divRef.current) {
      const startOffsetSecs = track.trackDetail.startOffsetInMicros / SEC_TO_MICROSEC;
      const endOffsetSecs = track.trackDetail.endOffsetInMicros / SEC_TO_MICROSEC;
      const startLimit = ((lineDist / timePerUnitLineDistanceSecs) * startOffsetSecs);
      const endLimit = ((lineDist / timePerUnitLineDistanceSecs) * endOffsetSecs);
      const offcanvas = audioManager.getOffscreenCanvasDrawn(track.audioId);
      const context = ref.current.getContext('2d') as CanvasRenderingContext2D;

      context.clearRect(0, 0, ref.current.width, ref.current.height);
      context.fillStyle = "#C5645333";
      context.fillRect(startLimit, 0, endLimit - startLimit, offcanvas.height);
      context.drawImage(offcanvas, 0, 0, offcanvas.width, offcanvas.height, 0, 0, ref.current.clientWidth, ref.current.height);
    }

    return () => {};
  });

  /**
   * @description General transformation of Audio.
   * @param transformation Details.
   */
  function transform(transformation: AudioTransformation) {
    setTransformationInProgress(true);

    transformAudio(
      track,
      audioManager.getAudioBuffer(track.audioId) as AudioBuffer,
      transformation
    ).then(data => {
      audioManager.updateRegisteredAudioFromAudioBank(track.audioId, data);
      renderAudioWaveform({ ...track }, 200, timePerUnitLineDistanceSecs, true);

      dispatch(applyChangesToModifiedAudio({
        audioId: track.audioId,
        transformation
      }))

      audioManager.rescheduleTrackFromScheduledNodes(track.trackDetail.scheduledKey);

      setTransformationInProgress(false);
    });
  }

  /**
   * @description Change polarity of the current track
   */
  function transformPolarity() {
    transform(AudioTransformation.ReversePolarity);
  }

  /**
   * @description Reverse the track.
   */
  function transformReverse() {
    transform(AudioTransformation.Reverse);
  }

  /**
   * @description Swap Stereo.
   */
  function transformSwapStereo() {
    transform(AudioTransformation.SwapStereo)
  }

  /**
   * @description Normalize voice of the track.
   */
  function normalize() {
    transform(AudioTransformation.Normalization);
  }

  /**
   * @description change audio volume
   * @param e
   */
  function changeVolume(e: number) {
    audioManager.setGainForAudio(track.audioId, e);
    setAudioVolume(e);
  }

  /**
   * @description change audio volume
   * @param e
   */
  function changePanner(e: number) {
    audioManager.setPannerForAudio(track.audioId, e);
    setAudioPanner(e);
  }

  /**
   * @description Change Playback Rate
   * @param e emitted event
   */
  function changePitch(e: number) {
    setPitch(e);
  }

  /**
   * @description Change Playback Rate
   * @param e emitted event
   */
  function changePlaybackRate(e: number) {
    setPlaybackRate(e);
  }

  /**
   * @description Change Mixer value
   * @param e event details
   */
  function changeInput(e: React.KeyboardEvent<HTMLInputElement>) {
    const newMixerValue = parseInt((e.target as HTMLInputElement).value);
    audioManager.setMixerValue(track.audioId, newMixerValue);
    audioManager.rescheduleTrackFromScheduledNodes(track.trackDetail.scheduledKey);
    setAudioMixer(newMixerValue);
  }

  const { effects } = track;
  const isPolarityReversed = effects.includes(AudioTransformation.ReversePolarity);
  const isAudioReversed = effects.includes(AudioTransformation.Reverse);
  const isNormalized = effects.includes(AudioTransformation.Normalization);
  const isStereoSwapped = effects.includes(AudioTransformation.SwapStereo);

  return (
    <div className="flex flex-col justify-between h-full p-2" ref={divRef}>
      <div>
        <div className="mixer-details flex flex-row self-end">
          <div className="volume m-2 min-w-20 text-center">
            <Knob
              onKnobChange={changeVolume}
              pd={10}
              r={15}
              functionMapper={(e) => e * 1.5}
              value={audioVolume / 1.5}
              scrollDelta={0.01}
            />
            <label className="select-none">Vol: {Math.round(audioVolume * 100)}%</label>
          </div>
          <div className="panner m-2 min-w-20 text-center">
            <Knob
              onKnobChange={changePanner}
              pd={10}
              r={15}
              functionMapper={(e) => e * 2 - 1}
              value={(audioPanner + 1) / 2}
              scrollDelta={0.025}
            />
            <label className="select-none">Pan: {Math.round(audioPanner * 100) / 100}</label>
          </div>
          <div className="mixer-assign m-2 min-w-20 text-center flex flex-col content-center">
            <input
              type="number"
              placeholder="---"
              value={typeof audioMixer === 'number' ? audioMixer : undefined}
              className="block px-1 py-4 text-lg input rounded-md bg-slate-500 w-18 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={-1}
              max={audioManager.totalMixers}
              onInput={changeInput}
            />
            <label className="select-none">Mixer</label>
          </div>
        </div>
        <div className="flex flex-row mt-4">
          <div className="reversible-settings flex flex-row justify-between content-start p-1 m-1 border border-solid border-gray-700 w-full">
            <div className="flex flex-col w-full content-start">
              <div className="box w-full py-2">
                <Checkbox
                  checked={isPolarityReversed}
                  disabled={transformationInProgress}
                  onChange={transformPolarity}
                  label="Reverse Polarity"
                />
              </div>
              <div className="box w-full py-2">
                <Checkbox
                  checked={isAudioReversed}
                  disabled={transformationInProgress}
                  onChange={transformReverse}
                  label="Reverse"
                />
              </div>
            </div>
            <div className="flex flex-col w-full">
              <div className="box w-full py-2">
                <Checkbox
                  checked={isNormalized}
                  disabled={transformationInProgress}
                  onChange={normalize}
                  label="Normalize"
                />
              </div>
              <div className="box w-full py-2">
                <Checkbox
                  checked={isStereoSwapped}
                  disabled={transformationInProgress}
                  onChange={transformSwapStereo}
                  label="Swap Stereo"
                />
              </div>
            </div>
          </div>
          <div className="settings p-1 m-1 border border-solid border-gray-700 w-full">
            <div className="flex w-full content-start">
              <div className="box w-full inline-grid justify-items-center py-2">
                <Knob
                  r={16}
                  onKnobChange={setPitch}
                  onKnobRelease={changePitch}
                  scrollDelta={0.01}
                  value={(pitch - 0.5) / 1.5}
                  functionMapper={(e) => e * 1.5 + 0.5}
                  pd={8}
                />
                <label className="select-none">Pitch: { Math.round(pitch * 100) / 100 }</label>
              </div>
              <div className="box w-full inline-grid justify-items-center py-2">
                <Knob
                  r={16}
                  onKnobChange={setPlaybackRate}
                  onKnobRelease={changePlaybackRate}
                  scrollDelta={0.1}
                  value={playbackRate / 2}
                  functionMapper={(e) => e * 2}
                  pd={8}
                />
                <label className="select-none">Playback Rate: { Math.round(playbackRate * 100) / 100 }</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-slate-900">
        <WaveformSeekbar
          startOffsetInMillis={startOffsetInMicros / 1000}
          endOffsetInMillis={endOffsetInMicros / 1000}
          trackNumber={trackNumber}
          audioId={audioId}
          h={props.h * 1.5}
          w={props.w}
          timeUnitPerLineDistInSeconds={timePerUnitLineDistanceSecs}
          lineDist={lineDist}
          totalLines={totalLines}
          isPartial={isPartial}
        />
        <canvas
          ref={ref}
          width={props.w}
          height={props.h * 1.5}
        ></canvas>
      </div>
    </div>
  );
}
