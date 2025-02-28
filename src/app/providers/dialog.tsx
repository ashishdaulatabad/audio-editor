import React from "react"
import { DialogBox } from "../components/shared/dialog";

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
  isDialogOpen: () => boolean
}

export const DialogContext = React.createContext<DialogExportInformation>({} as DialogExportInformation);

export const DialogBoxProvider = (props: React.PropsWithChildren) => {
  const [visible, setVisible] = React.useState(false);
  const [dialogInformation, setDialogInformation] = React.useState<DialogInformation>({} as DialogInformation);

  function isDialogOpen() {
    return visible;
  }

  const showDialog = (dialog: DialogInformation) => {
    setVisible(true);
    setDialogInformation(dialog);
  }

  const hideDialog = () => {
    setDialogInformation({} as DialogInformation);
    setVisible(false);
  }

  return (
    <>
      <DialogContext.Provider value={{ showDialog, hideDialog, isDialogOpen }}>
        {props.children}
      </DialogContext.Provider>
      {visible && <DialogBox {...dialogInformation} /> }
    </>
  )
}