import React from "react";
import { css } from "@/app/services/utils";
import { Exit } from "@/assets/exit";
import { FaWindowMinimize } from "react-icons/fa";
import { HorizontalAlignment, VerticalAlignment } from '../../state/windowstore';

/**
 * @description Creates a resizable window tile that shows the popup.
 * @param props 
 * @returns 
 */
export function Window(props: React.PropsWithChildren<{
  w: number
  h: number
  x: number
  y: number
  horizontalAlignment?: HorizontalAlignment
  verticalAlignment?: VerticalAlignment
  overflow?: boolean
  index: number
  onClose?: () => void
  onMinimize?: () => void
  onClick: () => void
  onPositionChange: (top: number, left: number) => void
  zLevel: number
  header?: React.JSX.Element 
}>) {
  /// States
  const [hold, setHold] = React.useState(false);
  const windowRef = React.useRef<HTMLDivElement | null>(null);

  function onWindowClick() {
    props.onClick();
  }

  function triggerClose() {
    props.onClose?.call(null);
  }

  function triggerMinimize() {
    props.onMinimize?.call(null);
  }

  return (
    <div
      className={css(
        "absolute border-2 flex flex-col border-solid border-slate-800 rounded-sm z-[100] transition-shadow ease-in-out shadow-black",
        hold ? 'shadow-lg' : 'shadow-md',
      )}
      data-windowid={props.index}
      ref={windowRef}
      onClick={onWindowClick}
      style={{ 
        width: props.w + 'px',
        height: props.h + 'px',
        left: props.x + 'px',
        top: props.y + 'px',
        zIndex: props.zLevel + 100,
      }}
    >
      <div
        className="topbar bg-secondary flex flex-row justify-between"
      >
        <div
          className={css("header-content select-none px-3 py-2 text-lg rounded-ss-sm w-full text-left", !hold ? 'cursor-grab' : 'cursor-grabbing')}
          onMouseDown={() => setHold(true)}
          onMouseUp={() => setHold(false)}
          onMouseLeave={() => setHold(false)}
        >
          {props.header || 'Navbar'}
        </div>
        <div
          className="header-tool flex flex-row rounded-se-sm"
        >
          <div 
            className="px-3 text-xs text-center w-full h-full content-center text-yellow-500 cursor-pointer hover:text-yellow-600"
            onClick={triggerMinimize}
          >
            <FaWindowMinimize
              width={10}
              height={10} 
            />
          </div>
          <div className="px-3 text-center w-full h-full content-center bg-red-500 cursor-pointer hover:bg-red-600" onClick={triggerClose}>
            <Exit w={10} h={10} fill={'white'} />
          </div>
        </div>
      </div>
      <div className={css(
        "content flex bg-primary w-full h-full rounded-es-sm rounded-ee-sm",
        {
          'overflow-x-scroll': !!props.overflow,
          'content-center': props.horizontalAlignment === HorizontalAlignment.Center,
          'content-end': props.horizontalAlignment === HorizontalAlignment.Right,
          'items-end': props.verticalAlignment === VerticalAlignment.Bottom
        },
      )}>
        {props.children}
      </div>
    </div>
  )
}
