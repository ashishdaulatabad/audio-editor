/**
 * Registry for an audio node that is easily retrievable
 * and modifiable.
 */

export enum NodeType {
  Gain,
  StereoPan
}

export type ParameterChange = {
  type: NodeType,
  value: number
}


const registry: {
  [k: symbol]: AudioNode
} = {};

/**
 * @description Registers and returns a identifer, for trackable
 * changes in user interface.
 */
export function addToAudioNodeList(audioNode: AudioNode): symbol {
  const sym = Symbol();
  registry[sym] = audioNode;

  return sym;
}

/**
 * @description Removes audio node from registry
 * @param sym identifier for the node.
 */
export function deregisterFromAudioNodeList(sym: symbol) {
  delete registry[sym];
}

/**
 * @description get audio node.
 * @param sym symbol
 * @returns AudioNode if exists, undefined otherwise
 */
export function getAudioNode(sym: symbol): AudioNode | undefined {
  return registry[sym];
}

/**
 * @description Get relevant parameters on the audio parameters, and returns them
 * @returns currently returns only for two, more to go.
 * basically return all the parameter values that could be retrievable.
 */
function getParameters(sym: symbol): ParameterChange[] {
  const node = registry[sym];

  if (node instanceof GainNode) {
    return [{
      type: NodeType.Gain,
      value: node.gain.value
    }];
  }

  if (node instanceof StereoPannerNode) {
    return [{
      type: NodeType.StereoPan,
      value: node.pan.value
    }];
  }

  return [];
}
