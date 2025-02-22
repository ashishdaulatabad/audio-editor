import { ContextItem } from "@/app/providers/contextmenu"

export interface ContextMenuProps {
  items: ContextItem[],
  x: number,
  y: number
}

/**
 * Custom Context Menu.
 * 
 * - [ ] To do: Make it single and global.
 * @param props 
 * @returns 
 */
export function ContextMenu(props: React.PropsWithoutRef<ContextMenuProps>) {
  return (
    <div 
      className="fixed context-menu flex flex-col text-md rounded-sm bg-zinc-700 max-w-full text-center"
      style={{left: props.x + 'px', top: props.y + 'px'}}
    >
      {
        props.items.map(item => {
          return (
            <div
              key={item.name}
              className="item p-2 flex flex-row hover:bg-zinc-600 rounded-sm border border-solid border-zinc-600 select-none cursor-pointer"
              onClick={item.onSelect}
            >
              <div className="context-menu-icon w-10 items-center justify-items-center content-center">{item.icon}</div>
              <div className="context-menu-icon">{item.name}</div>
            </div>
          )
        })
      }
    </div>
  )
}