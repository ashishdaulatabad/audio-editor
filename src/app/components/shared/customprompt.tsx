import React from 'react';
import {PromptInputInfo, PromptInputType} from '@/app/providers/customprompt';

export type PromptInputProps = {
  promptInputs: PromptInputInfo[]
  x: number,
  y: number
};

export function PromptInput(props: React.PropsWithoutRef<{
  promptInput: PromptInputInfo,
  promptValue: string,
  onChange: (e: string) => void
}>) {
  const {promptInput: inp} = props;

  switch (inp.inputType) {
    case PromptInputType.Number: {
      return (
        <>
          <label className="mx-3 text-xl">{inp.textPlaceholder}</label>
          <input
            type="number"
            value={props.promptValue ?? ''}
            placeholder={inp.textPlaceholder}
            className="prompt-input m-2 p-2 text-xl outline-none"
            onInput={(e) => {
              props.onChange((e.target as HTMLInputElement).value)
            }}
          />
        </>
      )
    }

    case PromptInputType.Text: {
      return (
        <>
          <label className="mx-3 text-xl">{inp.textPlaceholder}</label>
          <input
            type="text"
            value={props.promptValue ?? ''}
            placeholder={inp.textPlaceholder}
            className="prompt-input m-2 p-2"
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              props.onChange(target.value);
            }}
          />
        </>
      )
    }
  }
}

export function CustomPrompt(props: React.PropsWithoutRef<PromptInputProps>) {
  const [values, setValues] = React.useState(
    Array.from(
      { length: props.promptInputs.length },
      (_, index: number) => props.promptInputs[index].default ?? ''
    )
  );

  function setValueAtIndex(value: string, index: number) {
    setValues(values => {
      values[index] = value;
      return [...values];
    });
  }

  return (
    <>
      <div className="absolute z-[101] bg-black/40 top-0 left-0 w-full h-full">
        <div
          className="prompt-input rounded-sm absolute p-2 bg-slate-950 z-[101]"
          style={{ left: props.x + 'px', top: props.y + 'px' }}
        >
          {props.promptInputs.map((promptInput, index: number) => (
            <PromptInput
              promptInput={promptInput}
              promptValue={values[index]}
              onChange={(e) => setValueAtIndex(e, index)}
              key={index}
            />
          ))}
        </div>
      </div>
    </>
  );
}
