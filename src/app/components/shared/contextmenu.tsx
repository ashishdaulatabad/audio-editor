export interface ContextItem {
  name: string,
  icon?: React.JSX.Element,
  onSelect: () => void,
  children: ContextItem[],
}

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
      className="fixed context-menu flex flex-col rounded-sm bg-[#445555]"
      style={{left: props.x + 'px', top: props.y + 'px'}}
    >
      {
        props.items.map(item => {
          return (
            <div className="item" onClick={item.onSelect}>
              <span className="context-menu-icon">{item.icon}</span>
              <span className="context-menu-icon">{item.name}</span>
            </div>
          )
        })
      }
    </div>
  )
}