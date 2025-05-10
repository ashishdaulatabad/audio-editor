import React from 'react';
import { audioManager } from '@/app/services/audiotrackmanager';
import { addIntoAudioBank, AudioDetails } from '@/app/state/audiostate';
import { Waveform } from '@/assets/wave';
import { Canvas } from '../shared/customcanvas';
import { css } from '@/app/services/utils';
import { ContextMenuContext } from '@/app/providers/contextmenu';
import { FaCog, FaRegFileAudio, FaTrash } from 'react-icons/fa';
import { createAudioSample } from '@/app/services/audiotransform';
import { getRandomWindowId, randomColor } from '@/app/services/random';
import { useDispatch } from 'react-redux';
import { FaRepeat } from 'react-icons/fa6';
import { addWindowToAction } from '@/app/state/windowstore';
import { AudioWaveformEditor } from '../waveform/waveform';
import { clamp } from '@/app/utils';

import {
  AudioTrackDetails,
  deleteAudioFromTrack,
  SEC_TO_MICROSEC
} from '@/app/state/trackdetails/trackdetails';

/**
 * @description Mode for detecting current manipulation mode via user mouse.
 */
export enum AudioTrackManipulationMode {
  /**
   * @description No manipulation
   */
  None,
  /**
   * @description Moving track
   */
  Move,
  /**
   * @description Resizing from start.
   */
  ResizeStart,
  /**
   * @description Resizing from end.
   */
  ResizeEnd
}

interface TrackAudioProps {
  height: number
  index: number
  timeUnitPerLineDistanceSecs: number
  audioDetails: AudioTrackDetails
  trackId: number
  lineDist: number
}

