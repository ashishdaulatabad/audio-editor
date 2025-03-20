import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ContextMenuContext } from '@/app/providers/contextmenu';
import { DialogContext } from '@/app/providers/dialog';
import { audioManager } from '@/app/services/audiotrackmanager';
import { deleteColor } from '@/app/services/random';
import { RootState } from '@/app/state/store';
import { FaTrash } from 'react-icons/fa';

import { removeAudio } from '@/app/state/audiostate';
import { batchRemoveWindowWithUniqueIdentifier } from '@/app/state/windowstore';
import {
  resetToDefault,
  selectAudio
} from '@/app/state/selectedaudiostate';
import {
  AudioTrackDetails,
  removeAudioFromAllTracks,
  SEC_TO_MICROSEC
} from '@/app/state/trackdetails';

import { css } from '@/app/services/utils';
import { Waveform } from '@/assets/wave';

interface AudioTrackFileProps {
  isSame: boolean
  index: number
  selected: boolean
}

export function AudioTrackFile(props: React.PropsWithoutRef<AudioTrackFileProps>) {
  const index = props.index;
  const file = useSelector((state: RootState) => state.audioReducer.contents[index]);
  const tracks = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails);
  const dispatch = useDispatch();

  /**
   * @description Select currently selected slice.
   * @param index 
   */
  function selectAudioSlice() {
    dispatch(selectAudio({
      ...file,
      trackDetail: {
        startOffsetInMicros: 0,
        playbackRate: 1,
        endOffsetInMicros: (file.duration as number * SEC_TO_MICROSEC),
        selected: false,
      }
    }));
  }

  const {
    hideContextMenu,
    // isContextOpen,
    showContextMenu
  } = React.useContext(ContextMenuContext);

  const {
    showDialog,
    hideDialog
  } = React.useContext(DialogContext);

  function onDeleteSelected() {
    /// Maybe make a common method for this.
    audioManager.removeAllAudioFromScheduledNodes(file.audioId);
    audioManager.deleteAudioFromSelectedAudioTracks(file.audioId);
    audioManager.removeOffscreenCanvas(file.audioId);
    audioManager.unregisterAudioFromAudioBank(file.audioId);

    const allTrackAudioIds = tracks.reduce((prev: symbol[], curr: AudioTrackDetails[]) => (
      [...prev, ...curr.filter(a => a.audioId === file.audioId).map(a => a.trackDetail.scheduledKey)]
    ), new Array<symbol>());

    // Cleanup opened window with same audio ids.
    dispatch(batchRemoveWindowWithUniqueIdentifier(allTrackAudioIds));
    // Cleanup tracks.
    dispatch(removeAudioFromAllTracks(file.audioId));
    // Cleanup from audio list.
    dispatch(removeAudio(index));
    // Delete annotated color
    deleteColor(file.colorAnnotation);
    // Reset to default
    if (props.selected) {
      dispatch(resetToDefault());
    }
    hideContextMenu();
  }

  /**
   * @description Open a custom context.
   * @param event event details
   */
  function openContextMenu(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.preventDefault();

    showContextMenu([{
      name: 'Delete',
      icon: <FaTrash />,
      onSelect: onDeleteSelected
    }], event.nativeEvent.clientX, event.nativeEvent.clientY);
  }

  return (
    <div
      className={css(
        "cursor-pointer max-w-full mb-2 p-2 py-1 rounded-sm flex flex-row justify-center items-center select-none",
        props.isSame ? 'shadow-lg shadow-gray-900' : 'shadow-md shadow-gray-700'
      )}
      key={index}
      data-index={index}
      onClick={selectAudioSlice}
      onContextMenu={openContextMenu}
      style={{background: file.colorAnnotation}}
    >
      <div className="min-w-8 ml-2">
        <Waveform color="#ccc" w={40} h={40} vb={"0 0 21 21"} />
      </div>
      <div className={css("w-full font-xl ml-2 text-nowrap text-lg overflow-hidden overflow-ellipsis", { 'font-bold' : props.isSame })}>{file.audioName}</div>
    </div>
  )
}
