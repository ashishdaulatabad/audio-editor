export type SimpleDropdownProps<Item> = {
  list: Item[]
  label: keyof Item | ((elem: Item[]) => React.JSX.Element)
  value: keyof Item
}

export function SimpleDropdown<Item>(props: React.PropsWithoutRef<SimpleDropdownProps<Item>>) {
  
}