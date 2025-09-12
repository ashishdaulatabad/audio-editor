import { ContextItem } from "@/app/providers/contextmenu"
import React from "react";

export interface ContextMenuProps {
  items: ContextItem[],
  x: number,
  y: number
}

/**
 * @description A Context Menu Component
 */
export function ContextMenu(props: React.PropsWithoutRef<ContextMenuProps>) {
  let left = props.x, top = props.y;
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (menuRef.current) {
      const height = menuRef.current.clientHeight;
      const top = menuRef.current.offsetTop;
      let newTop = top;

      if (top + height > document.documentElement.clientHeight) {
        newTop -= height;
      }
      
      const width = menuRef.current.clientWidth;
      const left = menuRef.current.offsetLeft;
      let newLeft = left;

      if (left + width > document.documentElement.clientWidth) {
        newLeft -= width;
      }

      Object.assign(
        menuRef.current.style, 
        {
          top: newTop + 'px',
          left: newLeft + 'px' 
        }
      );
    }
  }, []);

  return (
    <div
      className="fixed context-menu flex flex-col text-md rounded-md bg-zinc-950 max-w-full text-center"
      style={{left: left + 'px', top: top + 'px'}}
      ref={menuRef}
    >
      {
        props.items.map(item => {
          return (
            <button
              key={item.name}
              className="item p-2 flex flex-row hover:bg-zinc-700 rounded-sm border border-solid border-zinc-900 select-none cursor-pointer"
              onClick={item.onSelect}
            >
              <div className="context-menu-icon w-10 items-center px-2 py-1 content-center">{item.icon}</div>
              <div className="context-menu-icon">{item.name}</div>
            </button>
          )
        })
      }
    </div>
  )
}
