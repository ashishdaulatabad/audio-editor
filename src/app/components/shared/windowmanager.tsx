import React from 'react';
import { RootState } from '@/app/state/store';
import { useDispatch, useSelector } from 'react-redux';
import { focusWindow, removeWindow, setWindowPosition, WindowView } from '../../state/windowstore';
import { Window } from './window';
import { FaWindowMaximize } from 'react-icons/fa';
import { css } from '@/app/services/utils';
import { Exit } from '@/assets/exit';

/**
 * @description Window Manager Tab that handles opened windows.
 */
function WindowManagerTab(props: React.PropsWithoutRef<{
  title: string | React.JSX.Element
  index: number
  onClick: (index: number) => void
  onClose: (index: number) => void
}>) {
  return (
    <>
      <div 
        className={css(
          "px-2 window-header min-w-max min-h-full flex items-center contents-center cursor-pointer border border-solid select-none",
          props.index === 0 ? 'border-slate-500' : 'border-slate-800'
        )}
        onClick={() => props.onClick(props.index)}
      >
        <FaWindowMaximize />
        <span className="ml-4 py-1">{props.title}</span>
        <span
          className="ml-4 py-1 hover:bg-slate-600"
          onClick={() => props.onClose(props.index)}
        >
          <Exit fill="#CC6545" h={10} w={10} />
        </span>
      </div>
    </>
  );
}

/**
 * Handles all the windowed fields that are needed to run this thing.
 * 
 * @returns WindowManager JSX
 */
export function WindowManager() {
  const windowOrdering = useSelector((state: RootState) => state.windowStoreReducer.ordering);
  const windowContents = useSelector((state: RootState) => state.windowStoreReducer.contents);

  const dispatch = useDispatch();

  /**
   * Close the root
   * @param symbol 
   */
  function close(symbol: symbol){
    dispatch(removeWindow(symbol))
  }

  /**
   * Focus on current window.
   * 
   * @param symbol symbol to focus
   */
  function focusOnCurrentWindow(symbol: symbol) {
    dispatch(focusWindow(symbol));
  }

  /**
   * Set position of the moved window tab
   * @param top offset from the top portion of client
   * @param left offset from the left portion of client
   * @param index window index in redux store.
   */
  function setPosition(top: number, left: number, windowSymbol: symbol) {
    dispatch(setWindowPosition({ x: left, y: top, windowSymbol }))
  }

  /**
   * To do: On clicking tab: focus on current tab.
   * @param index 
   */
  // function manageTabClick(index: number) {
  //   const { windowSymbol } = windowStore[index];
  //   dispatch(focusWindow(windowSymbol));
  // }

  function triggerMinimize(index: number) {
    // dispatch()
  }

  // console.log(windowStore);
  return (
    <>
      {/* <div className="window-manager custom-scroll min-h-[4dvh] overflow-x-scroll flex z-[11] flex-row bg-slate-700">
        {
          windowStore
            .filter(({ visible }) => visible)
            .map((window: WindowView<any>, index: number) => {
              return (
                <WindowManagerTab
                  title={window.header}
                  index={index}
                  key={index}
                  onClick={manageTabClick}
                  onClose={onClose}
                />
              );
          })
        }
      </div> */}
      {windowOrdering
        .map((symbol: symbol, index: number) => {
          const window = windowContents[symbol];
          return (
            <Window
              key={window.windowId}
              index={index}
              w={window.w ?? 800}
              h={window.h ?? 600}
              x={window.x}
              y={window.y}
              horizontalAlignment={window.horizontalAlignment}
              verticalAlignment={window.verticalAlignment}
              overflow={window.overflow}
              onPositionChange={(top: number, left: number) => setPosition(top, left, window.windowSymbol)}
              zLevel={index}
              header={typeof window.header === 'string' ? <>{window.header}</> : window.header}
              onClose={() => close(window.windowSymbol)}
              onClick={(c) => focusOnCurrentWindow(c)}
              windowSymbol={window.windowSymbol}
            >
              <window.view key={index} {...window.props}></window.view>
            </Window>
          );
      })}
    </>
  )
}
