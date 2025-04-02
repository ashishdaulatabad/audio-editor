import React from 'react';
import { css } from '@/app/services/utils';
import { FaBrush } from 'react-icons/fa';
import { FaPencil, FaScissors } from 'react-icons/fa6';
import { PiSelectionPlus } from 'react-icons/pi';

/**
 * @description Mode Type Selection.
 */
export enum ModeType {
  /**
   * @description Multiple Selecting Tracks for editing.
   */
  RegionSelect,
  /**
   * @description Slicer (or cutter) to split tracks in sections.
   */
  Slicer,
  /**
   * @description Default, useful for editing clips.
   */
  DefaultSelector,
  /**
   * @description Add multiple consecutive tracks. 
   * - [ ] To do: this thing.
   */
  Fill
}

interface ToolkitProps {
  activeMode: ModeType,
  onModeSelect: (mode: ModeType) => void
}

export function Toolkit(props: React.PropsWithoutRef<ToolkitProps>) {
  return (
    <div className="toolkit-container sticky bg-darker flex flex-row min-h-[62px] min-w-44 z-[11] border-t border-darker-2">
      <button
        className={css(
          "p-2 hover:bg-secondary w-full active:bg-darker-2 inline-grid content-center justify-items-center border border-solid rounded-sm transition-all ease-in-out box-content",
          props.activeMode === ModeType.Slicer ? 'bg-primary border-primary-2' : 'border-darker'
        )}
        onClick={() => props.onModeSelect(ModeType.Slicer)}
      ><FaScissors /></button>
      <button
        className={css(
          "p-2 hover:bg-secondary w-full active:bg-darker-2 inline-grid content-center justify-items-center border border-solid rounded-sm transition-all ease-in-out box-content",
          props.activeMode === ModeType.RegionSelect ? 'bg-primary border-primary-2' : 'border-darker'
        )}
        onClick={() => props.onModeSelect(ModeType.RegionSelect)}
      ><PiSelectionPlus /></button>
      <button 
        className={css(
          "p-2 hover:bg-secondary w-full border border-solid inline-grid content-center justify-items-center active:bg-darker-2 rounded-sm transition-all ease-in-out box-content",
          props.activeMode === ModeType.DefaultSelector ? 'bg-primary border-primary-2' : 'border-darker'
        )}
        onClick={() => props.onModeSelect(ModeType.DefaultSelector)}
      ><FaPencil /></button>
      <button 
        className={css(
          "p-2 hover:bg-secondary w-full border border-solid inline-grid content-center justify-items-center active:bg-darker-2 rounded-sm transition-all ease-in-out box-content",
          props.activeMode === ModeType.Fill ? 'bg-primary border-primary-2' : 'border-darker'
        )}
        onClick={() => props.onModeSelect(ModeType.Fill)}
      ><FaBrush /></button>
    </div>
  )
}