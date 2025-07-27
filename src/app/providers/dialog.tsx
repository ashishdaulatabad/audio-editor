import React from 'react'
import { DialogBox } from '../components/shared/dialog';

export interface DialogInformation {
  messageHeader: string | React.JSX.Element
  message: string | React.JSX.Element
  confirm: () => void
  cancel?: () => void
  confirmLabel?: string | React.JSX.Element
  cancelLabel?: string | React.JSX.Element
}

export type DialogExportInformation = {
  showDialog: (information: DialogInformation) => void,
  hideDialog: () => void,
  isDialogOpen: () => boolean
}

export const DialogContext = React.createContext({} as DialogExportInformation);

export const DialogBoxProvider = (props: React.PropsWithChildren) => {
  const [visible, setVisible] = React.useState(false);
  const [dialogInfo, setDialogInfo] = React.useState({} as DialogInformation);

  function isDialogOpen() {
    return visible;
  }

  const showDialog = (dialog: DialogInformation) => {
    setVisible(true);
    setDialogInfo(dialog);
  }

  const hideDialog = () => {
    setDialogInfo({} as DialogInformation);
    setVisible(false);
  }

  return (
    <>
      <DialogContext.Provider value={{ showDialog, hideDialog, isDialogOpen }}>
        {props.children}
      </DialogContext.Provider>
      {visible && <DialogBox {...dialogInfo} /> }
    </>
  )
}