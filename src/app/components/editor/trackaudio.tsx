import { audioManager } from "@/app/services/audiotrackmanager";
import { AudioDetails } from "@/app/state/audiostate";
import { AudioTrackDetails } from "@/app/state/trackdetails";
import { Waveform } from "@/assets/wave";
import React from "react";
import { Canvas } from "../shared/customcanvas";
import { css } from "@/app/services/utils";

export enum AudioTrackManipulationMode {
  None,
  Move,
  ResizeStart,
  ResizeEnd
}

interface TrackAudioProps {
  height: number,
  index: number,
  audioDetails: AudioTrackDetails,
  trackId: number,
  lineDist: number,
}

export function TrackAudio(props: React.PropsWithoutRef<TrackAudioProps>) {
  /// Refs
  const track = props.audioDetails;
  // const tracks = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails[props.trackId]);
  // const track = tracks[props.index]
  const spanRef = React.createRef<HTMLSpanElement>();
  const divRef = React.createRef<HTMLDivElement>();

  /// States
  const [mode, setMode] = React.useState(AudioTrackManipulationMode.Move);
  const [grab, setIsGrab] = React.useState(false);
  const [transformed, setTransformed] = React.useState(props.audioDetails.effects);
  // Variables
  // Track should exist
  const duration = track.buffer?.duration as number;
  const width = (duration / 5) * props.lineDist;

  React.useEffect(() => {
    if (divRef.current) {
      if (track.trackDetail.selected) {
        audioManager.addIntoSelectedAudioTracks(track, divRef.current);
      } else {
        audioManager.deleteFromSelectedAudioTracks(track.trackDetail.scheduledKey);
      }
    }
  }, [track.trackDetail.selected, props.lineDist]);

  React.useEffect(() => {
    if (divRef.current && spanRef.current) {
      setWidthAndScrollLeft(divRef.current, spanRef.current, track);
    }
  }, [track.trackDetail, props.lineDist]);

  function calculateLeft(track: AudioTrackDetails) {
    return (track.trackDetail.offsetInMillis / 5000) * props.lineDist;
  }

  function setGrab() {
    !grab && setIsGrab(true);
  }

  function unsetGrab() {
    grab && setIsGrab(false);
  }

  function applyStyles(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const target = (event.nativeEvent.target as HTMLElement);
    let pointerPosition = event.nativeEvent.offsetX;

    if (target === divRef.current) {
      pointerPosition = event.nativeEvent.offsetX;
    } else {
      if (divRef.current) {
        pointerPosition = event.nativeEvent.offsetX - divRef.current.scrollLeft;
      }
    }

    if (pointerPosition <= 10) {
      if (mode !== AudioTrackManipulationMode.ResizeStart) {
        setMode(AudioTrackManipulationMode.ResizeStart);
      }
    } else if (divRef.current && pointerPosition >= divRef.current.clientWidth - 10) {
      if (mode !== AudioTrackManipulationMode.ResizeEnd) {
        setMode(AudioTrackManipulationMode.ResizeEnd);
      }
    } else {
      if (mode !== AudioTrackManipulationMode.Move) {
        setMode(AudioTrackManipulationMode.Move);
      }
    }
  }

  function setWidthAndScrollLeft(
    divElement: HTMLDivElement,
    spanElement: HTMLSpanElement,
    track: AudioTrackDetails
  ) {
    const startOffsetMillis = track.trackDetail.startOffsetInMillis;
    const endOffsetMillis = track.trackDetail.endOffsetInMillis;

    // Start defines the invisible scroll, end defines the width of the current track.
    const leftScrollAmount = (startOffsetMillis / 5000) * props.lineDist;
    const endPointOfWidth = (endOffsetMillis / 5000) * props.lineDist;
    const totalWidth = endPointOfWidth - leftScrollAmount;

    divElement.style.width = totalWidth + 'px';
    spanElement.style.left = leftScrollAmount + 'px';
    divElement.scrollLeft = leftScrollAmount;
  }

  return (
    <div
      title={`Track: ${track.audioName}`}
      ref={divRef}
      data-audioid={props.index}
      data-trackid={props.trackId}
      data-selected={track.trackDetail.selected}
      onMouseMove={applyStyles}
      onMouseDown={setGrab}
      onMouseUp={unsetGrab}
      onMouseLeave={unsetGrab}
      className={css(
        "track-audio text-left overflow-x-hidden absolute rounded-sm bg-slate-900/80 data-[selected='true']:bg-red-950/80",
        mode === AudioTrackManipulationMode.ResizeEnd ? 'cursor-e-resize' : 
          (mode === AudioTrackManipulationMode.ResizeStart ? 'cursor-w-resize' : 
            (grab ? 'cursor-grabbing' : 'cursor-grab')),
      )}
      style={{left: calculateLeft(track)}}
    >
      <span
        ref={spanRef}
        data-selected={track.trackDetail.selected}
        className="text-sm relative block bg-blue-500 data-[selected='true']:bg-red-500 text-left text-white select-none text-ellipsis text-nowrap"
        style={{left: (divRef.current?.scrollLeft ?? 0) + 'px'}}
      >
        <Waveform color="#fff" w={22} h={22} vb="0 0 22 22" />
        {track.audioName}
      </span>
      <Canvas
        h={props.height - 22}
        w={width}
        image={renderAudioWaveform(track, width, props.height - 22)}
      />
    </div>
  );
}

export function renderAudioWaveform(data: AudioDetails, width: number, _height: number, force: boolean = false) {
  if (!force) {
    let offcanvas = audioManager.getOffscreenCanvasDrawn(data.audioId);

    if (offcanvas) {
      return offcanvas;
    }
  }

  const height = 200;
  let offcanvas = new OffscreenCanvas(width, height);
  const context = offcanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  const buffer = data.buffer as AudioBuffer;
 
  context.strokeStyle = '#ccc';
  context.fillStyle = '#fff0';
  context.beginPath();
  context.clearRect(0, 0, width, height);
  context.fillRect(0, 0, width, height);
  context.moveTo(0, height / 2);
  context.lineWidth = 2;

  const mul = 128;
  const channelData = buffer.getChannelData(0);

  let x = 0;
  const incr = (width / channelData.length) * mul;

  for (let index = 0; index < channelData.length; index += mul) {
    const normalizedValue = ((channelData[index] + 1) / 2.0) * height;
    context.lineTo(x, normalizedValue);
    x += incr;
  }

  context.stroke();
  audioManager.useManager().storeOffscreenCanvasDrawn(data.audioId, offcanvas);
  return offcanvas;
}
