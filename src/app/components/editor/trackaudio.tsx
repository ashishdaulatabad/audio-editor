import React from 'react';
import { audioManager } from '@/app/services/audiotrackmanager';
import { addAudio, AudioDetails } from '@/app/state/audiostate';
import { AudioTrackDetails, deleteAudioFromTrack } from '@/app/state/trackdetails';
import { Waveform } from '@/assets/wave';
import { Canvas } from '../shared/customcanvas';
import { css } from '@/app/services/utils';
import { ContextMenuContext } from '@/app/providers/contextmenu';
import { FaCog, FaRegFileAudio, FaTrash } from 'react-icons/fa';
import { createAudioSample } from '@/app/services/audiotransform';
import { randomColor } from '@/app/services/color';
import { useDispatch } from 'react-redux';
import { FaRepeat } from 'react-icons/fa6';
import { addWindow } from '@/app/state/windowstore';
import { AudioWaveformEditor } from '../waveform/waveform';

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
  audioDetails: AudioTrackDetails
  trackId: number
  lineDist: number
}

export function TrackAudio(props: React.PropsWithoutRef<TrackAudioProps>) {
  /// Refs
  const track = props.audioDetails;
  // const tracks = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails[props.trackId]);
  // const track = tracks[props.index]
  const spanRef = React.createRef<HTMLSpanElement>();
  const divRef = React.createRef<HTMLDivElement>();
  const dispatch = useDispatch();

  /// States
  const [mode, setMode] = React.useState(AudioTrackManipulationMode.Move);
  const [grab, setIsGrab] = React.useState(false);

  // Variables
  // Track should exist
  const duration = track.buffer?.duration as number;
  const width = (duration / 5) * props.lineDist;

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
    }
  }, [track.trackDetail.selected, props.lineDist]);

  React.useEffect(() => {
  }, [track.effects]);

  React.useEffect(() => {
    if (divRef.current && spanRef.current) {
      setWidthAndScrollLeft(divRef.current, spanRef.current, track);
    }
  }, [track.trackDetail, props.lineDist]);

  function calculateLeft(track: AudioTrackDetails) {
    return (track.trackDetail.offsetInMillis / 5000) * props.lineDist;
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

  function handleNewSampleCreation(track: AudioTrackDetails) {
    createAudioSample(track).then(data => {
      const audioId = Symbol();

      dispatch(addAudio({
        audioId,
        audioName: track.audioName,
        buffer: data,
        colorAnnotation: randomColor(),
        effects: []
      }));
      hideContextMenu();
    });
  }

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
            dispatch(addWindow({
              header: <><b>Track</b>: {track.audioName}</>,
              props: {
                trackNumber: props.trackId,
                audioId: props.index,
                w: 780,
                h: 100,
              },
              windowSymbol: Symbol(),
              view: AudioWaveformEditor,
              x: 0,
              y: 0,
              visible: true,
              propsUniqueIdentifier: track.trackDetail.scheduledKey
            }));
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

export function renderAudioWaveform(data: AudioDetails, lineDist: number, unitTime: number, force: boolean = false) {
  if (!force) {
    let offcanvas = audioManager.getOffscreenCanvasDrawn(data.audioId);

    if (offcanvas) {
      return offcanvas;
    }
  }

  const time = data.buffer?.duration as number;
  const width = Math.max((time / unitTime) * lineDist, 800);
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
  context.lineWidth = 3;

  const mul = Math.min(128);
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
