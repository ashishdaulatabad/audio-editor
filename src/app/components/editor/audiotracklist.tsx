import React from "react";
import { RootState } from "@/app/state/store";
import { Waveform } from "@/assets/wave";
import { useDispatch, useSelector } from "react-redux";
import { resetToDefault, selectAudio } from "../../state/selectedaudiostate";
import { createAudioData, css } from "../../services/utils";
import { ContextMenuContext } from "@/app/providers/contextmenu";
import { FaTrash } from "react-icons/fa";
import { removeAudioFromAllTracks } from "@/app/state/trackdetails";
import { audioManager } from "@/app/services/audiotrackmanager";
import { deleteColor } from "@/app/services/color";
import { DialogContext } from "@/app/providers/dialog";
import {
  addAudio,
  AudioDetails,
  removeAudio
} from "@/app/state/audiostate";

/**
 * @description Audio track list component
 */
export function AudioTrackList() {
  // Selectors
  const files = useSelector((state: RootState) => state.audioReducer.contents);
  const selected = useSelector((state: RootState) => state.selectedAudioSliceReducer.value);

  // Context
  const {
    hideContextMenu,
    // isContextOpen,
    showContextMenu
  } = React.useContext(ContextMenuContext);

  const {
    showDialog,
    hideDialog
  } = React.useContext(DialogContext);
 
  const dispatch = useDispatch();

  /**
   * Select audio.
   * @param index nth index in audio store in redux.
   */
  function selectAudioSlice(index: number) {
    const file = files[index];

    dispatch(selectAudio({
      ...file,
      trackDetail: {
        startOffsetInMillis: 0,
        endOffsetInMillis: (file.buffer?.duration as number * 1000),
        selected: false,
      }
    }));
  }

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

  /**
   * Delete track from the tracking.
   * @param index index in redux.
   */
  function deleteTrack(index: number) {
    const audio = files[index];
    audioManager.removeAllAudioFromScheduledNodes(audio.audioId);
    dispatch(removeAudioFromAllTracks(audio.audioId));
    dispatch(removeAudio(index));

    if (selected.audioId === files[index].audioId) {
      dispatch(resetToDefault());
    }

    deleteColor(files[index].colorAnnotation);
  }

  function openContextMenu(event: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) {
    event.preventDefault();
    showContextMenu([
      {
        name: 'Delete',
        icon: <FaTrash />,
        onSelect: () => {
          showDialog({
            confirm: () => {
              deleteTrack(index);
              hideDialog();
              hideContextMenu();
            },
            cancel: () => {
              hideDialog();
              hideContextMenu();
            },
            message: `Are you sure to delete this track?`,
            messageHeader: <h1 className="text-xl">Confirm Delete Track <b>"{files[index].audioName}"</b></h1>
          })
        },
      },
    ], event.nativeEvent.clientX, event.nativeEvent.clientY);
  }

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
          const isSame = selected.audioId === file.audioId;

          return (
            <div
              className={css(
                "cursor-pointer text-md mb-2 p-2 py-1 rounded-md flex flex-row justify-center items-center select-none",
                isSame ? 'shadow-lg shadow-gray-900' : 'shadow-md shadow-gray-700'
              )}
              key={index}
              data-index={index}
              onClick={() => selectAudioSlice(index)}
              onContextMenu={(e) => openContextMenu(e, index)}
              style={{background: file.colorAnnotation}}
            >
              <Waveform color="#ccc" w={40} h={40} vb={"0 0 21 21"} />
              <div className={css("w-full font-lg", isSame ? 'font-bold' : '')}>{file.audioName}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
