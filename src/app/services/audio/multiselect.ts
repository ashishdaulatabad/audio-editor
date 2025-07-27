import { AudioTrackDetails } from '@/app/state/trackdetails/trackdetails';
import { clamp } from '@/app/utils';

type SelectedAudioTrackDetails = AudioTrackDetails & {
  domElement: HTMLElement
  initialPosition: number
  initialWidth: number
  initialScrollLeft: number
}

export type TransformedAudioTrackDetails = SelectedAudioTrackDetails & {
  finalPosition: number
  finalScrollLeft: number
  finalWidth: number
}

export type SelectedTrackInfo = {
  trackNumbers: number[]
  audioIndexes: number[]
  scheduledKeys: symbol[]
}

export class MultiSelectTracker {
  multiSelectedDOMElements: SelectedAudioTrackDetails[] = [];

  constructor() {}
  
  clearSelection() {
    this.multiSelectedDOMElements = [];
  }
  
  /**
   * @description Check if at least one of the DOM elements is multi-selected
   */
  isMultiSelected() {
    return this.multiSelectedDOMElements.length > 0;
  }

  /**
   * @description Set element as Multi-selected.
   * @param track Track to add into selected elements
   * @param domElement DOM element associated with the selection
   * @returns void
   */
  addIntoSelectedAudioTracks(
    track: AudioTrackDetails,
    domElement: HTMLElement
  ) {
    const existingElementIndex = this.multiSelectedDOMElements
      .findIndex(element => (
        element.trackDetail.scheduledKey === track.trackDetail.scheduledKey
      ));

    if (existingElementIndex === -1) {
      this.multiSelectedDOMElements.push({
        ...track,
        domElement,
        initialPosition: domElement.offsetLeft,
        initialWidth: domElement.offsetWidth,
        initialScrollLeft: domElement.scrollLeft,
      });
    } else {
      const existingElement = this.multiSelectedDOMElements[existingElementIndex];
      existingElement.domElement = domElement;
      existingElement.initialPosition = domElement.offsetLeft;
      existingElement.initialWidth = domElement.offsetWidth;
      existingElement.initialScrollLeft = domElement.scrollLeft;
    }
  }

  /**
   * @description Set element as Multi-selected.
   * @param track Track to add into selected elements
   * @param domElement DOM element associated with the selection
   * @returns void
   */
  deleteFromSelectedAudioTracks(scheduledTrackId: symbol) {
    const existingElementIndex = this.multiSelectedDOMElements
      .findIndex(element => (
        element.trackDetail.scheduledKey === scheduledTrackId
      ));

    if (existingElementIndex > -1) {
      this.multiSelectedDOMElements.splice(existingElementIndex, 1);
    }
  }

  /**
   * @description Cleanup Selection: Remove elements not attached to DOM element
   */
  cleanupSelectedDOMElements() {
    this.multiSelectedDOMElements = this.multiSelectedDOMElements
      .filter(dom => (
        dom.domElement.isConnected
      ));
  }

  /**
   * @description Set element as Multi-selected.
   * @param track Track to add into selected elements
   * @param domElement DOM element associated with the selection
   * @returns void
   */
  deleteAudioFromSelectedAudioTracks(audioId: symbol) {
    this.multiSelectedDOMElements = this.multiSelectedDOMElements
      .filter(element => (
        element.audioId === audioId
      ));
  }

  /**
   * Apply move transformation to these selected DOM elements
   * 
   * @param diffX Move track by `diffX` from `initialPosition`
   * @returns void
   */
  applyTransformationToMultipleSelectedTracks(diffX: number) {
    let diffOffsetToNegate = 0;

    for (const selectedTrack of this.multiSelectedDOMElements) {
      const newLeft = selectedTrack.initialPosition + diffX;

      if (newLeft < 0) {
        diffOffsetToNegate = Math.max(diffOffsetToNegate, -newLeft);
      }
    }

    for (const selectedTrack of this.multiSelectedDOMElements) {
      const initPosition = selectedTrack.initialPosition;

      const left = (initPosition + diffX + diffOffsetToNegate);
      selectedTrack.domElement.style.left = left + 'px'
    }
  }

