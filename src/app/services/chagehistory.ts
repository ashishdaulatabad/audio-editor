/**
 * @description Change Type performed
*/
export enum ChangeType {
  TrackAdd,
  TrackDelete,
  TrackMove,
  BulkTrackMove,
  TrackResize,
  BulkTrackResize,
  TrackSlice,
  KnobChange
}

/**
 * @description Describes the change type of recently interacted system
 */
export interface Change<ChangeProperties> {
  /**
   * @description Change Type
   */
  changeType: ChangeType
  /**
   * @description Identifier
   */
  identifier: symbol
  /**
   * @description Initial Change
   */
  initialValues: ChangeProperties
  /**
   * @description Final Change
   */
  finalChange: ChangeProperties
}

export type Snapshot<Type> = {
  readonly state: Type
}

/**
 * @description Change Timeline: useful for undo/redo
 * @todo Need to formulate this one.
 */
class ChangeHistory {
  stack: Array<Change<any>> = [];
  maxStackSize = 100;

  constructor() {}

  /**
   * @description Add to change history
   * @todo Remove previous changes if past history exceeds the current history
   * @param change change scanned by the change history service.
   */
  private _markHistory<ChangeProperties>(change: Change<ChangeProperties>) {
    this.stack.push(change);
  }

  peekHistory() {
    if (this.stack.length == 0) {
      return undefined;
    }

    return this.stack[this.stack.length - 1];
  }

  /**
   * @description Create a clone of the state.
   * @param initialState recorded state of the initial application
   */
  recordSnapshot<TypeState>(initialState: TypeState): Snapshot<TypeState> {
    return {
      state: structuredClone(initialState)
    };
  }

  /**
   * @description calculate diff of all values.
   * @param previousSnapshot previous snapshot.
   * @param currentState current state of the track.
   */
  diffSnapshot<Type>(previousSnapshot: Snapshot<Type>, currentState: Type) {
    const { state: previousState } = previousSnapshot;
  }

  popHistory() {
    return this.stack.pop();
  }
};

function evalDifference<T extends Object>(left: T, right: T) {
  if (typeof left === 'undefined' && left === right) {
    return;
  }

  if (left === null || left === undefined || right === null || right === undefined) {
    return;
  }

  if (left.constructor !== right.constructor) {
    return;
  }

  switch (left.constructor) {
    case Object.constructor: {
      // Check all keys
      break;
    }

    case Array.constructor: {
      break;
    }

    case Symbol.constructor: {
      break;
    }
  }
}
