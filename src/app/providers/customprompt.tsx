import React from "react";
import { CustomPrompt } from "../components/shared/customprompt";

export enum PromptInputType {
  Number,
  Text,
  Range
}

export type PromptInputInformation = {
  placeholder: string,
  type: PromptInputType,
  required: boolean
  default?: string
}

export type PromptMenuInfo = {
  showPrompt: (ci: PromptInputInformation[], x: number, y: number) => void
  hidePrompt: () => void,
  isPromptOpen: () => boolean
};

export const PromptMenuContext = React.createContext<PromptMenuInfo>({} as PromptMenuInfo);

export const PromptMenuProvider = (props: React.PropsWithChildren) => {
  const [visible, setVisible] = React.useState(false);
  const [items, setItems] = React.useState<PromptInputInformation[]>([]);
  const [x, setX] = React.useState<number>(0);
  const [y, setY] = React.useState<number>(0);

  function isPromptOpen() {
    return visible;
  }

  const showPrompt = (contextItems: PromptInputInformation[], x: number, y: number) => {
    setItems(contextItems);
    setX(x);
    setY(y);
    setVisible(true);
  }

  const onPromptAccepted = (values: string[]) => {

  }

  const hidePrompt = () => {
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
      {visible && <CustomPrompt promptInputs={items} x={x} y={y} /> }
    </>
  )
}