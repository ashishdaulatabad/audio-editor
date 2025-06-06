/**
 * Registry for an audio node that is easily retrievable
 * and modifiable.
 */

export enum NodeType {
  Gain,
  StereoPan,
  BufferSourcePlaybackRate,
  BufferSourceDetune
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
 * @param AudioNode node needed to register.
 */
export function addToAudioNodeRegistryList(audioNode: AudioNode): symbol {
  const sym = Symbol();
  registry[sym] = audioNode;

  return sym;
}

/**
 * @description Removes audio node from registry, when cleaned up.
 * @todo Clear history related to this node.
 * @param sym identifier for the AudioNode.
 */
export function deregisterFromAudioNodeRegistryList(sym: symbol) {
  delete registry[sym];
}

/**
 * @description Get audio node.
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

  if (node instanceof AudioBufferSourceNode) {
    return [{
      type: NodeType.BufferSourcePlaybackRate,
      value: node.playbackRate.value
    }, {
      type: NodeType.BufferSourceDetune,
      value: node.detune.value
    }];
  }

  return [];
}

export function compareValues(left: any, right: any): boolean {
  if (left === right) {
    return true;
  }

  if (left === null || left === undefined) {
    return false;
  }

  if (typeof left !== typeof right) {
    return false;
  }

  switch (typeof left) {
    case 'object': {
      if (Array.isArray(left)) {
        return Array.isArray(right) && left.length === right.length && 
          left.every((item, index: number) => compareValues(item, right[index]));
      }
      // Object comparison
      const leftObjectAttributes = Object.getOwnPropertyNames(left);
      const leftSymbols = Object.getOwnPropertySymbols(left);

      const rightObjectAttributes = Object.getOwnPropertyNames(right);
      const rightSymbols = Object.getOwnPropertySymbols(right);

      return leftObjectAttributes.length === rightObjectAttributes.length && 
        leftSymbols.length === rightSymbols.length &&
        leftObjectAttributes.every(leftKey => (
          right.hasOwnProperty(leftKey) && compareValues(left[leftKey], right[leftKey]
        ))) &&
        leftSymbols.every(leftKey => (
          Object.hasOwn(right, leftKey) && compareValues(left[leftKey], right[leftKey]
        )));
    }

    default: {
      return left === right;
    }
  }
}

export function cloneValues(value: any): any {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }

  switch (typeof value) {
    case 'number':
    case 'boolean':
    case 'string':
    case 'symbol': {
      return value;
    };

    // Not to be confused with the class.
    case 'object': {
      if (Array.isArray(value)) {
        return value.map(elem => cloneValues(elem));
      }

      const clonedObject: any = new Object();
      const objectAttributes = Object.getOwnPropertyNames(value);
      const symbols = Object.getOwnPropertySymbols(value);

      for (const key of objectAttributes) {
        const details = value[key];
        clonedObject[key] = cloneValues(details);
      }

      for (const key of symbols) {
        const details = value[key];
        clonedObject[key] = cloneValues(details);
      }

      return clonedObject;
    }
  }
}
