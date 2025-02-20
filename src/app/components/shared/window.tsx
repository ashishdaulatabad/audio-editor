import { css } from "@/app/services/utils";
import { Exit } from "@/assets/exit";
import React from "react";

/**
 * Creates a resizable window tile that shows the popup 
 * To-do: Create a window manager that handles z-indexes of multiple
 * windows
 * @param props 
 * @returns 
 */
export function Window(props: React.PropsWithChildren<{
  w: number,
  h: number,
  onClose?: () => void,
  onClick: () => void,
  zLevel: number,
  header?: React.JSX.Element 
}>) {
  /// States
  const [width, setWidth] = React.useState(props.w);
  const [height, setHeight] = React.useState(props.h);
  const [left, setLeft] = React.useState(0);
  const [top, setTop] = React.useState(0);
  const [hold, setHold] = React.useState(false);
  const [anchorX, setAnchorX] = React.useState(0);
  const [anchorY, setAnchorY] = React.useState(0);
  
  function initHold(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    setHold(true);
    setAnchorX(event.nativeEvent.clientX);
    setAnchorY(event.nativeEvent.clientY);
  }
  
  function move(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (hold && event.buttons === 1) {
      event.preventDefault();
      const changeX = event.nativeEvent.clientX - anchorX;
      const changeY = event.nativeEvent.clientY - anchorY;
      setLeft(left + changeX);
      setTop(top + changeY);
      setAnchorX(event.nativeEvent.clientX);
      setAnchorY(event.nativeEvent.clientY);
    }
  }

  function deinitHold() {
    setHold(false);
    setAnchorX(0);
    setAnchorY(0);
  }

  function triggerClose() {
    props.onClose?.call(null);
  }

  return (
    <div
      className={css(
        "fixed border flex flex-col border-solid border-slate-800 rounded-sm z-[100] transition-shadow ease-in-out shadow-black",
        hold ? 'shadow-lg' : 'shadow-md'
      )}
      style={{ 
        width: width + 'px',
        height: height + 'px',
        left: left + 'px',
        top: top + 'px',
        zIndex: props.zLevel + 100,
      }}
    >
      <div
        className="topbar bg-slate-700 flex flex-row justify-between"
      >
        <div
          className={css("header-content select-none px-3 py-2 rounded-ss-sm w-full", !hold ? 'cursor-grab' : 'cursor-grabbing')}
          onMouseDown={initHold}
          onMouseMove={move}
          onMouseLeave={deinitHold}
          onMouseUp={deinitHold}
        >
          {props.header || 'Navbar'}
        </div>
        <div
          className="header-tool px-3 text-xl py-2 bg-red-500 cursor-pointer hover:bg-red-600 rounded-se-sm content-center"
          onClick={triggerClose}
        >
          <Exit w={10} h={10} />
        </div>
      </div>
      <div className="content bg-slate-600 w-full h-full rounded-es-sm rounded-ee-sm">
        {props.children}
      </div>
    </div>
  )
}
