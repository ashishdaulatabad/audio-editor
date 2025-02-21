import React from 'react';

export function ScrollThumb() {
  const [grab, setGrab] = React.useState(false);
  const [left, setLeft] = React.useState(0);
  const [cursorPos, setCursorPos] = React.useState(0);
  const thumbRef = React.createRef<HTMLSpanElement>();

  function grabThumb(event: React.MouseEvent<HTMLSpanElement, MouseEvent>) {
    setGrab(event.buttons === 1);

    if (event.buttons === 1) {
      const v = event.nativeEvent.target as HTMLSpanElement;
      setLeft(v.offsetLeft);
      setCursorPos(event.clientX);
    }
  }

  function leaveThumb() {
    setGrab(false);
  }

  function moveThumb(event: React.MouseEvent<HTMLSpanElement, MouseEvent>) {
    if (grab) {
      const v = event.nativeEvent.target as HTMLSpanElement;
      const diff = event.clientX - cursorPos;
      const maxWidth = (v.parentElement?.clientWidth as number) - 70;

      if (thumbRef.current) {
        thumbRef.current.style.left = `${Math.min(Math.max(30, left + diff), maxWidth)}px`
      }
    }
  }

  return (
    <div className="scrollbar w-full relative h-6">
      <div 
        onMouseMove={moveThumb} 
        onMouseLeave={leaveThumb}
        onMouseUp={leaveThumb}
        className="scrollbar-track flex flex-row justify-between w-full bg-slate-600 h-full rounded-sm p-[1px]"
      >
        <button className="left-button select-none block bg-slate-800 rounded-l-sm px-2">&lt;</button>
          <span 
            ref={thumbRef}
            onMouseDown={grabThumb}
            onMouseMove={moveThumb} 
            className={"select-none text-sm thumb block absolute bg-slate-500 rounded-sm px-4 text-center self-center" + (grab ? ' cursor-grabbing' : ' cursor-grab')} style={{left: '30px'}}
          >||</span>
        <button className="right-button select-none block bg-slate-800 relative right-0 rounded-r-sm px-2">&gt;</button>
      </div>
    </div>
  )
}
