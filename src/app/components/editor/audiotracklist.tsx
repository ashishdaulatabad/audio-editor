import React from "react";
import { RootState } from "@/app/state/store";
import { useDispatch, useSelector } from "react-redux";
import { createAudioData, css } from "../../services/utils";
import {
  addAudio,
  AudioDetails,
} from "@/app/state/audiostate";
import { AudioTrackFile } from "./audiotrackfile";

/**
 * @description Audio track list component
 */
export function AudioTrackList() {
  // Selectors
  const files = useSelector((state: RootState) => state.audioReducer.contents);
  const selected = useSelector((state: RootState) => state.selectedAudioSliceReducer.value);
 
  const dispatch = useDispatch();

  /**
   * @description Load audio in workspace.
   */
  function selectFile() {
    const inputElement = document.createElement("input") as HTMLInputElement;
    inputElement.type = "file";
    inputElement.accept = "audio/*";

    inputElement.oninput = () => {
      const file = inputElement.files as FileList;
      createAudioData(files, file[0]).then((data) => {
        if (data !== null) {
          dispatch(addAudio(data));
        }
      });
    };

    inputElement.click();
  }

  const selectedId = selected.audioId;
  return (
    <div className="bg-slate-700 h-full w-full rounded-sm">
      <div className="import-button self-center text-center p-8 border-solid border border-transparent border-b-slate-900 shadow-lg">
        <button
          className="select-none text-lg rounded-md py-3 px-8 max-w-fit bg-lime-700 w-full shadow-md hover:shadow-lg hover:bg-lime-600 transition-all ease-in-out"
          onClick={selectFile}
        >
          Load Audio
        </button>
      </div>
      <div className="list w-full h-[76dvh] overflow-y-scroll">
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
