import React from 'react';
import { Tracks } from './tracks';
import { TrackInfo } from './trackinfo';
import { AudioTrackList } from './audiotracklist';
import { Seekbar } from './seekbar';
import { useDispatch, useSelector } from 'react-redux';
import { addAudio } from '@/app/state/audiostate';
import { RootState } from '@/app/state/store';
import { selectAudio } from '@/app/state/selectedaudiostate';
import { audioManager } from '@/app/services/audiotrackmanager';
import { Player } from '../player/player';
import { AudioWaveformEditor } from '../waveform/waveform';
import { WindowManager } from '../shared/windowmanager';
import { addWindow, setWindowPosition } from '@/app/state/windowstore';
import { ModeType, Toolkit } from './toolkit';
import { RegionSelect, RegionSelection } from './regionselect';
import { AudioTrackManipulationMode } from './trackaudio';
import { Slicer, SlicerSelection } from './slicer';
import { ContextMenuContext } from '@/app/providers/contextmenu';

import {
  cloneAudioTrack,
  cloneMultipleAudioTrack,
  deleteMultipleAudioTrack,
  deselectAllTracks,
  ScheduledInformation,
  selectAllTracks
} from '../../state/trackdetails';
import {
  createAudioData,
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
  setOffsetInMillisToAudioTrack,
  setOffsetInMillisToMultipleAudioTrack,
  sliceAudioTracks,
  Status,
  togglePlay,
  TrackInformation
} from '@/app/state/trackdetails';
import { PromptMenuContext } from '@/app/providers/customprompt';

export enum MovableType {
  None,
  ScheduledTrack,
  Window
}

/**
 * Main editor for creating a workspace.
 * @returns editor JSX.Element
 */
