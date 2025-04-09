import { Maybe } from '@/app/services/interfaces';
import React from 'react';

export type DropdownPanelContextInfo<Item> = {
  showDropdownPanel: (info: {
    x: number,
    y: number,
    content: Item[],
    label: (item: ListItem<Item>) => React.JSX.Element
    onSelect: (item: ListItem<Item>) => void
  }) => void
  hideDropdownPanel: () => void
}

export type ListItem<Type> = {
  label: string | React.JSX.Element,
  value: Type
}

export const DropdownPanelContext = React.createContext<DropdownPanelContextInfo<any> | null>(null);

export function DropdownPanelProvider<Item>(props: React.PropsWithChildren<{}>) {
  type LabelType = (item: ListItem<Item>) => React.JSX.Element;

  const [itemList, setItemList] = React.useState<any[]>([]);
  const [visible, setVisible] = React.useState(false);
  const [left, setLeft] = React.useState(0);
  const [top, setTop] = React.useState(0);
  const [action, setAction] = React.useState<Maybe<(item: Item) => void>>(null);
  const [labelFormat, setLabelFormat] = React.useState<Maybe<LabelType>>(null);

  function showDropdownPanel(info: {
    x: number,
    y: number,
    content: Item[],
    label: LabelType
    onSelect: (item: ListItem<Item>) => void
  }) {
    const {
      x,
      y,
      content,
      label,
      onSelect
    } = info;

    setLeft(x);
    setTop(y);
    setItemList(content)
    setLabelFormat(() => label);
    setVisible(true);
    setAction(() => {
      return (item: ListItem<Item>) => {
        onSelect(item);
        hideDropdownPanel();
      }
    });
  }

  function hideDropdownPanel() {
    setAction(() => null);
    setItemList([]);
    setLeft(0);
    setTop(0);
    setLabelFormat(() => null);
    setVisible(false);
  }

  return (
    <>
      <DropdownPanelContext.Provider value={{showDropdownPanel, hideDropdownPanel}}>
        {props.children}
      </DropdownPanelContext.Provider>
      {visible && 
        <DropdownPanel
          itemList={itemList}
          Label={labelFormat as LabelType}
          left={left}
          top={top}
          onSelect={action as ((item: ListItem<Item>) => void)}
        />
      }
    </>
  )
}

export function DropdownPanel<Type>(props: React.PropsWithChildren<{
  itemList: ListItem<Type>[]
  left: number
  top: number
  onSelect: (_: ListItem<Type>) => void
  Label: (item:ListItem<Type>) => React.JSX.Element
}>) {
  const {
    itemList,
    left,
    top,
    Label 
  } = props;

  // Refs
  const listRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.style.left = left + 'px';
      listRef.current.style.top = top + 'px';
    }
  }, [left, top])

  return (
    <ul 
      ref={listRef} 
      className="list-none absolute z-[200] rounded-sm border border-solid border-primary"
    >
      {itemList.map((item, index) => (
        <li
          key={index}
          className="p-2 px-6 bg-darker select-none cursor-pointer hover:bg-slate-600 rounded-sm min-w-36 text-start max-h-36 border-b border-solid border-secondary"
          onClick={(e) => {
            props.onSelect(item)
          }}
        >
          {Label(item)}
        </li>
      ))}
    </ul>
  );
}
