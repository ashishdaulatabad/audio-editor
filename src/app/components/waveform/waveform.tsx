import React from "react";

import { audioManager } from "@/app/services/audiotrackmanager";
import { applyChangesToModifiedAudio, AudioTrackDetails } from "@/app/state/trackdetails";
import { Checkbox } from "../checkbox";
import { transformAudio } from "@/app/services/audiotransform";
import { useDispatch } from "react-redux";
import { applyTransformationToAudio } from "@/app/state/audiostate";
import { renderAudioWaveform } from "../editor/trackaudio";
import { AudioTransformation } from "@/app/services/interfaces";
import { Knob } from "../knob";

interface WaveformEditorProps {
  track: AudioTrackDetails
  w: number
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

  // States
  const [transformationInProgress, setTransformationInProgress] = React.useState(false);
  const [pitch, setPitch] = React.useState(1);

  React.useEffect(() => {
    /// Draw canvas
    if (ref.current && divRef.current) {
      const offcanvas = audioManager.getOffscreenCanvasDrawn(props.track.audioId);
      const context = ref.current.getContext('2d') as CanvasRenderingContext2D;
      context.clearRect(0, 0, ref.current.width, ref.current.height);
      context.drawImage(offcanvas, 0, 0, offcanvas.width, offcanvas.height, 0, 0, divRef.current.clientWidth, ref.current.height);
    }
  });

  function transform(transformation: AudioTransformation) {
    setTransformationInProgress(true);
    transformAudio(
      props.track,
      transformation
    ).then(data => {
      renderAudioWaveform({ ...props.track, buffer: data }, 200, 5, true);

      dispatch(applyTransformationToAudio({
        buffer: data,
        audioId: props.track.audioId,
        transformation
      }));

      dispatch(applyChangesToModifiedAudio({
        buffer: data,
        audioId: props.track.audioId,
        transformation
      }))

      audioManager.rescheduleTrackFromScheduledNodes({
        ...props.track,
        buffer: data,
      });

      setTransformationInProgress(false);
    });
  }

  function transformPolarity() {
    transform(AudioTransformation.ReversePolarity);
  }

  function transformReverse() {
    transform(AudioTransformation.Reverse);
  }

  function transformSwapStereo() {
    transform(AudioTransformation.SwapStereo)
  }

  function normalize() {
    transform(AudioTransformation.Normalization);
  }

  return (
    <>
      <div className="flex flex-col justify-between h-full p-2" ref={divRef}>
        <div className="">
          <div className="flex flex-row mt-4">
            <div className="settings flex flex-row justify-between content-start p-1 m-1 border border-solid border-gray-700 w-full">
              <div className="flex flex-col w-full content-start">
                <div className="box w-full py-1">
                  <Checkbox
                    checked={props.track.effects.indexOf(AudioTransformation.ReversePolarity) > -1}
                    disabled={transformationInProgress}
                    onChange={transformPolarity}
                    label="Reverse Polarity"
                  />
                </div>
                <div className="box w-full py-1">
                  <Checkbox
                    checked={props.track.effects.indexOf(AudioTransformation.Reverse) > -1}
                    disabled={transformationInProgress}
                    onChange={transformReverse}
                    label="Reverse"
                  />
                </div>
                <div className="box w-full py-1">
                  <Checkbox
                    checked={props.track.effects.indexOf(AudioTransformation.SwapStereo) > -1}
                    disabled={transformationInProgress}
                    onChange={transformSwapStereo}
                    label="Swap Stereo"
                  />
                </div>
              </div>
              <div className="flex flex-col w-full">
                <div className="box w-full py-1">
                  <Checkbox
                    checked={props.track.effects.indexOf(AudioTransformation.Normalization) > -1}
                    disabled={transformationInProgress}
                    onChange={normalize}
                    label="Normalize"
                  />
                </div>
              </div>
            </div>
            <div className="settings p-1 m-1 border border-solid border-gray-700 w-full">
            <div className="flex w-full content-start">
                <div className="box w-full inline-grid justify-items-center py-1">
                  <Knob
                    r={16}
                    onKnobChange={(e) => console.log(e)}
                    scrollDelta={0.1}
                    value={1}
                    pd={8}
                  />
                  <label>Pitch</label>
                </div>
                <div className="box w-full inline-grid justify-items-center py-1">
                  <Knob
                    r={16}
                    onKnobChange={(e) => console.log(e)}
                    scrollDelta={0.1}
                    value={1}
                    pd={8}
                  />
                  <label>Playback Rate</label>
                </div>
                {/* <div className="box w-full py-1">
                  
                </div> */}
              </div>
            </div>
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