export function Editor() {
  // All states
  const [set, isSet] = React.useState(false);
  const [anchorX, setAnchorX] = React.useState(0);
  const [anchorY, setAnchorY] = React.useState(0);
  const [mode, setMode] = React.useState<AudioTrackManipulationMode>(AudioTrackManipulationMode.None);
  const [initialTrackWidth, setInitialTrackWidth] = React.useState(0);
  const [initialScrollLeft, setInitialScrollLeft] = React.useState(0);
  const [position, setPosition] = React.useState(0);
  // The entity that is movable is either a track or a window.
  const [movableEntity, setMovableEntity] = React.useState<HTMLElement | null>(null);
  const [movableType, setMovableType] = React.useState(MovableType.None);

  const [height, setHeight] = React.useState(98 * audioManager.totalTrackSize);
  const [dragged, setDragged] = React.useState(false);
  const [lineDist, setLineDist] = React.useState(100);
  const [trackForEdit, selectTrackForEdit] = React.useState<AudioTrackDetails | null>(null);
  const [paintedTrackLast, selectPaintedTrackLast] = React.useState<AudioTrackDetails | null>(null);
  const [currentMode, setCurrentMode] = React.useState<ModeType>(ModeType.DefaultSelector);
  const [scroll, setScroll] = React.useState(0);

  // Redux states
  const store = useSelector((state: RootState) => state.audioReducer.contents);
  const currentTrack = useSelector((state: RootState) => state.selectedAudioSliceReducer.value);
  const trackDetails = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails);
  const trackTimeDurationMillis = useSelector((state: RootState) => state.trackDetailsReducer.maxTimeMillis);
  const status = useSelector((state: RootState) => state.trackDetailsReducer.status);
  const windows = useSelector((state: RootState) => state.windowStoreReducer.contents);

  // Refs
  const ref = React.createRef<HTMLDivElement>();
  const scrollPageRef = React.createRef<HTMLDivElement>();
  const verticalScrollPageRef = React.createRef<HTMLDivElement>();

  // Context
  const {
    hideContextMenu,
    isContextOpen,
    showContextMenu
  } = React.useContext(ContextMenuContext);

  const {
    hidePrompt,
    isPromptOpen
  } = React.useContext(PromptMenuContext);

  // Other variables
  const totalTracks = trackDetails.length;
  const timeUnitPerLineDistInSeconds = 5;
  const width = ((trackTimeDurationMillis / 1000) / timeUnitPerLineDistInSeconds) * lineDist;
  const totalLines = Math.floor(width / lineDist);
  const dispatch = useDispatch();

  const heightPerTrack = (height / totalTracks) - 2;
  const thickLineData = {
    lw: 2,
    content: Array.from(
      { length: totalLines }, 
      (_, index: number) => `M ${index * lineDist} 0 L ${index * lineDist} ${heightPerTrack}`
    ).join(' ')
  }

  const lineDist4 = (lineDist / 4);
  const thinLineData = {
    lw: 1,
    content: Array.from({length: totalLines}, (_, index: number) => {
      let p = `M ${index * lineDist + lineDist4} 0 L ${index * lineDist + lineDist4} ${heightPerTrack}`
      p += `M ${index * lineDist + lineDist4 * 2} 0 L ${index * lineDist + lineDist4 * 2} ${heightPerTrack}`
      p += `M ${index * lineDist + lineDist4 * 3} 0 L ${index * lineDist + lineDist4 * 3} ${heightPerTrack}`
      return p;
    }).join(' ')
  }

  const drawData = [thickLineData, thinLineData];

  /**
   * Set offset relative to the offset of current workspace.
   * 
   * @param track Track to move
   * @param lineDist Line Distance Info.
   * @returns Modified information about the audio track.
   */
  function setOffset(track: HTMLElement, lineDist: number) {
    const audioElement = getTrackAudioElement(track) as HTMLElement;

    if (audioElement) {
      const audioIndex = audioElement.getAttribute('data-audioid');
      const audioIntIndex = audioIndex ? parseInt(audioIndex) : 0;

      const trackIndex = audioElement.getAttribute('data-trackid');
      const trackIntIndex = trackIndex ? parseInt(trackIndex) : 0;

      const left = audioElement.style.left ?? '0px';
      const offsetX = parseFloat(left.substring(0, left.length - 2));

      /// Starting from offset in millis.
      const offsetInMillis = Math.round((offsetX / lineDist) * 5000);
      const startOffsetInMillis = Math.round((audioElement.scrollLeft / lineDist) * 5000);
      // const
      const endOffsetInMillis = Math.round(((audioElement.scrollLeft + audioElement.clientWidth) / lineDist) * 5000);

      dispatch(setOffsetInMillisToAudioTrack({
        trackNumber: trackIntIndex,
        audioIndex: audioIntIndex,
        offsetInMillis,
        startOffsetInMillis,
        endOffsetInMillis
      }));

      return {
        offsetInMillis,
        startOffsetInMillis,
        endOffsetInMillis
      }
    }

    return {
      offsetInMillis: 0,
      startOffsetInMillis: 0,
      endOffsetInMillis: 0
    }
  }

  /**
   * @description Performing action on dropping an audio file.
   * @param event Drop Event
   * @returns void.
   */
  function onFileDrop(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    event.preventDefault();
    event.stopPropagation();
    const trackElement = getTrackElement(event.target as HTMLElement);

    // Use track-id to drop selected file on the track.
    let index = trackElement?.getAttribute('data-id');
    let intIndex = index ? parseInt(index) : 0;
    const offsetX = event.nativeEvent.offsetX;
    const scrollOffsetX = trackElement?.scrollLeft || 0;

    const timeOffset = Math.round(((scrollOffsetX + offsetX) / lineDist) * 5 * 1000);

    /// Assert files uploaded are audio, by checking MIME
    const file = event.nativeEvent.dataTransfer?.files[0];
    if (!file || !file.type.startsWith('audio/')) return;
    
    if (event.nativeEvent.dataTransfer?.files) {
      createAudioData(
        store,
        event.nativeEvent.dataTransfer.files[0],
      ).then(data => {
        if (data !== null) {
          dispatch(addAudio(data));
          dispatch(addAudioToTrack({
            trackNumber: intIndex,
            trackDetails: {
              ...data,
              trackDetail: {
                trackNumber: intIndex,
                offsetInMillis: timeOffset,
                scheduledKey: Symbol(),
                startOffsetInMillis: 0,
                endOffsetInMillis: data.buffer?.duration as number,
                selected: false
              }
            }
          }));
        }
      })
    }
  }

  /**
   * @description Set Dragging Mode, either resizing or moving track, one or multiple tracks.
   * @param event Event triggered
   * @param desiredAudioElement Anchor Audio Element.
   */
  function setTrackDraggingMode(
    event: React.MouseEvent<HTMLDivElement, DragEvent>,
    desiredAudioElement: HTMLElement
  ) {
    const element = desiredAudioElement;

    setAnchorX(event.nativeEvent.clientX);
    const attribute = element.getAttribute('data-selected');

    if (element.classList.contains('cursor-e-resize')) {
      setInitialTrackWidth(element.clientWidth);
      setInitialScrollLeft(element.scrollLeft);
      setMode(AudioTrackManipulationMode.ResizeEnd);
    } else if (element.classList.contains('cursor-w-resize')) {
      setInitialTrackWidth(element.clientWidth);
      setInitialScrollLeft(element.scrollLeft);
      setMode(AudioTrackManipulationMode.ResizeStart);
    } else if (element.classList.contains('cursor-grab')) {
      setMode(AudioTrackManipulationMode.Move);
    } else {
      setMode(AudioTrackManipulationMode.None);
    }

    setDragged(false);
    
    const trackId = element.getAttribute('data-trackid');
    const audioId = element.getAttribute('data-audioid');
    const trackNumber = trackId ? parseInt(trackId) : 0;
    const audioIndex = audioId ? parseInt(audioId) : 0;

    if (!trackForEdit || (trackForEdit !== trackDetails[trackNumber][audioIndex])) {
      selectTrackForEdit(trackDetails[trackNumber][audioIndex]);
      setTimeout(() => selectTrackForEdit(null), 300);
    } else {
      dispatch(addWindow({
        header: <><b>Track</b>: {trackForEdit.audioName}</>,
        props: {
          track: trackForEdit,
          w: 780,
          h: 100,
        },
        windowSymbol: Symbol(),
        view: AudioWaveformEditor,
        x: scrollPageRef.current?.scrollLeft ?? 0,
        y: scrollPageRef.current?.scrollTop ?? 0,
        visible: true,
      }));

      selectTrackForEdit(null);
    }

    /// Manipulating multiple tracks at once.
    if (attribute === 'true') {
      if (event.shiftKey) {
        const allSelectedTracks = audioManager.getMultiSelectedTrackInformation();
        dispatch(cloneMultipleAudioTrack(allSelectedTracks));
      }
    } else {
      const audioIndex = element?.getAttribute('data-audioid');
      const audioIntIndex = audioIndex ? parseInt(audioIndex) : 0;
      const trackIndex = element?.getAttribute('data-trackid');
      const intIndex = trackIndex ? parseInt(trackIndex) : 0;

      if (event.shiftKey) {
        dispatch(cloneAudioTrack({ trackNumber: intIndex, audioIndex: audioIntIndex }));
      }

      const leftString = (element.style.left) || '0px';
      const left = parseInt(leftString.substring(0, leftString.length - 2));
      setPosition(left);
      
      if (
        !trackDetails[intIndex][audioIntIndex].trackDetail.selected &&
        audioManager.isMultiSelected()
      ) {
        dispatch(deselectAllTracks());
        audioManager.clearSelection();
      }

      dispatch(selectAudio(trackDetails[intIndex][audioIntIndex]));
    }
    setMovableEntity(element as HTMLElement);
    setMovableType(MovableType.ScheduledTrack);
  }

  /**
   * Check if element track is audio
   * @param element 
   * @returns 
   */
  function isAudioTrack(element: HTMLElement) {
    return element.classList.contains('track-audio');
  }

  /**
   * Check if element track is audio
   * @param element 
   * @returns 
   */
  function isTrack(element: HTMLElement) {
    return element.classList.contains('track');
  }

  /**
   * Check if element is a top of headbar.
   * @param element 
   * @returns 
   */
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
      event.preventDefault();
      const element = event.target as HTMLElement;
      const fnArray = [isAudioTrack, isTrack, isWindowHeader];

      // Improvement: Perform until workspace is encountered instead of nullcheck
      const {
        index,
        expectedNode
      } = traverseParentUntilOneCondition(element, fnArray);

      switch (index) {
        case 0: {
          setTrackDraggingMode(event, expectedNode);
          break;
        }

        case 1: {
          addCurrentTrack(event, expectedNode);
          break;
        }

        case 2: {
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

  /**
   * @description Set drag event for the window element.
   * This should also focus the current window, while moving rest of them at the last.
   * 
   * @param event 
   * @param topbarElement 
   */
  function setupDraggingWindow(
    event: React.MouseEvent<HTMLElement, DragEvent>,
    topbarElement: HTMLElement
  ) {
    const parentElement = topbarElement.parentElement as HTMLElement;
    setAnchorX(event.nativeEvent.clientX);
    setAnchorY(event.nativeEvent.clientY);
    setMovableEntity(parentElement);
    setMovableType(MovableType.Window);
  }

  /**
   * @description Drag Window based on the current limits
   * @param event 
   * @returns void.
   */
  function dragWindow(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    const element: HTMLElement = movableEntity as HTMLElement;

    const diffAnchorX = event.nativeEvent.clientX - anchorX;
    const diffAnchorY = event.nativeEvent.clientY - anchorY;
    const windowIdString = element.getAttribute('data-windowid') as string;
    const windowId = parseInt(windowIdString);
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

  /**
   * Drag the track onto new position.
   * @param event 
   * @returns void
   */
  function dragTrack(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    if (mode !== AudioTrackManipulationMode.None && event.buttons === 1 && movableEntity) {
      event.preventDefault();
      const audioElement = getTrackAudioElement(movableEntity) as HTMLElement;

      if (audioElement) {
        const selectedAttr = audioElement.getAttribute('data-selected');
        const diffAnchorX = event.nativeEvent.clientX - anchorX;

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
            case AudioTrackManipulationMode.Move: {
              // Change position
              movableEntity.style.left = Math.max(0, Math.min(width, position + diffAnchorX)) + 'px';
              setDragged(diffAnchorX !== 0);
              break;
            }
  
            case AudioTrackManipulationMode.ResizeStart: {
              // Manipulate width, scrollLeft and offset based on the initial position.
              // The width cannot exceed the last point of the whole track (not the scrollwidth)
              Object.assign(
                movableEntity.style,
                {
                  width: Math.min(
                    initialScrollLeft + initialTrackWidth,
                    initialTrackWidth - diffAnchorX
                  ) + 'px',
                  left: Math.max(
                    0,
                    position - initialScrollLeft,
                    position + diffAnchorX
                  ) + 'px'
                }
              );

              movableEntity.scrollLeft = initialScrollLeft + diffAnchorX;
              setDragged(diffAnchorX !== 0);
              break;
            }

            case AudioTrackManipulationMode.ResizeEnd: {
              // Manipulate width, scrollLeft and offset based on the initial position.
              // The width cannot exceed the scroll width.
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
  }

  /**
   * Apply changes to states after releasing mouse event by user.
   * @param event event details.
   */
  function unsetWindowDrag(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    const element: HTMLElement = movableEntity as HTMLElement;

    const diffAnchorX = event.nativeEvent.clientX - anchorX;
    const diffAnchorY = event.nativeEvent.clientY - anchorY;
    const windowIdString = element.getAttribute('data-windowid') as string;
    const windowId = parseInt(windowIdString);
    const left = windows[windowId].x;
    const top = windows[windowId].y;

    dispatch(setWindowPosition({ x: left + diffAnchorX, y: top + diffAnchorY, index: windowId }));

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
      const allElements = audioManager.useManager().getNewPositionForMultipleSelectedTracks();
      const allTrackNumbers: number[] = [],
        allAudioIndexes: number[] = [],
        allStartOffsetsInMillis: number[] = [],
        allEndOffsetsInMillis: number[] = [],
        allOffsetsInMillis: number[] = [];
      
      allElements.forEach((element) => {
        const { domElement, finalPosition, finalScrollLeft, finalWidth } = element;
        const audioIndex = domElement.getAttribute('data-audioid');
        const audioIntIndex = parseInt(audioIndex ?? '0');

        const trackIndex = domElement.getAttribute('data-trackid');
        const trackIntIndex = parseInt(trackIndex ?? '0');

        const timeOffset = Math.round((finalPosition / lineDist) * 5000);
        const startTimeOffset = Math.round((finalScrollLeft / lineDist) * 5000);
        const endTimeOffset = Math.round(((finalWidth + finalScrollLeft) / lineDist) * 5000);

        allTrackNumbers.push(trackIntIndex);
        allAudioIndexes.push(audioIntIndex);
        allOffsetsInMillis.push(timeOffset);
        allStartOffsetsInMillis.push(startTimeOffset);
        allEndOffsetsInMillis.push(endTimeOffset);
      });

      dispatch(setOffsetInMillisToMultipleAudioTrack({
        allTrackNumbers,
        allAudioIndexes,
        allOffsetsInMillis,
        allStartOffsetsInMillis,
        allEndOffsetsInMillis
      }));

      const movedTrackInfo: AudioTrackDetails[] = [];
      allTrackNumbers.forEach((trackNumber, index: number) => {
        const audioIndex = allAudioIndexes[index], 
          offsetInMillis = allOffsetsInMillis[index],
          startOffsetInMillis = allStartOffsetsInMillis[index],
          endOffsetInMillis = allEndOffsetsInMillis[index];

        const track = trackDetails[trackNumber][audioIndex];

        movedTrackInfo.push({
          ...track,
          trackDetail: {
            ...track.trackDetail,
            offsetInMillis,
            startOffsetInMillis,
            endOffsetInMillis
          }
        });
      });

      audioManager.rescheduleAllTracks(trackDetails, movedTrackInfo);
    } else {
      if (movableEntity) {
        if (movableEntity.classList.contains('track-audio')) {
          if (!dragged) {
            setAnchorX(0);
            setMode(AudioTrackManipulationMode.None);
            setMovableEntity(null);
            return;
          }
          setInitialTrackWidth(0);
          setInitialScrollLeft(0);

          const {
            offsetInMillis,
            startOffsetInMillis,
            endOffsetInMillis
          } = setOffset(movableEntity, lineDist);

          const audioElement = getTrackAudioElement(movableEntity) as HTMLElement;
          const audioIndex = audioElement.getAttribute('data-audioid');
          const audioIntIndex = audioIndex ? parseInt(audioIndex) : 0;

          const trackIndex = audioElement.getAttribute('data-trackid');
          const trackIntIndex = trackIndex ? parseInt(trackIndex) : 0;
          const currentTrack = trackDetails[trackIntIndex][audioIntIndex];

          const trackInformation: ScheduledInformation & TrackInformation = {
            trackNumber: trackIntIndex,
            offsetInMillis,
            scheduledKey: currentTrack.trackDetail.scheduledKey,
            endOffsetInMillis,
            startOffsetInMillis,
            selected: currentTrack.trackDetail.selected
          };

          audioManager
            .useManager()
            .rescheduleAllTracks(
              trackDetails,
              [{
                ...currentTrack,
                trackDetail: trackInformation
              }]
            )
        }
      }
    }
    setAnchorX(0);
    setMode(AudioTrackManipulationMode.None);
    setMovableEntity(null);
    setMovableType(MovableType.None);
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

  /**
   * @description attempt multiple paint on current selected audio track.
   * - [ ] To do: this function
   * @param event 
   */
  function attemptFilling(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    
  }

  function deleteAudio(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    event.preventDefault();

    const element = event.nativeEvent.target as HTMLElement;
    const parOrTrack = getTrackAudioOrTrackElement(element) as HTMLElement;

    if (!parOrTrack?.classList.contains('track-audio')) return;
    const trackElement = getTrackElement(parOrTrack) as HTMLElement;

    if (trackElement) {
      const index = trackElement.getAttribute('data-id');
      const trackNumber = index ? parseInt(index) : 0;
      const audioElement = getTrackAudioElement(event.nativeEvent.target as HTMLElement) as HTMLElement;

      if (audioElement) {
        const audioIndex = audioElement.getAttribute('data-audioid');
        const audioIntIndex = audioIndex ? parseInt(audioIndex) : 0;
        const audioTrack = trackDetails[trackNumber][audioIntIndex];
        audioManager.useManager().removeTrackFromScheduledNodes(audioTrack);

        dispatch(deleteAudioFromTrack({ trackNumber, audioIndex: audioIntIndex }));
      }
    }
  }

  /**
   * @description Add currently selected track to one of the tracks the
   * user last interacted with.
   * 
   * @param event Event related to interacted details.
   * @param desiredElement Element to work on
   * @returns void
   */
  function addCurrentTrack(
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    desiredElement: HTMLElement
  ) {
    if (!currentTrack.buffer) return;
    const index = desiredElement.getAttribute('data-id');
    const trackNumber = index ? parseInt(index) : 0;
    const offsetX = event.nativeEvent.offsetX;
    const offsetInMillis = Math.round((offsetX / lineDist) * 5000);

    const newTrack = {
      ...currentTrack,
      trackDetail: {
        ...currentTrack.trackDetail,
        offsetInMillis,
        trackNumber,
        scheduledKey: Symbol(),
      }
    };

    dispatch(addAudioToTrack({
      trackNumber,
      trackDetails: newTrack
    }));

    audioManager.useManager().scheduleSingleTrack(
      newTrack,
      trackNumber,
      offsetInMillis
    );
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
      default: {
        break;
      }
    }
  }

  function adjustZooming(event: WheelEvent, newLineDist: number) {
    if (scrollPageRef.current) {
      const cursorPosition = event.offsetX;
      const time = (cursorPosition / lineDist) * timeUnitPerLineDistInSeconds;
      const newCursorPosition = (time * newLineDist) / timeUnitPerLineDistInSeconds;
      const offsetFromScreen = event.offsetX - scrollPageRef.current.scrollLeft;

      // Based on these calculations, calculate scrollTo for new position
      setScroll(newCursorPosition - offsetFromScreen);
    }
  }

  /**
   * Zooming-in or zooming-out
   * @param event Wheel Event
   * @returns void
   */
  function maybeZoom(event: WheelEvent) {
    /// Use custom zoom-in/zoom-out logic
    if (event.ctrlKey) {
      // check if the cursor was within the workspace
      let element = event.target as HTMLElement;
      while (element && !element.classList.contains('workspace')) {
        element = element.parentElement as HTMLElement;
      }
      if (!element) return;

      event.preventDefault();

      /// Check left, and right ratio and scroll based on cursor position
      if (event.deltaY > 0) {
        const newLineDist = Math.max(lineDist - lineDist * 0.08, 40);
        adjustZooming(event, newLineDist);
        setLineDist(newLineDist);
      } else if (event.deltaY < 0) {
        const newLineDist = Math.min(lineDist + lineDist * 0.08, 500);
        adjustZooming(event, newLineDist);
        setLineDist(newLineDist);
      }
    }
  }

  /**
   * @description Slice intersected tracks in new track.
   * 
   * Improvement; move slicing logic in different file instead of dispatching,
   * to prevent audio scheduling inside the reducer method.
   * 
   * @param sliceInformation Information related to slicing of audio track.
   * @returns void.
   */
  function sliceIntersectingTracks(sliceInformation: SlicerSelection) {
    dispatch(sliceAudioTracks(sliceInformation));
  }

  /**
   * @description Select tracks that intersects the region selector.
   * @param event RegionSelection, describes the rectangular coordinates of selection
   * @returns void
   */
  function selectTracksEnveloped(event: RegionSelection) {
    dispatch(selectTracksWithinSpecifiedRegion(event));
  }

  React.useEffect(() => {
    if (ref.current && !set) {
      setHeight(ref.current.scrollHeight);
      isSet(true);
    }
  }, [set, height])

  React.useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('wheel', maybeZoom, {passive: false});

    if (scrollPageRef.current) {
      scrollPageRef.current.scrollLeft = scroll;
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('wheel', maybeZoom);
    }
  }, [lineDist, status]);

  function checkContextMenu() {
    if (isContextOpen()) {
      hideContextMenu();
    }

    if (isPromptOpen()) {
      hidePrompt();
    }
  }

  return (
    <>
      <div
        className="h-full flex flex-col max-h-screen"
        onClick={checkContextMenu}
        onDrop={onFileDrop}
      >
        <div className="player">
          <Player />
        </div>
        <div className="editor flex flex-row h-full box-border min-w-screen">
          <div className="track-files min-w-96 max-w-96">
            <AudioTrackList />
          </div>
          <div
            className="workspace flex flex-row max-w-full overflow-y-auto max-h-[92dvh] ml-2 min-w-screen"
            ref={verticalScrollPageRef}
            data-cursor={mode}
          >
            <div className="track-element flex flex-col min-h-28">
              <Toolkit onModeSelect={setCurrentMode} activeMode={currentMode} />
              <div ref={ref} className="track-list relative">
                {
                  Array.from({length: totalTracks}, (_, index: number) => (
                    <div 
                      key={index}
                      className="track-info min-h-28 bg-slate-800 border border-solid border-slate-900 rounded-l-md text-center content-center items-center min-w-44 max-w-44"
                    >
                      <TrackInfo 
                        id={index}
                        height={(height / totalTracks)}
                      />
                    </div>
                  ))
                }
              </div>
            </div>
            <div 
              className="track-info rounded-r-md text-center overflow-y-hidden overflow-x-scroll"
              style={{minHeight: height + 18 + 60 + 'px'}}
              ref={scrollPageRef}
            >
              <div className="workspace relative bg-slate-600 min-h-full min-w-screen" style={{ width: width + 'px' }}>
                <Seekbar 
                  totalLines={totalLines}
                  h={height}
                  w={width}
                  lineDist={lineDist}
                  timeUnitPerLineDistInSeconds={timeUnitPerLineDistInSeconds}
                />
                <div
                  className="tracks relative"
                  onDragOver={(e) => e.preventDefault()}
                  onMouseDown={settingDrag}
                  onMouseMove={dragOrResizeElement}
                  onMouseUp={unsetDragMode}
                  onMouseLeave={unsetDragMode}
                  onContextMenu={deleteAudio}
                >
                  <WindowManager />
                  {
                    currentMode === ModeType.RegionSelect && 
                      <RegionSelect
                        w={width}
                        trackHeight={(height/totalTracks)}
                        h={height}
                        lineDist={lineDist}
                        unitTime={timeUnitPerLineDistInSeconds}
                        onRegionSelect={selectTracksEnveloped}
                      />
                  }
                  {
                    currentMode === ModeType.Slicer && 
                      <Slicer
                        w={width}
                        trackHeight={(height/totalTracks)}
                        h={height}
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
                        svgLines={drawData}
                        h={(height/totalTracks) - 2}
                      />
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
