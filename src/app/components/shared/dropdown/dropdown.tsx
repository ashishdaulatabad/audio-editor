import React from 'react';
import {
  DropdownPanelContext,
  DropdownPanelContextInfo,
  ListItem
} from './dropdownpanel';
import { FaChevronDown } from 'react-icons/fa';
import { css } from '@/app/services/utils';

export type SimpleDropdownProps<Item extends Object> = {
  list: Item[]
  label: (elem: ListItem<Item>) => React.JSX.Element
  value?: keyof Item
  placeholder?: string
  onSelect: (value: Item | Item[keyof Item]) => void
}

export function SimpleDropdown<Item extends Object>(
  props: React.PropsWithoutRef<SimpleDropdownProps<Item>>
) {
  // States
  const [selectedItem, setSelectedItem] = React.useState({} as ListItem<Item>);
  // Refs
  const ref = React.useRef<HTMLDivElement | null>(null);
  // variables
  let left = 0, top = 0;

  const { 
    showDropdownPanel,
    hideDropdownPanel,
    isPanelOpen
  } = React.useContext(DropdownPanelContext) as DropdownPanelContextInfo<Item>;

  function prepareDropdownPanel() {
    showDropdownPanel({
      content: props.list,
      label: props.label,
      onSelect: (item) => {
        setSelectedItem(item);
        props.onSelect(item.value);
      },
      x: left,
      y: top
    });
  } 

  React.useEffect(() => {
    if (ref.current) {
      const { 
        left: labelLeft,
        top: labelTop,
        width,
        height
      } = ref.current.getBoundingClientRect();

      const center = labelLeft + (width / 2);
      left = center - width / 2;
      top = labelTop + height;
    }
  });

  // To do: Create a global panel that should render just below this list of content.
  return (
    <div
      ref={ref}
      className={css(
        "list p-3 min-w-36 border select-none border-solid cursor-pointer border-white/20 relative text-center content-center items-center",
      )}
    >
      <div className="label flex text-center content-center justify-between" onClick={prepareDropdownPanel}>
        {
          !selectedItem ? 
            <span className="placeholder">{props.placeholder ?? ''}</span> :
            <span className="selected-item">{props.label(selectedItem)}</span>
        }
        <FaChevronDown className="mt-1" />
      </div>
    </div>
  );
}
