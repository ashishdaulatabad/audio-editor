import React from "react"

export interface DialogInformation {
  messageHeader: string | React.JSX.Element,
  message: string | React.JSX.Element,
  confirm: () => void,
  cancel?: () => void,
  confirmLabel?: string | React.JSX.Element,
  cancelLabel?: string | React.JSX.Element
}

export type DialogExportInformation = {
  showDialog: (information: DialogInformation) => void,
  hideDialog: () => void,
  isOpen: () => boolean
}

export function DialogBox() {
  const [visible, setVisible] = React.useState(false);
  
  return (
    <>
    </>
  );
}