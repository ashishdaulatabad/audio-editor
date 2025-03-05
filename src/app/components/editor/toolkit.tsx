import { css } from "@/app/services/utils";
import React from "react";
import { FaBrush } from "react-icons/fa";
import { FaPencil, FaScissors } from "react-icons/fa6";
import { PiSelectionPlus } from "react-icons/pi";

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

/**
 * @description Creates Toolkit to easily edit the audio contents
 * @param props 
 * @returns 
 */
export function Toolkit(props: React.PropsWithoutRef<ToolkitProps>) {
  return (
    <div className="toolkit-container sticky bg-slate-800 flex flex-row min-h-[62px] min-w-44 z-[11] border-t border-slate-900">
      <button
        className={css(
          "p-2 hover:bg-slate-600 w-full active:bg-slate-900 inline-grid content-center justify-items-center border border-solid rounded-sm transition-all ease-in-out box-content",
          props.activeMode === ModeType.Slicer ? 'bg-slate-500 border-gray-400' : 'border-slate-800'
        )}
        onClick={() => props.onModeSelect(ModeType.Slicer)}
      ><FaScissors /></button>
      <button
        className={css(
          "p-2 hover:bg-slate-600 w-full active:bg-slate-900 inline-grid content-center justify-items-center border border-solid rounded-sm transition-all ease-in-out box-content",
          props.activeMode === ModeType.RegionSelect ? 'bg-slate-500 border-gray-400' : 'border-slate-800'
        )}
        onClick={() => props.onModeSelect(ModeType.RegionSelect)}
      ><PiSelectionPlus /></button>
      <button 
        className={css(
          "p-2 hover:bg-slate-600 w-full border border-solid inline-grid content-center justify-items-center active:bg-slate-900 rounded-sm transition-all ease-in-out box-content",
          props.activeMode === ModeType.DefaultSelector ? 'bg-slate-500 border-gray-400' : 'border-slate-800'
        )}
        onClick={() => props.onModeSelect(ModeType.DefaultSelector)}
      ><FaPencil /></button>
      <button 
        className={css(
          "p-2 hover:bg-slate-600 w-full border border-solid inline-grid content-center justify-items-center active:bg-slate-900 rounded-sm transition-all ease-in-out box-content",
          props.activeMode === ModeType.Fill ? 'bg-slate-500 border-gray-400' : 'border-slate-800'
        )}
        onClick={() => props.onModeSelect(ModeType.Fill)}
      ><FaBrush /></button>
    </div>
  )
}