export function TrackAudio(props: React.PropsWithoutRef<TrackAudioProps>) {
  const track = props.audioDetails;

  /// Refs
  const spanRef = React.createRef<HTMLSpanElement>();
  const divRef = React.createRef<HTMLDivElement>();
  const dispatch = useDispatch();

  /// States
  const [mode, setMode] = React.useState(AudioTrackManipulationMode.Move);
  const [grab, setIsGrab] = React.useState(false);

  // Variables
  // Track should exist
  const duration = track.duration as number;
  const timeUnit = props.timeUnitPerLineDistanceSecs;
  const width = (duration / timeUnit) * props.lineDist;
  const timeUnitMicros = timeUnit * SEC_TO_MICROSEC;

  const {
    hideContextMenu,
    showContextMenu,
    isContextOpen
  } = React.useContext(ContextMenuContext);

  React.useEffect(() => {
    if (divRef.current) {
      if (track.trackDetail.selected) {
        audioManager.addIntoSelectedAudioTracks(track, divRef.current);
      } else {
        audioManager.deleteFromSelectedAudioTracks(track.trackDetail.scheduledKey);
      }

      if (spanRef.current) {
        setWidthAndScrollLeft(divRef.current, spanRef.current, track);
      }
    }

    return () => {
      if (track.trackDetail.selected) {
        audioManager.deleteFromSelectedAudioTracks(track.trackDetail.scheduledKey);
      }
    }
  }, [track.trackDetail, track.trackDetail.selected, props.lineDist]);


  function calculateLeft(track: AudioTrackDetails) {
    return (track.trackDetail.offsetInMicros / timeUnitMicros) * props.lineDist;
  }

  function setGrab(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (!(event.target as HTMLElement).classList.contains('wave-icon')) {
      hideContextMenu();
      !grab && setIsGrab(true);
    }
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

    if (pointerPosition <= 5) {
      if (mode !== AudioTrackManipulationMode.ResizeStart) {
        setMode(AudioTrackManipulationMode.ResizeStart);
      }
    } else if (divRef.current && pointerPosition >= divRef.current.clientWidth - 5) {
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
    const startOffsetMicros = track.trackDetail.startOffsetInMicros;
    const endOffsetMicros = track.trackDetail.endOffsetInMicros;
    const timeUnitMicros = timeUnit * SEC_TO_MICROSEC;

    // Start defines the invisible scroll, end defines the width of the current track.
    const leftScrollAmount = (startOffsetMicros / timeUnitMicros) * props.lineDist;
    const endPointOfWidth = (endOffsetMicros / timeUnitMicros) * props.lineDist;
    const totalWidth = endPointOfWidth - leftScrollAmount;

    divElement.style.width = totalWidth + 'px';
    spanElement.style.left = leftScrollAmount + 'px';
    divElement.scrollLeft = leftScrollAmount;
  }

  function handleNewSampleCreation(track: AudioTrackDetails) {
    createAudioSample(track, audioManager.getAudioBuffer(track.audioId) as AudioBuffer).then(data => {
      const newTrackDetails = {
        audioName: track.audioName,
        duration: data.duration,
        colorAnnotation: randomColor(),
        mixerNumber: 0,
        effects: []
      };
      const audioId = audioManager.registerAudioInAudioBank(newTrackDetails, data);

      dispatch(addIntoAudioBank({
        ...newTrackDetails,
        audioId,
      }));
      hideContextMenu();
    });
  }

  /**
   * @todo: this.
   */
  function handleDuplicateSamplesCreation(event: React.MouseEvent<HTMLSpanElement, MouseEvent>) {
    hideContextMenu();
  }

  function contextMenu(event: React.MouseEvent<HTMLSpanElement, MouseEvent>) {
    if (!isContextOpen()) {
      showContextMenu([
        {
          name: `Repeat this Sample and attach back`,
          icon: <FaRepeat />,
          onSelect: () => handleDuplicateSamplesCreation(event),
        },
        {
          name: `Create New Sample`,
          icon: <FaRegFileAudio />,
          onSelect: () => handleNewSampleCreation(track),
        },
        {
          name: 'Delete',
          icon: <FaTrash />,
          onSelect: () => {
            dispatch(deleteAudioFromTrack({
              trackNumber: props.trackId,
              audioIndex: props.index 
            }));
            hideContextMenu();
          },
        },
        {
          name: 'Edit',
          icon: <FaCog />,
          onSelect: () => {
            addWindowToAction(
              dispatch, 
              {
                header: <><b>Track</b>: {track.audioName}</>,
                props: {
                  trackNumber: props.trackId,
                  timePerUnitLineDistanceSecs: props.timeUnitPerLineDistanceSecs,
                  audioId: props.index,
                  w: 780,
                  h: 100,
                },
                windowSymbol: Symbol(),
                view: AudioWaveformEditor,
                x: 0,
                y: 0,
                visible: true,
                propsUniqueIdentifier: track.trackDetail.scheduledKey,
                windowId: getRandomWindowId(),
              }
            );
            hideContextMenu();
          },
        },
      ], event.nativeEvent.clientX, event.nativeEvent.clientY);
    } else {
      hideContextMenu();
    }
  }

  return (
    <div
      title={`Track: ${track.audioName}`}
      ref={divRef}
      data-id={track.trackDetail.id}
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
      <div
        className="data-[selected='true']:bg-red-500 w-full"
        style={{ background: track.trackDetail.selected ? 'rgb(239 68 68)' : props.audioDetails.colorAnnotation, width: width + 'px' }}
      >
        <span
          ref={spanRef}
          className="text-sm relative text-left text-white select-none max-w-full block overflow-hidden text-ellipsis text-nowrap"
          style={{left: (divRef.current?.scrollLeft ?? 0) + 'px'}}
        >
          <span onClick={contextMenu} className="wave-icon cursor-pointer">
            <Waveform color="#fff" w={22} h={22} vb="0 0 22 22" />
          </span>
          {track.audioName}
        </span>
      </div>
      <Canvas
        h={props.height - 22}
        w={width}
        image={renderAudioWaveform(track, 200, 5, false)}
      />
    </div>
  );
}

export function renderAudioWaveform(
  data: AudioDetails,
  lineDist: number,
  unitTime: number,
  force: boolean = false
) {
  if (!force) {
    let offcanvas = audioManager.getOffscreenCanvasDrawn(data.audioId);

    if (offcanvas) {
      return offcanvas;
    }
  }

  const time = data.duration as number;
  const width = Math.max((time / unitTime) * lineDist, 800);
  const height = 200;
  let offcanvas = new OffscreenCanvas(width, height);
  const context = offcanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  const buffer = audioManager.getAudioBuffer(data.audioId) as AudioBuffer;
 
  context.strokeStyle = '#111';
  context.fillStyle = data.colorAnnotation + 'DD';
  context.beginPath();
  context.clearRect(0, 0, width, height);
  context.fillRect(0, 0, width, height);
  context.moveTo(0, height / 2);
  context.lineWidth = 3;

  const proportionalIncrement = Math.ceil((128 * width) / 800);

  const mul = clamp(proportionalIncrement, 1, 128);

  const heightPerChannel = height / buffer.numberOfChannels;

  // Assuming that total channels are two.
  for (let channel = 0, vertical = 0; channel < buffer.numberOfChannels; ++channel, vertical += heightPerChannel) {
    const channelData = buffer.getChannelData(channel);
    context.moveTo(0, (1 / 2.0) * heightPerChannel + vertical)

    let x = 0;
    const incr = (width / channelData.length) * mul;

    for (let index = 0; index < channelData.length; index += mul) {
      const normalizedValue = ((channelData[index] + 1) / 2.0) * heightPerChannel + vertical;
      context.lineTo(x, normalizedValue);
      x += incr;
    }
  }

  context.stroke();
  audioManager.useManager().storeOffscreenCanvasDrawn(data.audioId, offcanvas);
  return offcanvas;
}
