import React from 'react';
import {ContextItem, ContextMenuContext} from '@/app/providers/contextmenu';
import {Knob} from '../knob';
import {FaTimes} from 'react-icons/fa';
import {useDispatch} from 'react-redux';
import { createAutomation } from '@/app/state/trackdetails/trackdetails';

export type AutomatedKnobProps = {
  r: number
  audioParam: AudioParam
  onChange?: (value: number) => void
  onRelease?: (value: number) => void
  scrollDelta?: number
  value?: number
}

export function AutomatedKnob(props: React.PropsWithoutRef<AutomatedKnobProps>) {
  const {audioParam} = props;

  const dispatch = useDispatch();

  const {minValue, maxValue} = audioParam;

  // To scale from [0, 1] to [min-max]
  function functionMapper(value: number) {
    return minValue + (maxValue - minValue) * value;
  }

  // Make a context menu that supports automation.
  const contextMenuOptions: ContextItem[] = [
    {
      name: 'Cancel Automation',
      icon: <FaTimes />,
      onSelect: () => console.log('Removing automation')
    },
    {
      name: 'Create Automation',
      onSelect: () => {
        // Add automation to the track as well as audio manager.
        dispatch(createAutomation({
          aParam: audioParam,
          aParamDesc: ''
        }))
      }
    }
  ];

  const {
    showContextMenu,
    hideContextMenu,
    isContextOpen
  } = React.useContext(ContextMenuContext);

  function openContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    
    if (isContextOpen()) {
      hideContextMenu();
    }

    const {clientX, clientY} = event.nativeEvent;
    console.log(clientX, clientY);
    showContextMenu(contextMenuOptions, clientX, clientY);
  }

  console.log('here');

  return (
    <div
      className="automated-knob"
      onContextMenu={openContextMenu}
    >
      <Knob
        pd={10}
        r={props.r}
        functionMapper={functionMapper}
        onKnobChange={props.onChange}
        onKnobRelease={props.onRelease}
        scrollDelta={props.scrollDelta || 0.05}
        value={props.value}
      />
    </div>
  );
}
