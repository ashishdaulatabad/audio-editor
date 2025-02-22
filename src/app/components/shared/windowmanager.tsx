import { RootState } from "@/app/state/store";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { focusWindow, removeWindow, setWindowPosition, WindowView } from '../../state/windowstore';
import { Window } from "./window";

/**
 * Handles all the windowed fields that are needed to run this thing.
 * 
 * @returns WindowManager JSX
 */
export function WindowManager() {
  const windowStore = useSelector((state: RootState) => state.windowStoreReducer.contents);
  const dispatch = useDispatch();

  function close(symbol: symbol){
    dispatch(removeWindow(symbol))
  }

  function focusOnCurrentWindow(symbol: symbol) {
    dispatch(focusWindow(symbol));
  }

  function setPosition(top: number, left: number, index: number) {
    dispatch(setWindowPosition({ x: left, y: top, index }))
  }

  return (
    <>
      {windowStore.map((window: WindowView<any>, index: number) => {
        return (
          <Window
            key={index}
            w={window.w ?? 800}
            h={window.h ?? 600}
            x={window.x}
            y={window.y}
            onPositionChange={(top: number, left: number) => setPosition(top, left, index)}
            zLevel={index}
            header={typeof window.header === 'string' ? <>{window.header}</> : window.header}
            onClose={() => close(window.windowSymbol)}
            onClick={() => focusOnCurrentWindow(window.windowSymbol)}
          >
            <window.view key={index} {...window.props}></window.view>
          </Window>
        );
      })}
    </>
  )
}