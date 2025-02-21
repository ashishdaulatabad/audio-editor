import { audioManager } from "@/app/services/audiotrackmanager";
import { applyChangesToModifiedAudio, AudioTrackDetails } from "@/app/state/trackdetails";
import React from "react";
import { Checkbox } from "../checkbox";
import { transformAudio } from "@/app/services/audiotransform";
import { useDispatch } from "react-redux";
import { changeModifiedAudio } from "@/app/state/audiostate";
import { renderAudioWaveform } from "../editor/trackaudio";
import { AudioTransformation } from "@/app/services/interfaces";

interface WaveformEditorProps {
  track: AudioTrackDetails,
  w: number,
  h: number
}

/**
 * Creates the waveform editor for current `Audio` (distinction, `AudioTrack` and `Audio`)
 * changing here will affect all the instance of used `AudioTrack` throughout the project.
 * 
 * 
 * - [ ] To do: Figure out how the internal width and height will be set up:
 * should be handled by the parent element itself.
 * @param props 
 * @returns 
 */
export function AudioWaveformEditor(props: React.PropsWithoutRef<WaveformEditorProps>) {
  const ref = React.createRef<HTMLCanvasElement>();
  const divRef = React.createRef<HTMLDivElement>();
  const dispatch = useDispatch();

  React.useEffect(() => {
    /// Draw canvas
    if (ref.current && divRef.current) {
      const offcanvas = audioManager.getOffscreenCanvasDrawn(props.track.audioId);
      const context = ref.current.getContext('2d') as CanvasRenderingContext2D;
      context.fillRect(0, 0, offcanvas.width, offcanvas.height);
      context.drawImage(offcanvas, 0, 0, offcanvas.width, offcanvas.height, 0, 0, divRef.current.clientWidth - 10, ref.current.height);
    }
  });

  function transformPolarity() {
    transformAudio(props.track, AudioTransformation.ReversePolarity).then(data => {
      const canvas = audioManager.getOffscreenCanvasDrawn(props.track.audioId);
      renderAudioWaveform({ ...props.track, buffer: data }, canvas.width, canvas.height, true);

      dispatch(changeModifiedAudio({
        buffer: data,
        audioId: props.track.audioId,
        transformation: AudioTransformation.ReversePolarity
      }));

      dispatch(applyChangesToModifiedAudio({
        buffer: data,
        audioId: props.track.audioId,
        transformation: AudioTransformation.ReversePolarity
      }))
    });
  }

  function transformReverse() {
    transformAudio(
      props.track,
      AudioTransformation.Reverse
    ).then(data => {
      const canvas = audioManager.getOffscreenCanvasDrawn(props.track.audioId);
      renderAudioWaveform({ ...props.track, buffer: data}, canvas.width, canvas.height, true);

      dispatch(changeModifiedAudio({
        buffer: data,
        audioId: props.track.audioId,
        transformation: AudioTransformation.Reverse
      }));

      dispatch(applyChangesToModifiedAudio({
        buffer: data,
        audioId: props.track.audioId,
        transformation: AudioTransformation.Reverse
      }))
    });
  }

  function transformSwapStereo() {
    transformAudio(props.track, AudioTransformation.SwapStereo).then(data => {
      const canvas = audioManager.getOffscreenCanvasDrawn(props.track.audioId);
      renderAudioWaveform({ ...props.track, buffer: data}, canvas.width, canvas.height, true);

      dispatch(changeModifiedAudio({
        buffer: data,
        audioId: props.track.audioId,
        transformation: AudioTransformation.SwapStereo
      }));

      dispatch(applyChangesToModifiedAudio({
        buffer: data,
        audioId: props.track.audioId,
        transformation: AudioTransformation.SwapStereo
      }))
    });
  }

  function normalize() {
    transformAudio(props.track, AudioTransformation.Normalization).then(data => {
      const canvas = audioManager.getOffscreenCanvasDrawn(props.track.audioId);
      renderAudioWaveform({ ...props.track, buffer: data}, canvas.width, canvas.height, true);

      dispatch(changeModifiedAudio({
        buffer: data,
        audioId: props.track.audioId,
        transformation: AudioTransformation.Normalization
      }));

      dispatch(applyChangesToModifiedAudio({
        buffer: data,
        audioId: props.track.audioId,
        transformation: AudioTransformation.Normalization
      }))
    });
  }

  return (
    <>
      <div className="flex flex-col justify-between h-full p-2" ref={divRef}>
        <div className="flex flex-row">
          <div className="settings flex flex-row justify-between content-start p-1 m-1 border border-solid border-gray-700 w-full">
            <div className="flex flex-col w-full content-start">
              <div className="box w-full py-1">
                <Checkbox
                  checked={props.track.effects.indexOf(AudioTransformation.ReversePolarity) > -1}
                  onChange={transformPolarity}
                  label="Reverse Polarity"
                />
              </div>
              <div className="box w-full py-1">
                <Checkbox
                  checked={props.track.effects.indexOf(AudioTransformation.Reverse) > -1}
                  onChange={transformReverse}
                  label="Reverse"
                />
              </div>
              <div className="box w-full py-1">
                <Checkbox
                  checked={props.track.effects.indexOf(AudioTransformation.SwapStereo) > -1}
                  onChange={transformSwapStereo}
                  label="Swap Stereo"
                />
              </div>
            </div>
            <div className="flex flex-col w-full">
              <div className="box w-full py-1">
                <Checkbox
                  checked={props.track.effects.indexOf(AudioTransformation.Normalization) > -1}
                  onChange={normalize}
                  label="Normalize"
                />
              </div>
            </div>
          </div>
          <div className="settings p-1 m-1 border border-solid border-gray-700 w-full">

          </div>
        </div>
        <div className="bg-slate-900">
          <canvas
            ref={ref}
            width={props.w}
            height={props.h * 1.5}
          ></canvas>
        </div>
      </div>
    </>
  );
}
