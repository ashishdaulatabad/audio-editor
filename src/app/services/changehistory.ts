/**
 * @description Change Type performed
*/
export enum ChangeType {
  TrackChanges,
  KnobChanges
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
 * @description Create a state that keeps track of all the changes.
 * @param state current state
 * @returns Snapshot of the current type.
 */
export function createSnapshot<Type>(state: Type): Snapshot<Type> {
  // A simple object currently.
  return { state: structuredClone(state) };
}

export function updateSnapshot<Type>(
  storedState: Snapshot<Type>,
  currentState: Type
) {
  // Previous snapshot and current snapshot difference.
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
   * @description calculate diff of all values.
   * @param previousSnapshot previous snapshot.
   * @param currentState current state of the track.
   */
  diffSnapshot<Type>(
    previousSnapshot: Snapshot<Type>,
    currentState: Type,
    changeType: ChangeType
  ) {
    const { state: previousState } = previousSnapshot;
    // Diff Logic can be different for each type, specialization first, then
    // move to generalization.
    switch (changeType) {
      // Take all scheduled keys and look for changes that are
      case ChangeType.TrackChanges: {
        break;
      }

      // There should be an identifier for all the visible input (e.g.,
      // Checkbox, knob, slider and Dropdown in future, and others).
      // that could be modified throughout the page, hence keeping the
      // previous value and current value to undo changes.
      case ChangeType.KnobChanges: {
        break;
      }
    }
  }

  popHistory() {
    return this.stack.pop();
  }
};
