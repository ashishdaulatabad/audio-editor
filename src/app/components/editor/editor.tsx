import React from 'react';
import { Tracks } from './tracks';
import { TrackInfo } from './trackinfo';
import { AudioTrackList } from './audiotracklist';
import { Seekbar, TimeSectionSelection } from './seekbar';
import { useDispatch, useSelector } from 'react-redux';
import { addIntoAudioBank } from '@/app/state/audiostate';
import { RootState } from '@/app/state/store';
import { selectAudio } from '@/app/state/selectedaudiostate';
import { audioManager } from '@/app/services/audiotrackmanager';
import { Player } from '../player/player';
import { AudioWaveformEditor } from '../waveform/waveform';
import { WindowManager } from '../shared/windowmanager';
import { ModeType, Toolkit } from './toolkit';
import { RegionSelect, RegionSelection } from './regionselect';
import { AudioTrackManipulationMode } from './trackaudio';
import { Slicer, SlicerSelection } from './slicer';
import { ContextMenuContext } from '@/app/providers/contextmenu';
import { PromptMenuContext } from '@/app/providers/customprompt';
import { clamp } from '@/app/utils';

import {
  ResizingGroup,
  ResizingHandle,
  ResizingWindowPanel
} from '../shared/resizablepanels';
import {
  addWindowToAction,
  batchRemoveWindowWithUniqueIdentifier,
  removeWindowWithUniqueIdentifier,
  setWindowPosition,
} from '@/app/state/windowstore';
import {
  createAudioData,
  css,
  getTrackAudioElement,
  getTrackAudioOrTrackElement,
  getTrackElement,
  traverseParentUntilOneCondition
} from '@/app/services/utils';
import {
  addAudioToTrack,
  AudioTrackDetails,
  deleteAudioFromTrack,
  selectTracksWithinSpecifiedRegion,
  setOffsetDetailsToAudioTrack,
  setOffsetDetailsToMultipleAudioTrack,
  sliceAudioTracks,
  Status,
  togglePlay,
  rollbackChanges,
  cloneAudioTrack,
  cloneMultipleAudioTrack,
  deleteMultipleAudioTrack,
  ScheduledInformation,
  SEC_TO_MICROSEC,
  deselectAllTracks,
  selectAllTracks,
  selectTracksWithinSelectedSeekbarSection,
  TrackInformation
} from '@/app/state/trackdetails/trackdetails';
import {
  getRandomWindowId
} from '@/app/services/random';
import { WindowManipulationMode } from '../shared/window';
import {
  changeHistory,
  WorkspaceChange
} from '@/app/services/changehistory';

/**
 * @description Movable Type, for handling all the move events.
 */
export enum MovableType {
  /**
   * @description None
   */
  None,
  /**
   * @description Scheduled Track to be moved.
   */
  ScheduledTrack,
  /**
   * @description Window to be moved.
   */
  Window
}

