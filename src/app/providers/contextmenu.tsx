import React from 'react';
import { ContextMenu } from '../components/shared/contextmenu';

/**
 * @description Menu Item to be shown in context menu.
 */
export type ContextItem = {
  /**
   * @Description Name of context menu option
   */
  name: string,
  /**
   * @description Optional icon
   */
  icon?: React.JSX.Element,
  /**
   * @description Action to perform on selection.
   * @returns void
   */
  onSelect: () => void,
  /**
   * @description If item is expandable 
   * - [ ] to do: this
   */
  children?: ContextItem[],
}

export type ContextMenuInfo = {
  showContextMenu: (ci: ContextItem[], x: number, y: number) => void
  hideContextMenu: () => void,
  isContextOpen: () => boolean
};

export const ContextMenuContext = React.createContext<ContextMenuInfo>({} as ContextMenuInfo);

export const ContextMenuProvider = (props: React.PropsWithChildren) => {
  const [visible, setVisible] = React.useState(false);
  const [items, setItems] = React.useState<ContextItem[]>([]);
  const [x, setX] = React.useState<number>(0);
  const [y, setY] = React.useState<number>(0);

  function isContextOpen() {
    return visible;
  }

  const showContextMenu = (contextItems: ContextItem[], x: number, y: number) => {
    setItems(contextItems);
    setX(x);
    setY(y);
    setVisible(true);
  }

  const hideContextMenu = () => {
    // Important, can keep references of audio buffers, and that is no goo.
    setItems([]);
    setVisible(false);
  }

  return (
    <>
      <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu, isContextOpen }}>
        {props.children}
      </ContextMenuContext.Provider>
      {visible && <ContextMenu items={items} x={x} y={y} /> }
    </>
  )
}
