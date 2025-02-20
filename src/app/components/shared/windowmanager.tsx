import { RootState } from "@/app/state/store";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { focusWindow, removeWindow, WindowView } from '../../state/windowstore';
import { Window } from "./window";

/**
 * Handles all the windowed fields that are needed to run this thing.
 * 
 * @returns WindowManager JSX
 */
export function WindowManager() {
  const windowStore = useSelector((state: RootState) => state.windowStoreReducer);
  const dispatch = useDispatch();

  function close(symbol: symbol){
    dispatch(removeWindow(symbol))
  }

  function focusOnCurrentWindow(symbol: symbol) {
    dispatch(focusWindow(symbol));
  }

  /// Manager
  /// Registry should happen on the editor side.
  /// Deletion, updation can happen here.
  return (
    <>
      {windowStore.contents.map((window: WindowView<any>, index: number) => {
        return (
          <Window
            key={index}
            w={window.w ?? 800}
            h={window.h ?? 600}
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