export function Editor() {
  // All states
  const [anchorX, setAnchorX] = React.useState(0);
  const [anchorY, setAnchorY] = React.useState(0);
  const [mode, setMode] = React.useState<AudioTrackManipulationMode>(AudioTrackManipulationMode.None);
  const [initialTrackWidth, setInitialTrackWidth] = React.useState(0);
  const [initialScrollLeft, setInitialScrollLeft] = React.useState(0);
  const [position, setPosition] = React.useState(0);
  // The entity that is movable is either a track or a window.
  const [movableEntity, setMovableEntity] = React.useState<HTMLElement | null>(null);
  const [movableType, setMovableType] = React.useState(MovableType.None);
  const [windowManipulationMode, setWindowManipulationMode] = React.useState(WindowManipulationMode.None);

  const [height, setHeight] = React.useState(90);
  const [dragged, setDragged] = React.useState(false);
  const [lineDist, setLineDist] = React.useState(100);
  const [trackForEdit, selectTrackForEdit] = React.useState<AudioTrackDetails | null>(null);
  const [selectedRegion, setSelectedRegion] = React.useState<TimeSectionSelection | null>(null);
  const [currentMode, setCurrentMode] = React.useState<ModeType>(ModeType.DefaultSelector);

  // Redux states
  const store = useSelector((state: RootState) => state.audioReducer.audioBankList);
  const currentTrack = useSelector((state: RootState) => state.selectedAudioSliceReducer.value);
  const trackDetails = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails);
  const trackTimeDurationMicros = useSelector((state: RootState) => state.trackDetailsReducer.maxTimeMicros);
  const status = useSelector((state: RootState) => state.trackDetailsReducer.status);
  const windows = useSelector((state: RootState) => state.windowStoreReducer.contents);
  const ordering = useSelector((state: RootState) => state.windowStoreReducer.ordering);
  const dispatch = useDispatch();

  // Refs
  const ref = React.createRef<HTMLDivElement>();
  const seekbarRef = React.useRef<HTMLDivElement | null>(null);
  const seekerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollPageRef = React.createRef<HTMLDivElement>();
  const verticalScrollPageRef = React.createRef<HTMLDivElement>();

  // Context
  const {
    hideContextMenu,
    isContextOpen,
  } = React.useContext(ContextMenuContext);

  const {
    hidePrompt,
    isPromptOpen
  } = React.useContext(PromptMenuContext);

  // Other variables
  const totalTracks = trackDetails.length;
  const timeUnitPerLineDistInSeconds = 5;
  const timeUnitPerLineMicros = timeUnitPerLineDistInSeconds * SEC_TO_MICROSEC;
  const width = (trackTimeDurationMicros / timeUnitPerLineMicros) * lineDist;
  const totalLines = Math.floor(width / lineDist);

  const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
  audioManager.cleanupSelectedDOMElements();

  function setOffset(track: HTMLElement, lineDist: number) {
    const audioElement = getTrackAudioElement(track) as HTMLElement;

    if (audioElement) {
      const audioIndex = audioElement.getAttribute('data-audioid');
      const audioIntIndex = audioIndex ? parseInt(audioIndex) : 0;

      const trackIndex = audioElement.getAttribute('data-trackid');
      const trackIntIndex = trackIndex ? parseInt(trackIndex) : 0;

      const offsetX = audioElement.offsetLeft;
      /// Starting from offset in millis.
      const offsetInMicros = Math.round((offsetX / lineDist) * timeUnitPerLineMicros);
      const startOffsetInMicros = Math.round((audioElement.scrollLeft / lineDist) * timeUnitPerLineMicros);
      // const
      const endOffsetInMicros = Math.round(((audioElement.scrollLeft + audioElement.clientWidth) / lineDist) * timeUnitPerLineMicros);

      dispatch(setOffsetDetailsToAudioTrack({
        trackNumber: trackIntIndex,
        audioIndex: audioIntIndex,
        offsetInMicros,
        startOffsetInMicros,
        endOffsetInMicros
      }));

      return {
        offsetInMicros,
        startOffsetInMicros,
        endOffsetInMicros
      };
    }

    return {
      offsetInMicros: 0,
      startOffsetInMicros: 0,
      endOffsetInMicros: 0
    }
  }

  function onFileDrop(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    event.preventDefault();
    event.stopPropagation();
    const trackElement = getTrackElement(event.target as HTMLElement);

    // Use track-id to drop selected file on the track.
    let index = trackElement?.getAttribute('data-id');
    let intIndex = index ? parseInt(index) : 0;
    const offsetX = event.nativeEvent.offsetX;
    const scrollOffsetX = trackElement?.scrollLeft || 0;

    const timeOffset = Math.round(((scrollOffsetX + offsetX) / lineDist) * timeUnitPerLineMicros);

    /// Assert files uploaded are audio, by checking MIME
    const file = event.nativeEvent.dataTransfer?.files[0];
    if (!file || !file.type.startsWith('audio/')) return;
    
    if (event.nativeEvent.dataTransfer?.files) {
      createAudioData(
        store,
        event.nativeEvent.dataTransfer.files[0],
      ).then(data => {
        if (data !== null) {
          dispatch(addIntoAudioBank(data));
          dispatch(addAudioToTrack({
            trackNumber: intIndex,
            track: {
              ...data,
              trackDetail: {
                trackNumber: intIndex,
                offsetInMicros: timeOffset,
                scheduledKey: Symbol(),
                id: -1,
                startOffsetInMicros: 0,
                playbackRate: 1,
                endOffsetInMicros: (data.duration as number) * SEC_TO_MICROSEC,
                selected: false
              }
            }
          }));
        }
      })
    }
  }

  function setTrackDraggingMode(
    event: React.MouseEvent<HTMLDivElement, DragEvent>,
    desiredAudioElement: HTMLElement
  ) {
    const element = desiredAudioElement;
    const { clientX, offsetX } = event.nativeEvent;
    const { scrollLeft, clientWidth } = desiredAudioElement;
    const attribute = element.getAttribute('data-selected');

    if (
      element.classList.contains('cursor-e-resize') ||
      element.classList.contains('cursor-w-resize')
    ) {
      setInitialTrackWidth(clientWidth);
      setInitialScrollLeft(scrollLeft);

      if (element.classList.contains('cursor-w-resize')) {
        setAnchorX(clientX - 2 * (offsetX - scrollLeft));
        setMode(AudioTrackManipulationMode.ResizeStart);
      } else {
        setAnchorX(clientX);
        setMode(AudioTrackManipulationMode.ResizeEnd);
      }
    } else if (element.classList.contains('cursor-grab')) {
      setMode(AudioTrackManipulationMode.Move);
      setAnchorX(clientX);
    } else {
      setAnchorX(clientX);
      setMode(AudioTrackManipulationMode.None);
    }

    setDragged(false);
    
    const trackId = element.getAttribute('data-trackid');
    const audioId = element.getAttribute('data-audioid');
    const trackNumber = trackId ? parseInt(trackId) : 0;
    const audioIndex = audioId ? parseInt(audioId) : 0;

    if (
      !trackForEdit || 
      (trackForEdit.trackDetail.scheduledKey !== trackDetails[trackNumber][audioIndex].trackDetail.scheduledKey)
    ) {
      selectTrackForEdit(trackDetails[trackNumber][audioIndex]);
      setTimeout(() => selectTrackForEdit(null), 300);
    } else {
      addWindowToAction(
        dispatch, 
        {
          header: <><b>Track</b>: {trackForEdit.audioName}</>,
          props: {
            trackNumber,
            audioId: audioIndex,
            w: 780,
            timePerUnitLineDistanceSecs: timeUnitPerLineDistInSeconds,
            h: 100,
          },
          windowSymbol: Symbol(),
          view: AudioWaveformEditor,
          x: scrollPageRef.current?.scrollLeft ?? 0,
          y: scrollPageRef.current?.scrollTop ?? 0,
          visible: true,
          propsUniqueIdentifier: trackForEdit.trackDetail.scheduledKey,
          windowId: getRandomWindowId()
        }
      );

      selectTrackForEdit(null);
    }

    /// Manipulating multiple tracks at once.
    if (attribute === 'true') {
      if (event.shiftKey) {
        const allSelectedTracks = audioManager.getMultiSelectedTrackInformation();
        dispatch(cloneMultipleAudioTrack(allSelectedTracks));
      }
    } else {
      if (event.shiftKey) {
        dispatch(cloneAudioTrack({ trackNumber, audioIndex }));
      }

      const left = element.offsetLeft;
      setPosition(left);
      
      if (
        !trackDetails[trackNumber][audioIndex].trackDetail.selected &&
        audioManager.isMultiSelected()
      ) {
        dispatch(deselectAllTracks());
        audioManager.clearSelection();
      }

      dispatch(selectAudio(trackDetails[trackNumber][audioIndex]));
    }
    setMovableEntity(element as HTMLElement);
    setMovableType(MovableType.ScheduledTrack);
  }

  function isAudioTrack(element: HTMLElement) {
    return element.classList.contains('track-audio');
  }

  function isTrack(element: HTMLElement) {
    return element.classList.contains('track');
  }

  function isWindowHeader(element: HTMLElement) {
    return element.classList.contains('topbar');
  }

  /**
   * Setting drag type
   * 
   * 1. If the cursor is just at the start or end of the track, then let user
   * change the start point of the track
   * 2. otherwise, let the user move the track
   * @param event React event
   * returns void
   */
  function settingDrag(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    if (event.buttons === 1) {
      const element = event.target as HTMLElement;
      const fnArray = [isAudioTrack, isTrack, isWindowHeader];

      // Improvement: Perform until workspace is encountered instead of nullcheck
      const {
        index,
        expectedNode
      } = traverseParentUntilOneCondition(element, fnArray);

      switch (index) {
        case 0: {
          event.preventDefault();
          setTrackDraggingMode(event, expectedNode);
          break;
        }

        case 1: {
          event.preventDefault();
          addCurrentTrack(event, expectedNode);
          break;
        }

        case 2: {
          event.preventDefault();
          setupDraggingWindow(event, expectedNode);
          break;
        }

        case -1: {
          break;
        }
      }
    }
  }

  /**
   * Unset drag mode
   * @param event 
   */
  function unsetDragMode(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    switch (movableType) {
      case MovableType.ScheduledTrack: {
        unsetDrag(event);
        break;
      }

      case MovableType.Window: {
        unsetWindowDrag(event);
        break;
      }
    }
  }

  function setupDraggingWindow(
    event: React.MouseEvent<HTMLElement, DragEvent>,
    topbarElement: HTMLElement
  ) {
    const parentElement = topbarElement.parentElement as HTMLElement;
    setAnchorX(event.nativeEvent.clientX);
    setAnchorY(event.nativeEvent.clientY);
    setMovableEntity(parentElement);
    setMovableType(MovableType.Window);
    setWindowManipulationMode(WindowManipulationMode.Move);
  }

  function dragWindow(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    const element: HTMLElement = movableEntity as HTMLElement;

    const diffAnchorX = event.nativeEvent.clientX - anchorX;
    const diffAnchorY = event.nativeEvent.clientY - anchorY;
    const windowIdString = element.getAttribute('data-windowid') as string;
    const orderingIndex = parseInt(windowIdString);
    const windowId = ordering[orderingIndex];
    const left = windows[windowId].x;
    const top = windows[windowId].y;

    Object.assign(
      element.style,
      {
        left: left + diffAnchorX + 'px',
        top: top + diffAnchorY + 'px'
      }
    );
  }

  function dragTrack(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    if (mode !== AudioTrackManipulationMode.None && event.buttons === 1 && movableEntity) {
      event.preventDefault();
      const selectedAttr = movableEntity.getAttribute('data-selected');
      const first = scrollPageRef.current ? scrollPageRef.current.offsetLeft + (isChrome ? 6 : 0) : 0;
      const diffAnchorX = Math.max(first, event.nativeEvent.clientX) - anchorX;

      if (selectedAttr === 'true') {
        switch (mode) {
          case AudioTrackManipulationMode.Move: {
            audioManager.applyTransformationToMultipleSelectedTracks(diffAnchorX);
            break;
          }

          case AudioTrackManipulationMode.ResizeStart: {
            audioManager.applyResizingStartToMultipleSelectedTracks(diffAnchorX);
            break;
          }

          case AudioTrackManipulationMode.ResizeEnd: {
            audioManager.applyResizingEndToMultipleSelectedTracks(diffAnchorX);
            break;
          }

          default: break;
        }
      } else {
        switch (mode) {
          // Change position
          case AudioTrackManipulationMode.Move: {
            movableEntity.style.left = clamp(position + diffAnchorX, 0, width) + 'px';
            setDragged(diffAnchorX !== 0);
            break;
          }

          // Manipulate width, scrollLeft and offset based on the initial position.
          // The width cannot exceed the last point of the whole track (not the scrollwidth)
          case AudioTrackManipulationMode.ResizeStart: {
            // Setting maxWidth
            const maxWidth = Math.min(position, initialScrollLeft) + initialTrackWidth;
            const width = clamp(initialTrackWidth - diffAnchorX, 0, maxWidth)

            // Setting left
            const minLeft = Math.max(0, position - initialScrollLeft);
            const maxLeft = position + initialTrackWidth;
            const left = clamp(position + diffAnchorX, minLeft, maxLeft);

            Object.assign(
              movableEntity.style,
              {
                width: width + 'px',
                left: left + 'px'
              }
            );

            movableEntity.scrollLeft = Math.max(initialScrollLeft + diffAnchorX, initialScrollLeft - position);
            setDragged(diffAnchorX !== 0);
            break;
          }

          // Manipulate width, scrollLeft and offset based on the initial position.
          // The width cannot exceed the scroll width.
          case AudioTrackManipulationMode.ResizeEnd: {
            movableEntity.style.width = Math.min(
              movableEntity.scrollWidth - 2 * initialScrollLeft,
              initialTrackWidth + diffAnchorX
            ) + 'px';

            setDragged(diffAnchorX !== 0);
            break;
          }

          default: {
            break;
          }
        }
      }
    }
  }

  function unsetWindowDrag(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    const element: HTMLElement = movableEntity as HTMLElement;

    const diffAnchorX = event.nativeEvent.clientX - anchorX;
    const diffAnchorY = event.nativeEvent.clientY - anchorY;

    const windowIdString = element.getAttribute('data-windowid') as string;
    const orderingIndex = parseInt(windowIdString);
    const windowId = ordering[orderingIndex];
    const left = windows[windowId].x;
    const top = windows[windowId].y;

    dispatch(setWindowPosition({
      x: left + diffAnchorX,
      y: top + diffAnchorY,
      windowSymbol: windowId
    }));

    setMovableEntity(null);
    setMovableType(MovableType.None);
    setAnchorX(0);
    setAnchorY(0);
  }

  /**
   * Unset the drag:
   * 
   * Based on the action taken, apply all the changes made to the track.
   * 1. If the track is grown or shrunk, then apply changes effectively.
   * 2. Otherwise, track only movement changes.
   * 
   * @param event 
   * @returns void
   */
  function unsetDrag(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    if (!movableEntity) return;
    const selectedAttr = movableEntity.getAttribute('data-selected');

    if (selectedAttr === 'true') {
      const allTrackElements = audioManager.useManager().getNewPositionForMultipleSelectedTracks();
      const allTrackNumbers: number[] = [],
        allAudioIndexes: number[] = [],
        allStartOffsetsInMicros: number[] = [],
        allEndOffsetsInMicros: number[] = [],
        allOffsetsInMicros: number[] = [];
      
      allTrackElements.forEach((element) => {
        const { domElement, finalPosition, finalScrollLeft, finalWidth } = element;
        const audioIndex = domElement.getAttribute('data-audioid') as string;
        const audioIntIndex = parseInt(audioIndex);

        const trackIndex = domElement.getAttribute('data-trackid') as string;
        const trackIntIndex = parseInt(trackIndex);

        const timeOffset = Math.round((finalPosition / lineDist) * timeUnitPerLineMicros);
        const startTimeOffset = Math.round((finalScrollLeft / lineDist) * timeUnitPerLineMicros);
        const endTimeOffset = Math.round(((finalWidth + finalScrollLeft) / lineDist) * timeUnitPerLineMicros);

        allTrackNumbers.push(trackIntIndex);
        allAudioIndexes.push(audioIntIndex);
        allOffsetsInMicros.push(timeOffset);
        allStartOffsetsInMicros.push(startTimeOffset);
        allEndOffsetsInMicros.push(endTimeOffset);
      });

      dispatch(setOffsetDetailsToMultipleAudioTrack({
        allTrackNumbers,
        allAudioIndexes,
        allOffsetsInMicros,
        allStartOffsetsInMicros,
        allEndOffsetsInMicros
      }));

      const movedTrackInfo: AudioTrackDetails[] = [];

      allTrackNumbers.forEach((trackNumber, index: number) => {
        const audioIndex = allAudioIndexes[index], 
        offsetInMicros = allOffsetsInMicros[index],
        startOffsetInMicros = allStartOffsetsInMicros[index],
        endOffsetInMicros = allEndOffsetsInMicros[index];

        const track = trackDetails[trackNumber][audioIndex];

        movedTrackInfo.push({
          ...track,
          trackDetail: {
            ...track.trackDetail,
            offsetInMicros,
            startOffsetInMicros,
            endOffsetInMicros
          }
        });
      });

      audioManager.rescheduleAllTracks(trackDetails, movedTrackInfo);
    } else {
      const {
        offsetInMicros,
        startOffsetInMicros,
        endOffsetInMicros
      } = setOffset(movableEntity, lineDist);

      const audioElement = getTrackAudioElement(movableEntity) as HTMLElement;
      const audioIndex = audioElement.getAttribute('data-audioid');
      const audioIntIndex = audioIndex ? parseInt(audioIndex) : 0;

      const trackIndex = audioElement.getAttribute('data-trackid');
      const trackIntIndex = trackIndex ? parseInt(trackIndex) : 0;
      const track = trackDetails[trackIntIndex][audioIntIndex];

      const trackInformation: ScheduledInformation & TrackInformation = {
        trackNumber: trackIntIndex,
        offsetInMicros,
        scheduledKey: track.trackDetail.scheduledKey,
        endOffsetInMicros,
        id: track.trackDetail.id,
        playbackRate: 1,
        startOffsetInMicros,
        selected: track.trackDetail.selected
      };

      audioManager
        .useManager()
        .rescheduleAllTracks(
          trackDetails,
          [{
            ...track,
            trackDetail: trackInformation
          }]
        )
    }

    setAnchorX(0);
    setMode(AudioTrackManipulationMode.None);
    setMovableEntity(null);
    setMovableType(MovableType.None);
    setInitialTrackWidth(0);
    setInitialScrollLeft(0);
  }

  function dragOrResizeElement(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    switch (movableType) {
      case MovableType.ScheduledTrack: {
        dragTrack(event);
        break;
      }

      case MovableType.Window: {
        dragWindow(event);
        break;
      }
    }
  }

  function attemptFilling(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    
  }

  function deleteAudio(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    event.preventDefault();

    const element = event.nativeEvent.target as HTMLElement;
    const parOrTrack = getTrackAudioOrTrackElement(element) as HTMLElement;

    if (!parOrTrack?.classList.contains('track-audio')) return;
    const trackElement = getTrackElement(parOrTrack) as HTMLElement;

    if (trackElement) {
      const index = trackElement.getAttribute('data-id') as string;
      const trackNumber = parseInt(index);
      const audioElement = getTrackAudioElement(event.nativeEvent.target as HTMLElement) as HTMLElement;

      if (audioElement) {
        const audioIndex = audioElement.getAttribute('data-audioid');
        const audioIntIndex = audioIndex ? parseInt(audioIndex) : 0;
        const audioTrack = trackDetails[trackNumber][audioIntIndex];

        audioManager.useManager().removeTrackFromScheduledNodes(audioTrack);
        dispatch(removeWindowWithUniqueIdentifier(audioTrack.trackDetail.scheduledKey));
        dispatch(deleteAudioFromTrack({
          trackNumber,
          audioIndex: audioIntIndex
        }));
      }
    }
  }

  function addCurrentTrack(
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    desiredElement: HTMLElement
  ) {
    if (!audioManager.getAudioBuffer(currentTrack.audioId)) {
      return;
    }

    const index = desiredElement.getAttribute('data-id');
    const trackNumber = index ? parseInt(index) : 0;
    const offsetX = event.nativeEvent.offsetX;
    const offsetInMicros = Math.round((offsetX / lineDist) * timeUnitPerLineMicros);

    const newTrack = {
      ...currentTrack,
      trackDetail: {
        ...currentTrack.trackDetail,
        offsetInMicros,
        id: -1,
        trackNumber,
        scheduledKey: Symbol(),
      }
    };

    dispatch(addAudioToTrack({
      trackNumber,
      track: newTrack
    }));

    audioManager.useManager().scheduleSingleTrack(newTrack.audioId, newTrack.trackDetail);
  }

  /**
   * - [ ] Need better way to use keyboard events.
   * @param event 
   */
  function onKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case ' ': {
        event.preventDefault();
        const newStatus = status === Status.Play ? Status.Pause : Status.Play;
        dispatch(togglePlay(newStatus));
        break;
      }

      case 'Delete': {
        event.preventDefault();

        if (audioManager.isMultiSelected()) {
          const selectedTrackDetails = audioManager.getMultiSelectedTrackInformation();
          audioManager.clearSelection();
          audioManager.removeScheduledTracksFromScheduledKeys(selectedTrackDetails.scheduledKeys);
          dispatch(deleteMultipleAudioTrack(selectedTrackDetails));
          dispatch(batchRemoveWindowWithUniqueIdentifier(selectedTrackDetails.scheduledKeys))
        }
        break;
      }

      // To do: Remove selected flag if exists.
      case 'Escape': {
        hidePrompt();
        break;
      }

      case 'a':
      case 'A': {
        if (event.ctrlKey) {
          event.preventDefault();
          dispatch(selectAllTracks());
        }

        break;
      }

      case 'z':
      case 'Z': {
        if (event.ctrlKey && event.shiftKey) {
          const trackChanges = changeHistory.rollbackChange(true);

          if (trackChanges) {
            switch (trackChanges.workspaceChange) {
              case WorkspaceChange.TrackChanges: {
                dispatch(rollbackChanges({
                  updatedChanges: trackChanges.updatedValues,
                  redo: true
                }));
                break;
              }

              case WorkspaceChange.KnobChanges: {
                break;
              }
            }
          }
        } else if (event.ctrlKey) {
          const trackChanges = changeHistory.rollbackChange();

          if (trackChanges) {
            switch (trackChanges.workspaceChange) {
              case WorkspaceChange.TrackChanges: {
                dispatch(rollbackChanges({
                  updatedChanges: trackChanges.updatedValues,
                  redo: false
                }))
                break;
              }

              case WorkspaceChange.KnobChanges: {
                break;
              }
            }
          }
        }

        break;
      }

      default: {
        break;
      }
    }
  }

  function adjustZooming(event: WheelEvent, newLineDist: number) {
    if (scrollPageRef.current) {
      const target = event.target as HTMLElement;
      const trackAudio = getTrackAudioElement(target) as HTMLElement | null;
      const cursorPosition = (trackAudio ? trackAudio.offsetLeft : 0) + event.offsetX;
      const time = (cursorPosition / lineDist) * timeUnitPerLineDistInSeconds;
      const newCursorPosition = (time * newLineDist) / timeUnitPerLineDistInSeconds;
      const offsetFromScreen = cursorPosition - scrollPageRef.current.scrollLeft;

      scrollPageRef.current.scrollLeft = Math.floor(newCursorPosition - offsetFromScreen);
    }
  }

  /**
   * @description Zooming-in or zooming-out
   * @todo Is there a performant way?
   * @param event Wheel Event
   * @returns void
   */
  function maybeZoom(event: WheelEvent) {
    /// Use custom zoom-in/zoom-out logic
    if (event.ctrlKey || event.altKey) {
      // check if the cursor was within the workspace
      let element = event.target as HTMLElement;

      while (element && !element.classList.contains('workspace')) {
        element = element.parentElement as HTMLElement;
      }

      if (!element) return;

      event.preventDefault();

      /// Check left, and right ratio and scroll based on cursor position
      if (event.ctrlKey) {
        if (event.deltaY > 0) {
          const newLineDist = Math.max(Math.round(lineDist * 0.92), 40);
          adjustZooming(event, newLineDist);
          setLineDist(newLineDist);
        } else if (event.deltaY < 0) {
          const newLineDist = Math.min(Math.round(lineDist * 1.08), 400);
          adjustZooming(event, newLineDist);
          setLineDist(newLineDist);
        }
      } else if (event.altKey) {
        if (event.deltaY > 0) {
          const newHeight = Math.min(Math.round(height * 1.08), 120);
          setHeight(newHeight);
        } else {
          const newHeight = Math.max(Math.round(height * 0.92), 50);
          setHeight(newHeight);
        }
      }
    }
  }

  function sliceIntersectingTracks(sliceInformation: SlicerSelection) {
    dispatch(sliceAudioTracks(sliceInformation));
  }

  function selectTracksEnveloped(event: RegionSelection) {
    dispatch(selectTracksWithinSpecifiedRegion(event));
  }

  function onSelectingTime(event: TimeSectionSelection | null) {
    if (event) {
      dispatch(selectTracksWithinSelectedSeekbarSection(event));
    } else {
      dispatch(deselectAllTracks());
    }

    audioManager.selectTimeframe(event);

    setSelectedRegion(event);
  }

  // Manage key events on last interacted 
  // wheel: is it good to do here??
  React.useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('wheel', maybeZoom, {passive: false});

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('wheel', maybeZoom);
    }
  }, [lineDist, status, height]);

  function checkContextMenu() {
    if (isContextOpen()) {
      hideContextMenu();
    }

    if (isPromptOpen()) {
      hidePrompt();
    }
  }

  function onScroll() {
    if (scrollPageRef.current && seekbarRef.current) {
      const left = scrollPageRef.current.scrollLeft;
      seekbarRef.current.scrollLeft = left;

      if (seekerRef.current) {
        seekerRef.current.style.left = -left + 'px';
      }

      if (ref.current) {
        ref.current.scrollTop = scrollPageRef.current.scrollTop;
      }
    }
  }

  const totalHeight = height * audioManager.totalTrackSize;

  // Next plans:
  // 1. Undo/redo Knobs and Sliders.
  // 2. Tempo based timeframing
  // 3. Resizable windows.
  return (
    <>
      <div
        className="h-screen flex flex-col max-h-screen text-col"
        onClick={checkContextMenu}
        onDrop={onFileDrop}
        onMouseDown={settingDrag}
        onMouseMove={dragOrResizeElement}
        onMouseUp={unsetDragMode}
        onMouseLeave={unsetDragMode}
        onContextMenu={deleteAudio}
      >
        <div className="player">
          <Player />
          <WindowManager />
        </div>
        <ResizingGroup className="max-h-[92dvh] max-w-full">
          <ResizingWindowPanel
            initialWidth={300}
            className="track-files"
          >
            <AudioTrackList />
          </ResizingWindowPanel>
          <ResizingHandle />
          <ResizingWindowPanel
            className="workspace flex flex-col max-w-full overflow-hidden min-w-screen"
            ref={verticalScrollPageRef}
            data-cursor={mode}
          >
            <div className="timeframe-header">
              <Toolkit
                onModeSelect={setCurrentMode}
                activeMode={currentMode}
              />
            </div>
            <div className="flex flex-row max-w-full overflow-hidden min-w-screen">
              <div className="track-element flex flex-col min-h-28">
                <div className="min-h-[62px] max-h-[62px] min-w-full bg-darker border-t border border-darker-2"></div>
                <div ref={ref} className="track-list custom-list pb-2 relative overflow-hidden h-full max-h-full">
                  {
                    Array.from({length: totalTracks}, (_, index: number) => (
                      <div 
                        key={index}
                        className="track-info bg-darker box-border border border-solid border-darker-2 rounded-l-md text-center content-center items-center min-w-44 max-w-44"
                        style={{height: height + 'px'}}
                      >
                        <TrackInfo id={index} />
                      </div>
                    ))
                  }
                </div>
              </div>
              <div className="track-info rounded-r-md text-center min-w-[0%] max-w-full">
                <div className="workspace relative bg-primary overflow-hidden h-full">
                  <Seekbar
                    mode={currentMode}
                    totalLines={totalLines}
                    h={height}
                    w={width}
                    scrollRef={seekbarRef}
                    seekerRef={seekerRef}
                    lineDist={lineDist}
                    timeUnitPerLineDistInSeconds={timeUnitPerLineDistInSeconds}
                    onTimeSelection={onSelectingTime}
                  />
                  <div
                    className={css(
                      "tracks relative overflow-scroll max-h-full",
                      { 'custom-scroll': isChrome }
                    )}
                    style={{maxHeight: 'calc(100% - 62px)'}}
                    ref={scrollPageRef}
                    onDragOver={(e) => e.preventDefault()}
                    onScroll={onScroll}
                  >
                    {
                      currentMode === ModeType.RegionSelect && 
                        <RegionSelect
                          w={width}
                          trackHeight={height}
                          h={totalHeight}
                          lineDist={lineDist}
                          unitTime={timeUnitPerLineDistInSeconds}
                          onRegionSelect={selectTracksEnveloped}
                        />
                    }
                    {
                      currentMode === ModeType.Slicer && 
                        <Slicer
                          w={width}
                          trackHeight={height}
                          h={totalHeight}
                          lineDist={lineDist}
                          unitTime={timeUnitPerLineDistInSeconds}
                          onSliceSelect={sliceIntersectingTracks}
                        />
                    }
                    {
                      Array.from({length: totalTracks}, (_, index: number) => (
                        <Tracks 
                          lineDist={lineDist}
                          id={index}
                          key={index}
                          w={width}
                          selectedContent={selectedRegion}
                          timeUnitPerLineDistanceSecs={timeUnitPerLineDistInSeconds}
                          h={height}
                        />
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>
          </ResizingWindowPanel>
        </ResizingGroup>
      </div>
    </>
  );
}
