import React from 'react';
import { ContextItem, ContextMenuContext } from '@/app/providers/contextmenu';
import { Knob } from '../knob';
import { FaTimes } from 'react-icons/fa';

export type AutomatedKnobProps = {
  r: number
  audioParam: AudioParam
  onChange?: (value: number) => void
  onRelease?: (value: number) => void
  scrollDelta?: number
  value?: number
}

export function AutomatedKnob(props: React.PropsWithoutRef<AutomatedKnobProps>) {
  const { audioParam } = props;

  const {
    minValue,
    maxValue
  } = audioParam;

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
    // {
    //   name: 'Create Automation',
    //   // icon: <FaP
    // }
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
      return;
    }

    // showContextMenu();
  }

  return (
    <div
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
        // functionMapper={}
      />
    </div>
  );
}
