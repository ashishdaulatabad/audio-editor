import React from "react";
import { CustomPrompt } from "../components/shared/customprompt";

/**
 * @description Prompt Input Type
 */
export enum PromptInputType {
  Number,
  Text,
  Range
}

/**
 * @description Information Related to Floating Prompt.
 */
export type PromptInputInformation = {
  /**
   * @description Set placeholder
   */
  placeholder: string,
  /**
   * @description Input Type (see `PromptInputType`)
   */
  type: PromptInputType,
  /**
   * @description If set, needs user input.
   */
  required: boolean
  /**
   * @description Default value.
   */
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

  /**
   * @description Show Prompt at certain location.
   * @param promptDetails Details that the prompt needs to ask.
   * @param x x location in client window.
   * @param y y location in client window.
   */
  function showPrompt(promptDetails: PromptInputInformation[], x: number, y: number) {
    setItems(promptDetails);
    setX(x);
    setY(y);
    setVisible(true);
  }

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
      {visible && <CustomPrompt promptInputs={items} x={x} y={y} /> }
    </>
  )
}
