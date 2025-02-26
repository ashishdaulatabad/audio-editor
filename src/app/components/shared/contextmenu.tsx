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
      className="fixed context-menu flex flex-col text-md rounded-md bg-zinc-950 max-w-full text-center"
      style={{left: props.x + 'px', top: props.y + 'px'}}
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