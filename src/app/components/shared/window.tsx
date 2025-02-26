import { css } from "@/app/services/utils";
import { Exit } from "@/assets/exit";
import React from "react";
import { FaWindowMaximize, FaWindowMinimize } from "react-icons/fa";

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
  x: number,
  y: number,
  onClose?: () => void,
  onClick: () => void,
  onPositionChange: (top: number, left: number) => void,
  zLevel: number,
  header?: React.JSX.Element 
}>) {
  /// States
  const [width, setWidth] = React.useState(props.w);
  const [height, setHeight] = React.useState(props.h);
  const [left, setLeft] = React.useState(props.x);
  const [top, setTop] = React.useState(props.y);
  const [hold, setHold] = React.useState(false);
  const [anchorX, setAnchorX] = React.useState(0);
  const [anchorY, setAnchorY] = React.useState(0);
  const windowRef = React.createRef<HTMLDivElement>();
  
  function initHold(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    setHold(true);
    setAnchorX(event.nativeEvent.clientX);
    setAnchorY(event.nativeEvent.clientY);

    if (windowRef.current) {
      setLeft(windowRef.current.offsetLeft);
      setTop(windowRef.current.offsetTop);
    }
  }
  
  function move(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (hold && event.buttons === 1) {
      event.preventDefault();
      const changeX = event.nativeEvent.clientX - anchorX;
      const changeY = event.nativeEvent.clientY - anchorY;

      if (windowRef.current) {
        windowRef.current.style.left = left + changeX + 'px';
        windowRef.current.style.top = top + changeY + 'px';
      }
    }
  }

  function deinitHold() {
    setHold(false);

    if (windowRef.current) {
      props.onPositionChange(windowRef.current.offsetTop, windowRef.current.offsetLeft);
    }

    setAnchorX(0);
    setAnchorY(0);
    setLeft(0);
    setTop(0);
  }

  function onWindowClick() {
    props.onClick();
  }

  function triggerClose() {
    props.onClose?.call(null);
  }

  return (
    <div
      className={css(
        "absolute border flex flex-col border-solid border-slate-800 rounded-sm z-[100] transition-shadow ease-in-out shadow-black",
        hold ? 'shadow-lg' : 'shadow-md'
      )}
      ref={windowRef}
      onClick={onWindowClick}
      style={{ 
        width: width + 'px',
        height: height + 'px',
        left: props.x + 'px',
        top: props.y + 'px',
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
          className="header-tool flex flex-row rounded-se-sm"
        >
          <div className="px-3 text-center w-full h-full content-center text-yellow-500 cursor-pointer hover:text-yellow-600" onClick={triggerClose}>
            <FaWindowMinimize width={10} height={10} />
          </div>
          <div className="px-3 text-center w-full h-full content-center text-green-500 cursor-pointer hover:text-green-600" onClick={triggerClose}>
            <FaWindowMaximize width={10} height={10} />
          </div>
          <div className="px-3 text-center w-full h-full content-center bg-red-500 cursor-pointer hover:bg-red-600" onClick={triggerClose}>
            <Exit w={10} h={10} fill={'white'} />
          </div>
        </div>
      </div>
      <div className="content bg-slate-600 w-full h-full rounded-es-sm rounded-ee-sm">
        {props.children}
      </div>
    </div>
  )
}
