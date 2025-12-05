import React from 'react';
import {CustomPrompt} from '../components/shared/customprompt';

export enum PromptInputType {
  Number,
  Text,
  Range
}

export type PromptInputInfo = {
  textPlaceholder: string,
  inputType: PromptInputType,
  required: boolean
  default?: string
}

export type PromptMenuInfo = {
  showPrompt: (ci: PromptInputInfo[], x: number, y: number) => void
  hidePrompt: () => void,
  isPromptOpen: () => boolean
};

export const PromptMenuContext = React.createContext({} as PromptMenuInfo);

export const PromptMenuProvider = (props: React.PropsWithChildren) => {
  const [visible, setVisible] = React.useState(false);
  const [items, setItems] = React.useState<PromptInputInfo[]>([]);
  const [x, setX] = React.useState(0);
  const [y, setY] = React.useState(0);

  function isPromptOpen() {
    return visible;
  }

  function showPrompt(promptDetails: PromptInputInfo[], x: number, y: number) {
    setItems(promptDetails);
    setX(x);
    setY(y);
    setVisible(true);
  }

  // TODO: Implement this.
  function onPromptAccepted(values: string[]) {
    setItems([]);
    setVisible(false);
  }

  function hidePrompt() {
    setVisible(false);
  }

  return (
    <>
      <PromptMenuContext.Provider 
        value={{
          showPrompt,
          hidePrompt,
          isPromptOpen 
        }}
      >
        {props.children}
      </PromptMenuContext.Provider>
      {visible && <CustomPrompt promptInputs={items} x={x} y={y} />}
    </>
  )
}
