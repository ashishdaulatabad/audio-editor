import { addAudio, AudioDetails } from "@/app/state/audiostate";
import { RootState } from "@/app/state/store";
import { Waveform } from "@/assets/wave";
import { useDispatch, useSelector } from "react-redux";
import { selectAudio } from "../../state/selectedaudiostate";
import { createAudioData, css } from "../../services/utils";
import React from "react";

export function AudioTrackList() {
  const files = useSelector((state: RootState) => state.audioReducer.contents);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
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
    setSelectedIndex(index + 1);
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

  return (
    <div className="bg-slate-700 h-full w-full rounded-sm">
      <div className="import-button self-center p-8 border-solid border border-slate-900 shadow-lg">
        <button
          className="select-none rounded-md py-3 px-4 bg-lime-700 w-full shadow-md hover:shadow-lg hover:bg-lime-600 transition-all ease-in-out"
          onClick={selectFile}
        >
          Load Audio
        </button>
      </div>
      <div className="list">
        {files.map((file: AudioDetails, index: number) => {
          return (
            <div
              className={css(
                "cursor-pointer text-md mb-2 p-2 py-1 rounded-md flex flex-row justify-center items-center select-none shadow-md shadow-gray-700",
                selectedIndex === index + 1 ? "bg-blue-500" : "bg-blue-700",
              )}
              key={index}
              data-index={index}
              onClick={() => selectAudioSlice(index)}
            >
              <Waveform color="#ccc" w={40} h={40} vb={"0 0 21 21"} />
              <div className="w-full">{file.audioName}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
