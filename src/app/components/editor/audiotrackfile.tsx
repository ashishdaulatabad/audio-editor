import React from 'react';
import { ContextMenuContext } from '@/app/providers/contextmenu';
import { DialogContext } from '@/app/providers/dialog';
import { audioManager } from '@/app/services/audiotrackmanager';
import { deleteColor } from '@/app/services/color';
import { removeAudio } from '@/app/state/audiostate';
import { resetToDefault, selectAudio } from '@/app/state/selectedaudiostate';
import { RootState } from '@/app/state/store';
import { AudioTrackDetails, removeAudioFromAllTracks } from '@/app/state/trackdetails';
import { batchRemoveWindowWithUniqueIdentifier } from '@/app/state/windowstore';
import { useDispatch, useSelector } from 'react-redux';
import { FaTrash } from 'react-icons/fa';
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

  function selectAudioSlice(index: number) {
    dispatch(selectAudio({
      ...file,
      trackDetail: {
        startOffsetInMillis: 0,
        endOffsetInMillis: (file.duration as number * 1000),
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
  /**
   * Delete track from the tracking.
   * @param index index in redux.
   */
  function deleteTrack(index: number) {
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
  }

  function confirmDelete() {
    deleteTrack(index);
    hideDialog();
    hideContextMenu();
  }

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
        "cursor-pointer text-md mb-2 p-2 py-1 rounded-md flex flex-row justify-center items-center select-none",
        props.isSame ? 'shadow-lg shadow-gray-900' : 'shadow-md shadow-gray-700'
      )}
      key={index}
      data-index={index}
      onClick={() => selectAudioSlice(index)}
      onContextMenu={openContextMenu}
      style={{background: file.colorAnnotation}}
    >
      <Waveform color="#ccc" w={40} h={40} vb={"0 0 21 21"} />
      <div className={css("w-full font-lg", props.isSame ? 'font-bold' : '')}>{file.audioName}</div>
    </div>
  )
}