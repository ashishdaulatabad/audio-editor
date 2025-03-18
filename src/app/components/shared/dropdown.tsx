import React from 'react';

export type SimpleDropdownProps<Item extends Object> = {
  /**
   * @description All list to be displayed on the item
   */
  list: Item[]
  /**
   * @description Label for each item
   */
  label: (elem: Item) => React.JSX.Element
  /**
   * @description Value you want to emit
   */
  value?: keyof Item
  /**
   * @description Placeholder
   */
  placeholder?: string
  /**
   * @description Value emitted by user.
   */
  onSelect: (value: Item | Item[keyof Item]) => void
}

export function SimpleDropdown<Item extends Object>(props: React.PropsWithoutRef<SimpleDropdownProps<Item>>) {
  const [selectedItem, setSelectedItem] = React.useState(-1);
  const [visible, setVisible] = React.useState(false);

  const ref = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);

  function selectItem(listItem: Item, index: number) {
    setSelectedItem(index);
    props.onSelect(props.value ? listItem[props.value] : listItem);
    setVisible(false);
  }

  React.useEffect(() => {
    if (listRef.current && ref.current) {
      const width = listRef.current.clientWidth;
      const actualLeft = ref.current.clientLeft;
      const actualTop = ref.current.clientTop;
      const labelWidth = ref.current.clientWidth;
      const labelHeight = ref.current.clientHeight;
      const center = actualLeft + (labelWidth / 2);

      Object.assign(
        listRef.current.style,
        {
          left: (center - width / 2) + 'px',
          top: actualTop + labelHeight + 15  + 'px'
        }
      );
    }
  }, [visible]);

  // To do: Create a global panel that should show below this list of content.
  return (
    <div className="list relative text-xl text-center content-center items-center">
      <div ref={ref} onClick={() => setVisible(!visible)}>
        {selectedItem === -1 ? <span className="placeholder">{props.placeholder ?? ''}</span> : <></>}
        {selectedItem > -1 ? <span className="selected-item">{props.label(props.list[selectedItem])}</span> : <></>}
      </div>
      {visible &&
        <ul 
          ref={listRef} 
          className="list-none absolute z-[200] rounded-sm border border-solid border-primary"
        >
          {props.list.map((listItem, index) => (
            <li
              key={index}
              className="p-2 px-6 bg-darker hover:bg-slate-600 rounded-sm min-w-36 text-start max-h-36 border-b border-solid border-secondary"
              onClick={(e) => selectItem(listItem, index)}
            >
              {props.label(listItem)}
            </li>
          ))}
        </ul>
      }
    </div>
  );
}
