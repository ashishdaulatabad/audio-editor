import { AudioDetails } from "../state/audiostate";
import { audioService } from "./audioservice";
import { randomColor } from "./color";

export function css(...cssStr: string[]): string {
  return cssStr.filter(css => css).map(css => css.trim()).join(' ')
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

  return {
    audioName: name,
    audioId: Symbol(),
    colorAnnotation: randomColor(),
    effects: [],
    buffer: bufferedData,
    transformedBuffer: bufferedData
  }
}

export function getTrackAudioElement(element: Element) {
  let traverse: Element | null = element;
  while (traverse !== null && !traverse.classList.contains('track-audio')) {
    traverse = traverse.parentElement;
  }

  return traverse;
}

export function getTrackAudioOrTrackElement(element: Element) {
  let traverse: Element | null = element;
  while (traverse !== null && !traverse.classList.contains('track-audio') && !traverse.classList.contains('track')) {
    traverse = traverse.parentElement;
  }

  return traverse;
}

export function getTrackElement(element: Element) {
  let traverse: Element | null = element;
  while (traverse !== null && !traverse.classList.contains('track')) {
    traverse = traverse.parentElement;
  }

  return traverse;
}
