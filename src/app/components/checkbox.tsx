'use client';

import React from "react"
import { utils } from "../utils"

interface RadioProps {
  label: string,
  checked?: boolean
  disabled?: boolean,
  onChange: (checked: boolean) => void
}

export function Checkbox(props: React.PropsWithoutRef<RadioProps>) {
  const [value, setValue] = React.useState(typeof props.checked === 'boolean' ? props.checked : false);
  const [disabled, setDisabled] = React.useState(typeof props.disabled === 'boolean' ? props.disabled : false);

  return (
    <div 
      className="radio flex self-center h-auto select-none cursor-pointer"
      onClick={() => {
        if (!disabled) {
          setValue(!value)
          props.onChange(!value)
        }
      }}
    >
      <svg xmlns={utils.constants.svgxmlns} width={14} height={14} className="self-center">
        <defs>
          <filter id="f1">
            <feDropShadow floodColor="#82F596" dx="-5" dy="-5" accentHeight="6" stdDeviation="10" floodOpacity="0.5" />
          </filter>
        </defs>
        <rect rx="3" ry="3" stroke="#000" width={14} height={14} fill="#555" filter={value ? "url(#f1)" : undefined}></rect>
        {value && <rect x={2} y={2} width={10} height={10} rx="3" ry="3" fill="#52D566"></rect>}
      </svg>
      <span className="text-white ml-2">{props.label}</span>
    </div>
  )
}