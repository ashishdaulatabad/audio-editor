import React from 'react';
import { css } from '@/app/services/utils';

export interface ResizableGroupProps {}

/**
 * @description Resizable Panel Options
 */
export interface ResizablePanelProps {
  className?: string
  ref?: React.RefObject<HTMLDivElement | null>
  initialWidth?: number
}

export interface ResizableHandleProps {}

export function ResizingHandle(props: React.PropsWithoutRef<ResizableHandleProps>) {
  return (
    <div
      className="resizer w-[1px] h-auto hover:border-[2px] border border-solid border-zinc-500 hover:border-zinc-400 hover:cursor-col-resize"
    ></div>
  )
}

export function ResizingGroup(props: React.PropsWithChildren<ResizableGroupProps>) {
  const [hold, setHold] = React.useState(false);
  const [anchor, setAnchor] = React.useState(0);
  const [initialWidth, setInitialWidth] = React.useState(0);
  const [resizer, setResizer] = React.useState<HTMLElement | null>(null);
  const ref = React.useRef<HTMLDivElement | null>(null);

  /**
   * @description Handle mouse event on moving the cursor
   * @param event Event details
   */
  function handleMouseMove(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    if (hold && resizer) {
      const previousElement = resizer.previousElementSibling as HTMLElement;
      const { clientX } = event.nativeEvent;

      if (previousElement.classList.contains('resizing-panel')) {
        Object.assign(
          previousElement.style,
          {
            minWidth: (initialWidth - anchor + clientX) + 'px',
            maxWidth: (initialWidth - anchor + clientX) + 'px'
          }
        );
      }
    }
  }

  /**
   * @description Handle mouse event on moving the cursor
   * @param event Event details
   */
  function handleMouseDown(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    const element = event.target as HTMLElement;

    if (element.classList.contains('resizer') && event.buttons === 1) {
      setResizer(element);
      const previousElement = element.previousElementSibling as HTMLElement;
      
      if (previousElement.classList.contains('resizing-panel')) {
        setInitialWidth(previousElement.clientWidth);
      }

      setAnchor(event.nativeEvent.clientX);
      setHold(true);
    }
  }

  /**
   * @description Handle release button
   * @param event 
   */
  function handleMouseRelease(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    setResizer(null);
    setAnchor(0);
    setInitialWidth(0);
    setHold(false);
  }

  return (
    <div
      ref={ref}
      className="flex flex-row"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseRelease}
      onMouseLeave={handleMouseRelease}
    >
      {props.children}
    </div>
  )
}

export function ResizingWindowPanel(props: React.PropsWithChildren<ResizablePanelProps>) {
  return (
    <>
      <div
        className={css("resizing-panel", props.className ?? '')}
        ref={props.ref}
        style={props.initialWidth ? {minWidth: props.initialWidth, maxWidth: props.initialWidth} : {}}
      >
        {props.children}
      </div>
    </>
  )
}
