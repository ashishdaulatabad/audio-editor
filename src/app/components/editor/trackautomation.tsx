import React from 'react';
import {useDispatch} from 'react-redux';
import {AudioTrackManipulationMode} from './trackaudio';
import {ContextMenuContext} from '@/app/providers/contextmenu';
import {SEC_TO_MICROSEC} from '@/app/state/trackdetails/trackdetails';
import {Waveform} from '@/assets/wave';
import {css} from '@/app/services/utils';
import {ScheduledTrackAutomation} from '@/app/state/trackdetails/trackautomation';
import {SVGXMLNS} from '@/app/utils';

export interface TrackAutomationProps {
  index: number
  height: number
  trackId: number
  lineDist: number
  timeUnitPerLineDistanceSecs: number
  automation: ScheduledTrackAutomation
}

export function TrackAutomation(
  props: React.PropsWithoutRef<TrackAutomationProps>
) {
  // refs
  const spanRef = React.createRef<HTMLSpanElement>();
  const divRef = React.createRef<HTMLDivElement>();
  const dispatch = useDispatch();

  const {automation, lineDist, height} = props;
  const actualHeight = height - 22;

  /// States
  const [mode, setMode] = React.useState(AudioTrackManipulationMode.Move);
  const [grab, setIsGrab] = React.useState(false);

  const duration = (automation.endOffsetMicros - automation.startOffsetMicros) / SEC_TO_MICROSEC;
  const timeUnit = props.timeUnitPerLineDistanceSecs;
  const width = (duration / timeUnit) * lineDist;
  const timeUnitMicros = timeUnit * SEC_TO_MICROSEC;

  const startPoint = automation.points[0];

  const timeData = automation.points.slice(1).reduce((previousValue, currentValue) => {
    const offset = (currentValue.time / timeUnit) * lineDist;
    return previousValue + `L ${offset} ${currentValue.value * actualHeight}`
  }, `M 0 ${startPoint.value / actualHeight}`);

  const {
    hideContextMenu,
    showContextMenu,
    isContextOpen
  } = React.useContext(ContextMenuContext);

  React.useEffect(() => {
    if (divRef.current) {
      // if (automation.selected) {
      //   audioManager.addIntoSelectedAudioTracks(automation, divRef.current);
      // } else {
      //   audioManager.deleteFromSelectedAudioTracks(automation.scheduledKey);
      // }

      if (spanRef.current) {
        setWidthAndScrollLeft(divRef.current, spanRef.current, automation);
      }
    }

    return () => {
      if (automation.selected) {
        // audioManager.deleteFromSelectedAudioTracks(track.trackDetail.scheduledKey);
      }
    }
  }, [automation.selected, props.lineDist]);


  function setWidthAndScrollLeft(
    divElement: HTMLDivElement,
    spanElement: HTMLSpanElement,
    track: ScheduledTrackAutomation
  ) {
    const startOffsetMicros = track.startOffsetMicros;
    const endOffsetMicros = track.endOffsetMicros;
    const timeUnitMicros = timeUnit * SEC_TO_MICROSEC;

    // Start defines the invisible scroll, end defines the width 
    // of the current track.
    const leftScrollAmount = (startOffsetMicros / timeUnitMicros) * lineDist;
    const endPointOfWidth = (endOffsetMicros / timeUnitMicros) * lineDist;
    const totalWidth = endPointOfWidth - leftScrollAmount;

    divElement.style.width = totalWidth + 'px';
    spanElement.style.left = leftScrollAmount + 'px';
    divElement.scrollLeft = leftScrollAmount;
  }

  function calculateLeft(track: ScheduledTrackAutomation) {
    return (track.offsetMicros / timeUnitMicros) * lineDist;
  }

  function setGrab(event: React.MouseEvent<HTMLDivElement>) {
    if (!(event.target as HTMLElement).classList.contains('wave-icon')) {
      hideContextMenu();
      !grab && setIsGrab(true);
    }
  }

  function unsetGrab() {
    grab && setIsGrab(false);
  }

  function applyStyles(event: React.MouseEvent<HTMLDivElement>) {
    const target = (event.nativeEvent.target as HTMLElement);
    const {offsetX} = event.nativeEvent;

    let pointerPosition = offsetX;

    if (target === divRef.current) {
      pointerPosition = offsetX;
    } else {
      if (divRef.current) {
        pointerPosition = offsetX - divRef.current.scrollLeft;
      }
    }

    if (pointerPosition <= 5) {
      if (mode !== AudioTrackManipulationMode.ResizeStart) {
        setMode(AudioTrackManipulationMode.ResizeStart);
      }
    } else if (
      divRef.current && 
      pointerPosition >= divRef.current.clientWidth - 5
    ) {
      if (mode !== AudioTrackManipulationMode.ResizeEnd) {
        setMode(AudioTrackManipulationMode.ResizeEnd);
      }
    } else {
      if (mode !== AudioTrackManipulationMode.Move) {
        setMode(AudioTrackManipulationMode.Move);
      }
    }
  }

  return (
    <div
      title={'Automation'}
      ref={divRef}
      data-id={props.trackId}
      data-audioid={props.index}
      data-trackid={props.trackId}
      data-selected={automation.selected}
      onMouseMove={applyStyles}
      onMouseDown={setGrab}
      onMouseUp={unsetGrab}
      onMouseLeave={unsetGrab}
      className={css(
        "track-automation text-left overflow-x-hidden absolute rounded-sm bg-slate-900/80 data-[selected='true']:bg-red-950/80",
        mode === AudioTrackManipulationMode.ResizeEnd ? 'cursor-e-resize' : 
          (mode === AudioTrackManipulationMode.ResizeStart ? 'cursor-w-resize' : 
            (grab ? 'cursor-grabbing' : 'cursor-grab')),
      )}
      style={{left: calculateLeft(automation)}}
    >
      <div
        className="data-[selected='true']:bg-red-500 w-full"
        style={{
          background: automation.selected ? 
            'rgb(239 68 68)' : 
            automation.colorAnnotation, 
          width: width + 'px'
        }}
      >
        <span
          ref={spanRef}
          className="text-sm relative text-left text-white select-none max-w-full block overflow-hidden text-ellipsis text-nowrap"
          style={{left: (divRef.current?.scrollLeft ?? 0) + 'px'}}
        >
          <span
            // onClick={contextMenu}
            className="wave-icon cursor-pointer"
          >
            <Waveform color="#fff" w={22} h={22} vb="0 0 22 22" />
          </span>
            Automation
        </span>
      </div>
      <div style={{height: actualHeight}}>
        <svg xmlns={SVGXMLNS} height={actualHeight}>
          <path
            d={timeData}
            height={actualHeight}
            fill={automation.colorAnnotation}
            stroke={automation.colorAnnotation}
          ></path>
        </svg>
      </div>
    </div>
  );
}
