import React from "react";
import { ContextMenu } from "../components/shared/contextmenu";

interface EndSection {}

export type ContextItem = {
  name: string,
  icon?: React.JSX.Element,
  onSelect: () => void,
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