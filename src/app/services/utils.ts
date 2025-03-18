import { AudioDetails } from '../state/audiostate';
import { audioService } from './audioservice';
import { audioManager } from './audiotrackmanager';
import { randomColor } from './random';
import { Maybe } from './interfaces';

type Attr = string |
  { [k: string]: boolean | (() => boolean) };

/**
 * @description CSS builder
 * @param cssStr css arguments
 * @returns resultant applicable classNames.
 */
export function css(...cssStr: Attr[]): string {
  const resultStr = cssStr.map(css => {
    switch (typeof css) {
      case 'string': return css.trim();
      case 'object': {
        return Object.keys(css).filter(key => (
          (typeof css[key] === 'function' && css[key]() === true) ||
          (typeof css[key] === 'boolean' && css[key] === true)
        )).map(key => key.trim()).join(' ')
      }
      default: {
        return null;
      }
    }
  }).filter(returnedCss => returnedCss).join(' ');

  return resultStr;
}

export async function createAudioData(
  store: AudioDetails[],
  file: File
): Promise<AudioDetails | null> {
  const name = file.name;
  if (store.find(({ audioName }) => audioName === name)) {
    return null;
  }

  const buffer = await file.arrayBuffer();
  const bufferedData = await audioService
    .useAudioContext()
    .decodeAudioData(buffer);

  const trackDetails = {
    audioName: name,
    duration: bufferedData.duration,
    colorAnnotation: randomColor(),
    mixerNumber: 0,
    effects: [],
  };

  const audioId = audioManager.registerAudioInAudioBank(trackDetails, bufferedData);

  return {
    ...trackDetails,
    audioId
  };
}

/**
 * @description Traverses up to the ancestor tree until it finds the root
 * or until it satisfies any one of the given conditions.
 * If one condition is satisfied, it returns the index of function where the condition was satisfied first.
 * 
 * @param element 
 */
export function traverseParentUntilOneCondition(
  element: HTMLElement,
  whileFns: ((currentTraversedElement: HTMLElement) => boolean)[]
): { index: number, expectedNode: HTMLElement } | { index: -1, expectedNode: null } {
  let traverse: Maybe<HTMLElement> = element;

  do {
    const index = whileFns.findIndex(fn => fn(traverse as HTMLElement));

    if (index === -1) {
      traverse = traverse.parentElement;
    } else {
      return {
        index,
        expectedNode: traverse
      }
    }
  } while (traverse !== null);

  return {
    index: -1,
    expectedNode: traverse
  };
}

/**
 * @description Get Track Audio Element based on user selection on an Element.
 * @param element 
 * @returns 
 */
export function getTrackAudioElement(element: Element) {
  let traverse: Element | null = element;

  while (
    traverse !== null &&
    !traverse.classList.contains('track-audio')
  ) {
    traverse = traverse.parentElement;
  }

  return traverse;
}

export function getTrackAudioOrTrackElement(element: Element) {
  let traverse: Element | null = element;

  while (
    traverse !== null &&
    !traverse.classList.contains('track-audio') && 
    !traverse.classList.contains('track')
  ) {
    traverse = traverse.parentElement;
  }

  return traverse;
}

export function getTrackElement(element: Element) {
  let traverse: Element | null = element;

  while (
    traverse !== null &&
    !traverse.classList.contains('track')
  ) {
    traverse = traverse.parentElement;
  }

  return traverse;
}
