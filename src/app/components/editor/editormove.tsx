import { Maybe } from '@/app/services/interfaces';
import { AudioTrackManipulationMode } from './trackaudio';
import { audioManager } from '@/app/services/audio/audiotrackmanager';
import { clamp } from '@/app/utils';

const {
  max,
  min,
} = Math;

// TODO: Move hooks in different file wherever possible
export function useMultiTrackMovement(mode: AudioTrackManipulationMode) {
  return function handleMultiSelectedMove(diffAnchorX: number) {
    switch (mode) {
      case AudioTrackManipulationMode.Move:
        audioManager.applyTransformationToMultipleSelectedTracks(diffAnchorX);
        break;
      case AudioTrackManipulationMode.ResizeStart:
        audioManager.applyResizingStartToMultipleSelectedTracks(diffAnchorX);
        break;
      case AudioTrackManipulationMode.ResizeEnd:
        audioManager.applyResizingEndToMultipleSelectedTracks(diffAnchorX);
        break;
      default: break;
    }
  }
}

export function useSingleTrackMovement({
  mode,
  movableEntity,
  position,
  width,
  initialScrollLeft,
  initialTrackWidth,
  setDragged
}: {
  mode: AudioTrackManipulationMode,
  movableEntity: Maybe<HTMLElement>,
  position: number,
  width: number,
  initialScrollLeft: number,
  initialTrackWidth: number,
  setDragged: React.Dispatch<React.SetStateAction<boolean>>
}) {
  return function handleSingleTrackMove(diffAnchorX: number) {
    if (!movableEntity) {
      return;
    }

    switch (mode) {
      // Change position
      case AudioTrackManipulationMode.Move:
        movableEntity.style.left = clamp(
          position + diffAnchorX,
          0,
          width
        ) + 'px';
        setDragged(diffAnchorX !== 0);
        break;

      // Manipulate width, scrollLeft and offset based on the initial position.
      // The width cannot exceed the last point of the whole track 
      // (not the scrollwidth)
      case AudioTrackManipulationMode.ResizeStart: {
        const maxWidth = min(position, initialScrollLeft) + initialTrackWidth;
        const width = clamp(initialTrackWidth - diffAnchorX, 0, maxWidth)

        const minLeft = max(0, position - initialScrollLeft);
        const maxLeft = position + initialTrackWidth;
        const left = clamp(position + diffAnchorX, minLeft, maxLeft);

        Object.assign(
          movableEntity.style,
          {
            width: width + 'px',
            left: left + 'px'
          }
        );

        movableEntity.scrollLeft = max(
          initialScrollLeft + diffAnchorX, 
          initialScrollLeft - position
        );
        setDragged(diffAnchorX !== 0);
        break;
      }

      // Manipulate width, scrollLeft and offset based on the initial position.
      // The width cannot exceed the scroll width.
      case AudioTrackManipulationMode.ResizeEnd:
        movableEntity.style.width = min(
          movableEntity.scrollWidth - 2 * initialScrollLeft,
          initialTrackWidth + diffAnchorX
        ) + 'px';

        setDragged(diffAnchorX !== 0);
        break;

      default: break;
    }
  }
}