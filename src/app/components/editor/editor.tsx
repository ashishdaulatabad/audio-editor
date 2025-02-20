import React from 'react';
import { Tracks } from './tracks';
import { TrackInfo } from './trackinfo';
import { AudioTrackList } from './audiotracklist';
import { Seekbar } from './seekbar';
import { createAudioData, getTrackAudioElement, getTrackAudioOrTrackElement, getTrackElement } from '@/app/services/utils';
import { useDispatch, useSelector } from 'react-redux';
import { addAudio } from '@/app/state/audiostate';
import { RootState } from '@/app/state/store';
import { addAudioToTrack, AudioTrackDetails, deleteAudioFromTrack, selectTracksWithinSpecifiedRegion, setOffsetInMillisToAudioTrack, setOffsetInMillisToMultipleAudioTrack, sliceAudioTracks, Status, togglePlay, TrackInformation } from '@/app/state/trackdetails';
import { selectAudio } from '@/app/state/selectedaudiostate';
import { audioManager } from '@/app/services/audiotrackmanager';
import { Player } from '../player/player';
import { AudioWaveformEditor } from '../waveform/waveform';
import { WindowManager } from '../shared/windowmanager';
import { addWindow } from '@/app/state/windowstore';
import { ModeType, Toolkit } from './toolkit';
import { RegionSelect, RegionSelection } from './regionselect';
import { AudioTrackManipulationMode } from './trackaudio';
import { ScheduledInformation } from '../../state/trackdetails';
import { Slicer, SlicerSelection } from './slicer';

