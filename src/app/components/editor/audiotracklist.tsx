import { addAudio, AudioDetails, removeAudio } from "@/app/state/audiostate";
import { RootState } from "@/app/state/store";
import { Waveform } from "@/assets/wave";
import { useDispatch, useSelector } from "react-redux";
import { selectAudio } from "../../state/selectedaudiostate";
import { createAudioData, css } from "../../services/utils";
import React from "react";
import { ContextMenuContext } from "@/app/providers/contextmenu";
import { FaCopy, FaTrash } from "react-icons/fa";
import { removeAudioFromAllTracks } from "@/app/state/trackdetails";
import { audioManager } from "@/app/services/audiotrackmanager";
import { deleteColor } from "@/app/services/color";

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
 
  const dispatch = useDispatch();

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

  function selectFile() {
    const el = document.createElement("input") as HTMLInputElement;
    el.type = "file";
    el.accept = "audio/*";

    el.oninput = () => {
      const file = el.files as FileList;
      createAudioData(files, file[0]).then((data) => {
        if (data !== null) {
          dispatch(addAudio(data));
        }
      });
    };

    el.click();
  }

  function deleteTrack(index: number) {
    const audio = files[index];
    audioManager.removeAllAudioFromScheduledNodes(audio.audioId);
    dispatch(removeAudioFromAllTracks(audio.audioId));
    dispatch(removeAudio(index));
    deleteColor(files[index].colorAnnotation);
  }

  function openContextMenu(event: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number) {
    event.preventDefault();
    showContextMenu([
      {
        name: 'Create Copy',
        icon: <FaCopy />,
        onSelect: () => console.log('there'),
      },
      {
        name: 'Delete',
        icon: <FaTrash />,
        onSelect: () => {
          deleteTrack(index);
          hideContextMenu();
        },
      },
    ], event.nativeEvent.clientX, event.nativeEvent.clientY);
  }

  return (
    <div className="bg-slate-700 h-full w-full rounded-sm">
      <div className="import-button self-center p-8 border-solid border border-slate-900 shadow-lg">
        <button
          className="select-none text-lg rounded-md py-3 px-4 bg-lime-700 w-full shadow-md hover:shadow-lg hover:bg-lime-600 transition-all ease-in-out"
          onClick={selectFile}
        >
          Load Audio
        </button>
      </div>
      <div className="list">
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
