import React from 'react';
import { RootState } from '@/app/state/store';
import { useDispatch, useSelector } from 'react-redux';
import { createAudioData } from '../../services/utils';
import { AudioTrackFile } from './audiotrackfile';
import {
  addIntoAudioBank,
  AudioDetails,
} from '@/app/state/audiostate';

export function AudioTrackList() {
  // Selectors
  // const [search, setSearch] = React.useState('');
  const files = useSelector((state: RootState) => state.audioReducer.audioBankList);
  const selected = useSelector((state: RootState) => state.selectedAudioSliceReducer.value);
 
  const dispatch = useDispatch();

  function selectFile() {
    const inputElement = document.createElement("input") as HTMLInputElement;
    inputElement.type = 'file';
    inputElement.accept = 'audio/*';

    inputElement.oninput = () => {
      const file = inputElement.files as FileList;
      createAudioData(files, file[0]).then((data) => {
        if (data !== null) {
          dispatch(addIntoAudioBank(data));
        }
      });
    };

    inputElement.click();
  }

  const selectedId = selected.audioId;

  return (
    <div className="bg-secondary w-full flex flex-col rounded-sm h-full">
      <div className="import-button self-center flex flex-row justify-center w-full text-center p-8 border-solid border border-transparent border-b-slate-900 shadow-lg">
        <button
          className="ml-4 text-lg custom-scroll select-none rounded-md py-3 px-6 text-nowrap overflow-ellipsis overflow-hidden max-w-fit bg-lime-700 w-full shadow-md hover:shadow-lg hover:bg-lime-600 transition-all ease-in-out"
          onClick={selectFile}
        >
          Load Audio
        </button>
      </div>
      <div className="list w-full flex-grow overflow-x-hidden overflow-y-scroll">
        {files.map((file: AudioDetails, index: number) => {
          const isSame = selectedId === file.audioId;

          return (
            <AudioTrackFile
              key={index}
              index={index}
              isSame={isSame}
              selected={isSame}
            />
          );
        })}
      </div>
    </div>
  );
}