export function Editor() {
  /// All states
  const [set, isSet] = React.useState(false);
  const [anchorX, setAnchorX] = React.useState(0);
  const [mode, setMode] = React.useState<AudioTrackManipulationMode>(AudioTrackManipulationMode.None);
  const [initialTrackWidth, setInitialTrackWidth] = React.useState(0);
  const [initialScrollLeft, setInitialScrollLeft] = React.useState(0);
  const [position, setPosition] = React.useState(0);
  const [movingTrack, setMovingTrack] = React.useState<HTMLElement | null>(null)
  const [height, setHeight] = React.useState(98 * audioManager.totalTrackSize);
  const [dragged, setDragged] = React.useState(false);
  const [lineDist, setLineDist] = React.useState(100);
  const [track, selectTrack] = React.useState<AudioTrackDetails | null>(null);
  const [trackForEdit, selectTrackForEdit] = React.useState<AudioTrackDetails | null>(null);
  const [currentMode, setCurrentMode] = React.useState<ModeType>(ModeType.DefaultSelector);
  const [scroll, setScroll] = React.useState(0);

  /// Redux states
  const store = useSelector((state: RootState) => state.audioReducer.contents);
  const currentTrack = useSelector((state: RootState) => state.selectedAudioSliceReducer.value);
  const trackDetails = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails);
  const trackTimeDurationMillis = useSelector((state: RootState) => state.trackDetailsReducer.maxTimeMillis);
  const status = useSelector((state: RootState) => state.trackDetailsReducer.status);

  // Refs
  const ref = React.createRef<HTMLDivElement>();
  const scrollPageRef = React.createRef<HTMLDivElement>();
  const verticalScrollPageRef = React.createRef<HTMLDivElement>();

  // Other variables
  const totalTracks = trackDetails.length;
  const timeUnitPerLineDistInSeconds = 5;
  const width = ((trackTimeDurationMillis / 1000) / timeUnitPerLineDistInSeconds) * lineDist;
  const totalLines = Math.floor(width / lineDist);
  const dispatch = useDispatch();

  const heightPerTrack = (height / totalTracks) - 2;
  const thickLineData = {
    lw: 2,
    content: Array.from({length: totalLines}, (_, index: number) => {
      return `M ${index * lineDist} 0 L ${index * lineDist} ${heightPerTrack}`
    }).join(' ')
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

  function setOffset(track: HTMLElement, lineDist: number) {
    // 1. Delete from current track
    // 2. Add to different track
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

  function setDragSliceMode(event: React.MouseEvent<HTMLDivElement, DragEvent>) {

  }

  function setTrackDraggingMode(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    const targetElement = event.nativeEvent.target as HTMLElement;
    const element = getTrackAudioElement(targetElement) as HTMLElement;

    if (element) {
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
        selectTrack(trackDetails[trackNumber][audioIndex]);
        selectTrackForEdit(trackDetails[trackNumber][audioIndex]);
        setTimeout(() => selectTrackForEdit(null), 300);
      } else {
        dispatch(addWindow({
          header: <><b>Track</b>: {trackForEdit.audioName}</>,
          props: {
            track: trackForEdit,
            w: 600,
            h: 100
          },
          windowSymbol: Symbol(),
          view: AudioWaveformEditor
        }));
        selectTrackForEdit(null);
      }

      /// Manipulating multiple tracks at once.
      if (attribute === 'true') {

      } else {
        /// Manipulating single track at once, based on the manipulation type
        const audioIndex = element?.getAttribute('data-audioid');
        const audioIntIndex = audioIndex ? parseInt(audioIndex) : 0;
        const trackIndex = element?.getAttribute('data-trackid');
        const intIndex = trackIndex ? parseInt(trackIndex) : 0;

        const leftString = (element.style.left) || '0px';
        const left = parseInt(leftString.substring(0, leftString.length - 2));
        setPosition(left);
        dispatch(selectAudio(trackDetails[intIndex][audioIntIndex]));
      }
      setMovingTrack(element as HTMLElement);
    } else {
      addCurrentTrack(event);
    }
  }

  /**
   * Setting drag type
   * 
   * - [ ] To do: Decide according to the position of a cursor
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

      switch (currentMode) {
        case ModeType.DefaultSelector: {
          setTrackDraggingMode(event);
          break;
        }

        case ModeType.Slicer: {
          setDragSliceMode(event);
          break;
        }
      }
    }
  }

  function unsetAndSliceIfPossible(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {

  }

  function unsetDragMode(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    switch (currentMode) {
      case ModeType.DefaultSelector: {
        unsetDrag(event);
        break;
      }

      case ModeType.Slicer: {
        unsetAndSliceIfPossible(event);
        break;
      }
    }
  }

  function dragElement(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    if (mode !== AudioTrackManipulationMode.None && event.buttons === 1 && movingTrack) {
      event.preventDefault();
      const audioElement = getTrackAudioElement(movingTrack) as HTMLElement;

      if (audioElement) {
        const selectedAttr = audioElement.getAttribute('data-selected');
        const diffAnchorX = event.nativeEvent.clientX - anchorX;

        if (selectedAttr === 'true') {
          audioManager.applyTransformationToMultipleSelectedTracks(diffAnchorX);
        } else {
          switch (mode) {
            case AudioTrackManipulationMode.Move: {
              // Change position
              movingTrack.style.left = Math.max(0, Math.min(width, position + diffAnchorX)) + 'px';
              setDragged(diffAnchorX !== 0);
              break;
            }
  
            case AudioTrackManipulationMode.ResizeStart: {
              // Manipulate width, scrollLeft and offset based on the initial position.
              // The width cannot exceed the last point of the whole track (not the scrollwidth)
              movingTrack.style.width = Math.min(initialScrollLeft + initialTrackWidth, initialTrackWidth - diffAnchorX) + 'px';
              // Change left position
              movingTrack.style.left = Math.max(0, 
                Math.max(position - initialScrollLeft, position + diffAnchorX)
              ) + 'px';
              movingTrack.scrollLeft = initialScrollLeft + diffAnchorX;
              setDragged(diffAnchorX !== 0);
              break;
            }

            case AudioTrackManipulationMode.ResizeEnd: {
              // Manipulate width, scrollLeft and offset based on the initial position.
              // The width cannot exceed the scroll width.
              movingTrack.style.width = Math.min(
                movingTrack.scrollWidth - initialScrollLeft,
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
    if (!movingTrack) return;
    const element = getTrackAudioElement(event.nativeEvent.target as HTMLElement) as HTMLElement;

    const selectedAttr = movingTrack.getAttribute('data-selected');

    if (selectedAttr === 'true') {
      const allElements = audioManager.useManager().applyNewPositionForMultipleSelectedTracks();
      const allTrackNumbers: number[] = [], allAudioIndexes: number[] = [], allOffsetsInMillis: number[] = [];
      
      allElements.forEach((element) => {
        const { domElement, finalPosition } = element;
        const audioIndex = domElement.getAttribute('data-audioid');
        const audioIntIndex = parseInt(audioIndex ?? '0');

        const trackIndex = domElement.getAttribute('data-trackid');
        const trackIntIndex = parseInt(trackIndex ?? '0');

        const timeOffset = Math.round((finalPosition / lineDist) * 5000);

        allTrackNumbers.push(trackIntIndex);
        allAudioIndexes.push(audioIntIndex);
        allOffsetsInMillis.push(timeOffset)
      });

      dispatch(setOffsetInMillisToMultipleAudioTrack({
        allTrackNumbers,
        allAudioIndexes,
        allOffsetsInMillis
      }));

      const movedTrackInfo: AudioTrackDetails[] = [];
      allTrackNumbers.forEach((trackNumber, index: number) => {
        const audioIndex = allAudioIndexes[index], offsetInMillis = allOffsetsInMillis[index];
        const track = trackDetails[trackNumber][audioIndex];

        movedTrackInfo.push({
          ...track,
          trackDetail: {
            ...track.trackDetail,
            offsetInMillis
          }
        });
      });

      audioManager.rescheduleAllTracks(trackDetails, movedTrackInfo);
    } else {
      if (movingTrack) {
        if (movingTrack.classList.contains('track-audio')) {
          if (!dragged) {
            setAnchorX(0);
            setMode(AudioTrackManipulationMode.None);
            setMovingTrack(null);
            return;
          }
          setInitialTrackWidth(0);
          setInitialScrollLeft(0);

          const {
            offsetInMillis,
            startOffsetInMillis,
            endOffsetInMillis
          } = setOffset(movingTrack, lineDist);

          const audioElement = getTrackAudioElement(movingTrack) as HTMLElement;
          const audioIndex = audioElement.getAttribute('data-audioid');
          const audioIntIndex = audioIndex ? parseInt(audioIndex) : 0;

          const trackIndex = audioElement.getAttribute('data-trackid');
          const trackIntIndex = trackIndex ? parseInt(trackIndex) : 0;
          const currentTrack = trackDetails[trackIntIndex][audioIntIndex];

          const trackInformation: ScheduledInformation & TrackInformation = {
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
    setMovingTrack(null);
  }

  function dragOrResizeElement(event: React.MouseEvent<HTMLDivElement, DragEvent>) {
    switch (currentMode) {
      case ModeType.DefaultSelector: {
        dragElement(event);
        break;
      }
    }
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

  function addCurrentTrack(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    // If not selected, just return
    if (!currentTrack.buffer) return;

    const element = event.nativeEvent.target as HTMLElement;
    // Add timeout interval for the click, and check if selected track is the same
    // otherwise
    const parTrackElement = getTrackElement(event.nativeEvent.target as HTMLElement) as HTMLElement;

    if (parTrackElement) {
      const index = parTrackElement.getAttribute('data-id');
      const trackNumber = index ? parseInt(index) : 0;
      const offsetX = event.nativeEvent.offsetX;
      const offsetInMillis = Math.round((offsetX / lineDist) * 5000);
      const newTrack = {
        ...currentTrack,
        trackDetail: {
          ...currentTrack.trackDetail,
          offsetInMillis,
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
  }

  function keyPress(event: KeyboardEvent) {
    switch (event.key) {
      case ' ': {
        event.preventDefault();
        const newStatus = status === Status.Play ? Status.Pause : Status.Play;
        dispatch(togglePlay(newStatus));
        break;
      }
      default: break;
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

  function sliceIntersectingTracks(sliceInformation: SlicerSelection) {
    dispatch(sliceAudioTracks(sliceInformation));
  }

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
    document.addEventListener('keypress', keyPress);
    document.addEventListener('wheel', maybeZoom, {passive: false});

    if (scrollPageRef.current) {
      scrollPageRef.current.scrollLeft = scroll;
    }

    return () => {
      document.removeEventListener('keypress', keyPress);
      document.removeEventListener('wheel', maybeZoom);
    }
  }, [lineDist, status]);

  return (
    <>
      <WindowManager />
      <div className="h-full flex flex-col max-h-screen">
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
                  onDrop={onFileDrop}
                  onMouseDown={settingDrag}
                  onMouseMove={dragOrResizeElement}
                  onMouseUp={unsetDragMode}
                  onMouseLeave={unsetDragMode}
                  onContextMenu={deleteAudio}
                >
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