  /**
   * @description Apply move transformation to these selected DOM elements
   * @param diffX Move track by `diffX` from `initialPosition`
   * @returns void
   */
  applyResizingStartToMultipleSelectedTracks(diffX: number) {
    // Making sure one of the width does not move to zero
    let minShrinkValue = 0;
    let minShrinkSet = false;
    // Making sure one of the width does not exceed while expanding inward.
    let minExpandValue = 0
    let minExpandSet = false;

    // Rewriting this loop.
    for (const selectedTrack of this.multiSelectedDOMElements) {
      const trackWidth = selectedTrack.initialWidth;
      const trackScrollLeft = selectedTrack.initialScrollLeft;
      const trackPosition = selectedTrack.initialPosition;

      if (!minShrinkSet) {
        minShrinkValue = trackWidth;
        minShrinkSet = true;
      } else if (minShrinkValue > trackWidth) {
        minShrinkValue = trackWidth;
      }

      if (!minExpandSet) {
        minExpandValue = Math.min(trackPosition, trackScrollLeft);
        minExpandSet = true;
      } else if (minExpandValue > trackScrollLeft) {
        minExpandValue = Math.min(trackScrollLeft, trackPosition);
      }
    }

    for (const selectedTrack of this.multiSelectedDOMElements) {
      const initPosition = selectedTrack.initialPosition;
      const initScrollLeft = selectedTrack.initialScrollLeft;
      const initWidth = selectedTrack.initialWidth;

      Object.assign(
        selectedTrack.domElement.style,
        {
          width: clamp(
            initWidth - diffX,
            initWidth - minShrinkValue,
            initWidth + minExpandValue,
          ) + 'px',
          left: clamp(
            initPosition + diffX,
            initPosition - minExpandValue,
            initPosition + minShrinkValue,
          ) + 'px'
        }
      );

      selectedTrack.domElement.scrollLeft = clamp(
        initScrollLeft + diffX,
        initScrollLeft - minExpandValue,
        initScrollLeft + minShrinkValue,
      );
    }
  }

  /**
   * @description Apply move transformation to these selected DOM elements
   * @param diffX Move track by `diffX` from `initialPosition`
   * @returns void
   */
  applyResizingEndToMultipleSelectedTracks(diffX: number) {
    let minExpandValue = 0
    let minExpandSet = false;

    let minShrinkValue = 0
    let minShrinkSet = false;

    // Rewriting this loop.
    for (const selectedTrack of this.multiSelectedDOMElements) {
      const trackWidth = selectedTrack.initialWidth;
      const trackScrollLeft = selectedTrack.initialScrollLeft;
      const totalWidth = selectedTrack.domElement.scrollWidth;

      const expandableDist = totalWidth - 2 * trackScrollLeft - trackWidth;

      if (!minExpandSet) {
        minExpandValue = expandableDist;
        minExpandSet = true;
      } else if (minExpandValue > expandableDist) {
        minExpandValue = expandableDist;
      }

      if (!minShrinkSet) {
        minShrinkValue = trackWidth;
        minShrinkSet = true;
      } else if (minShrinkValue > trackWidth) {
        minShrinkValue = trackWidth;
      }
    }

    for (const selectedTrack of this.multiSelectedDOMElements) {
      const initWidth = selectedTrack.initialWidth;

      selectedTrack.domElement.style.width = clamp(
        initWidth + diffX,
        initWidth - minShrinkValue,
        initWidth + minExpandValue,
      ) + 'px'
    }
  }

  /**
   * @description Retrieves positions of the selected tracks.
   * This is managed here instead of letting react handling it.
   */
  getMultiSelectedTrackInformation(): SelectedTrackInfo {
    const newElements: SelectedTrackInfo = {
      trackNumbers: [],
      audioIndexes: [],
      scheduledKeys: []
    };

    this.multiSelectedDOMElements.forEach(element => {
      // Track and audio ID will always exist.
      const trackNumber = parseInt(
        element.domElement.getAttribute('data-trackid') as string
      );
      const audioIndex = parseInt(
        element.domElement.getAttribute('data-audioid') as string
      );

      newElements.trackNumbers.push(trackNumber);
      newElements.audioIndexes.push(audioIndex);
      newElements.scheduledKeys.push(element.trackDetail.scheduledKey);
    });

    return newElements;
  }

  /**
   * @description Retrieves all the positions of the current tracks.
   * @returns 
   */
  getNewPositionForMultipleSelectedTracks(): TransformedAudioTrackDetails[] {
    const newElements: TransformedAudioTrackDetails[] = [];
    
    this.multiSelectedDOMElements.forEach(element => {
      const scrollLeft = element.domElement.scrollLeft;
      const width = element.domElement.offsetWidth;
      const finalPosition = element.domElement.offsetLeft;

      newElements.push({
        ...element,
        finalPosition,
        finalScrollLeft: scrollLeft,
        finalWidth: width
      });

      /// Probably make a separate method to 
      /// set all from initial to final values.
      element.initialPosition = finalPosition;
      element.initialScrollLeft = scrollLeft;
      element.initialWidth = width;
    });

    return newElements;
  }
}
