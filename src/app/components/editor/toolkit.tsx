import React from 'react';
import { css } from '@/app/services/utils';
import { FaBrush } from 'react-icons/fa';
import { FaPencil, FaScissors } from 'react-icons/fa6';
import { PiSelectionPlus } from 'react-icons/pi';
import { SimpleDropdown } from '../shared/dropdown/dropdown';
import { TimeframeMode } from '../player/player';

/**
 * @description Mode Type Selection.
 */
export enum ModeType {
  RegionSelect,
  Slicer,
  DefaultSelector,
  Fill
}

interface ToolkitProps {
  activeMode: ModeType,
  onModeSelect: (mode: ModeType) => void
}

export function Toolkit(props: React.PropsWithoutRef<ToolkitProps>) {
  const themeOptions: {
    label: string,
    value: string
  }[] = [
    {
      label: 'Default',
      value: 'default'
    },
    {
      label: 'Blue',
      value: 'blueacc'
    },
    {
      label: 'Red',
      value: 'redacc'
    },
    {
      label: 'Magenta',
      value: 'magentaacc'
    },
  ];

  const timeframeModeOptions = [
    {
      label: 'Time',
      value: TimeframeMode.Time,
    },
    {
      label: 'Tempo',
      value: TimeframeMode.Beat
    }
  ];

  function onThemeSelect(e: any) {
    document.body.setAttribute('data-theme', e);
  }

  function setTimeframeModeValue(value: any) {
    // setTimeframeModeValue
  }

  return (
    <>
      <div className="toolkit-container sticky bg-darker flex flex-row min-w-44 z-[11] border-t border-darker-2">
        <button
          className={css(
            "p-1 px-4 hover:bg-secondary active:bg-darker-2 inline-grid content-center justify-items-center border border-solid rounded-sm transition-all ease-in-out box-content",
            props.activeMode === ModeType.Slicer ? 'bg-primary border-primary-2' : 'border-darker'
          )}
          onClick={() => props.onModeSelect(ModeType.Slicer)}
        ><FaScissors /></button>
        <button
          className={css(
            "p-1 px-4 hover:bg-secondary active:bg-darker-2 inline-grid content-center justify-items-center border border-solid rounded-sm transition-all ease-in-out box-content",
            props.activeMode === ModeType.RegionSelect ? 'bg-primary border-primary-2' : 'border-darker'
          )}
          onClick={() => props.onModeSelect(ModeType.RegionSelect)}
        ><PiSelectionPlus /></button>
        <button 
          className={css(
            "p-1 px-4 hover:bg-secondary border border-solid inline-grid content-center justify-items-center active:bg-darker-2 rounded-sm transition-all ease-in-out box-content",
            props.activeMode === ModeType.DefaultSelector ? 'bg-primary border-primary-2' : 'border-darker'
          )}
          onClick={() => props.onModeSelect(ModeType.DefaultSelector)}
        ><FaPencil /></button>
        <button 
          className={css(
            "p-1 px-4 hover:bg-secondary border border-solid inline-grid content-center justify-items-center active:bg-darker-2 rounded-sm transition-all ease-in-out box-content",
            props.activeMode === ModeType.Fill ? 'bg-primary border-primary-2' : 'border-darker'
          )}
          onClick={() => props.onModeSelect(ModeType.Fill)}
        ><FaBrush /></button>
        <div className="h-full">
          <SimpleDropdown
            placeholder="SS"
            label={(item) => <>{item.label}</>}
            list={timeframeModeOptions}
            onSelect={setTimeframeModeValue}
          ></SimpleDropdown>
        </div>
        <div className="min-h-full">
          <SimpleDropdown
            placeholder="Select Theme"
            label={(item) => <>{item.label}</>}
            list={themeOptions}
            onSelect={onThemeSelect}
          ></SimpleDropdown>
        </div>
      </div>
    </>
  )
}
