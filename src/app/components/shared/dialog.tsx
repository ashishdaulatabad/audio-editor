import React from 'react';
import {DialogInformation} from '@/app/providers/dialog';
import {FaCheck, FaTimes} from 'react-icons/fa';

export type DialogProps = DialogInformation;

export function DialogBox(props: React.PropsWithoutRef<DialogProps>) {
  return (
    <div className="absolute w-full h-full left-0 top-0 z-[100] dialog-container flex flex-row justify-around bg-black/20">
      <div className="bg-slate-800 min-w-[20dvw] self-center flex flex-col justify-normal rounded-sm shadow-lg border border-slate-700">
        <div className="dialog-header-container">
          <div className="dialog-header border-b border-slate-400 p-4">
            {props.messageHeader}
          </div>
        </div>
        <div className="dialog-content h-full bg-slate-600 p-4 py-8">
          {props.message}
        </div>
        <div className="dialog-footer h-fit p-4 border-t border-slate-400">
          <button
            className="text-white bg-slate-900 inline-flex items-center hover:bg-slate-800 shadow-lg shadow-zinc-900 rounded-[30px] p-2 px-4"
            onClick={props.confirm}
          > 
            <FaCheck className="mr-4 text-green-500" />
            {props.confirmLabel ?? 'Confirm'}
          </button>
          <button
            className="text-white bg-slate-900 inline-flex items-center hover:bg-slate-800 shadow-lg shadow-zinc-900 rounded-[30px] ml-3 p-2 px-4"
            onClick={props.cancel}
          >
            <FaTimes className="mr-4 text-red-500" />
            {props.cancelLabel ?? 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
