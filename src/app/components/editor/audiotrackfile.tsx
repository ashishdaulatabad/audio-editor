import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { ContextMenuContext } from '@/app/providers/contextmenu';
import { DialogContext } from '@/app/providers/dialog';
import { audioManager } from '@/app/services/audio/audiotrackmanager';
import { deleteColor } from '@/app/services/random';
import { RootState } from '@/app/state/store';
import { FaTrash } from 'react-icons/fa';

import { removeAudioFromBank } from '@/app/state/audiostate';
import { batchRemoveWindowWithUniqueIdentifier } from '@/app/state/windowstore';
import {
  resetToDefault,
  selectAudio
} from '@/app/state/selectedaudiostate';
import {
  AudioTrackDetails,
  removeAudioFromAllTracks,
  SEC_TO_MICROSEC
} from '@/app/state/trackdetails/trackdetails';

import { css } from '@/app/services/utils';
import { Waveform } from '@/assets/wave';
import { ChangeDetails, changeHistory, ChangeType, WorkspaceChange } from '@/app/services/changehistory';

interface AudioTrackFileProps {
  isSame: boolean
  index: number
  selected: boolean
}

export function AudioTrackFile(props: React.PropsWithoutRef<AudioTrackFileProps>) {
  const index = props.index;

  const file = useSelector((state: RootState) => (
    state.audioReducer.audioBankList[index]
  ));
  const tracks = useSelector((state: RootState) => (
    state.trackDetailsReducer.trackDetails
  ));

  const dispatch = useDispatch();

  function selectActiveAudioForScheduling() {
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
    audioManager.cleanupAudioData(file.audioId);

    // Currently delete all the audio changes
    changeHistory.clearHistoryContainingItem(
      WorkspaceChange.TrackChanges,
      (item: ChangeDetails<AudioTrackDetails>) => {
        if (item.changeType === ChangeType.Updated) {
          return item.data.current.audioId === file.audioId
        }
        return item.data.audioId === file.audioId
      }
    );

    // TODO: Remove knob changes related to this track.
    // Also clear all possible history values that contains this audio ID
    const allTrackAudioIds = tracks.reduce(
      (prev: symbol[], curr: AudioTrackDetails[]) => (
        [
          ...prev, ...curr
            .filter(a => a.audioId === file.audioId)
            .map(a => a.trackDetail.scheduledKey)
        ]
      ), 
      new Array<symbol>()
    );

    // Cleanup opened window with same audio ids.
    dispatch(batchRemoveWindowWithUniqueIdentifier(allTrackAudioIds));
    // Cleanup tracks.
    dispatch(removeAudioFromAllTracks({
      audioId: file.audioId,
      noSnapshot: true
    }));
    // Cleanup from audio list.
    dispatch(removeAudioFromBank(index));
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
        "cursor-pointer max-w-full mb-2 p-2 py-1 rounded-sm flex flex-row justify-center items-center select-none",
        props.isSame ? 'shadow-lg shadow-gray-900' : 'shadow-md shadow-gray-700'
      )}
      key={index}
      data-index={index}
      onClick={selectActiveAudioForScheduling}
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
