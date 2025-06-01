import {
  AudioTrackDetails
} from '@/app/state/trackdetails/trackdetails';
import { cloneValues } from './audio/noderegistry';
import { compareSnapshots } from '@/app/state/trackdetails/tracksnapshots';

/**
 * @description Change Type performed
*/
export enum WorkspaceChange {
  TrackChanges,
  KnobChanges
}

export enum ChangeType {
  NewlyCreated,
  Removed,
  Updated,
}

export type ChangeDetails<ChangeProperties> = {
  changeType: ChangeType.Removed | ChangeType.NewlyCreated,
  data: ChangeProperties
} | {
  changeType: ChangeType.Updated
  data: {
    previous: ChangeProperties
    current: ChangeProperties
  }
}

/**
 * @description Describes the change type of recently interacted system
 * @todo maybe design a system that the system subscribes and,
 * runs the system.
 */
export interface Change<ChangeProperties> {
  /**
   * @description Change Type
   */
  workspaceChange: WorkspaceChange
  /**
   * @description Updated values: every system of change defined in
   * ChangeProperties should have a defined identifier, and their own 
   * method of differentiating changes (at the moment)
   */
  updatedValues: Array<ChangeDetails<ChangeProperties>>
}

export type Snapshot<Type> = {
  state: Type
}

/**
 * @description Create a state that keeps track of all the changes.
 * @param state current state
 * @returns Snapshot of the current type.
 */
export function createSnapshot<Type>(state: Type): Snapshot<Type> {
  // A simple object currently.
  return { state: cloneValues(state) };
}

/**
 * @description Change Timeline: useful for undo/redo
 * @todo Need to formulate this one.
 */
class ChangeHistory {
  stack: Array<Change<any>> = [];
  maxStackSize = 150;
  pointer = -1;

  constructor() {}

  peekHistory() {
    if (this.stack.length == 0) {
      return undefined;
    }

    return this.stack[this.stack.length - 1];
  }

  /**
   * @description Store diff of changes made to certain action
   * performed by the user..
   * @param previousSnapshot previous snapshot.
   * @param currentState current state of the track.
   * @param changeType the kind of changes made.
   */
  storeChanges<Type>(
    previousSnapshot: Snapshot<Type>,
    currentState: Type,
    changeType: WorkspaceChange,
  ) {
    // Diff Logic can be different for each type, specialization first, then
    // move to generalization.
    switch (changeType) {
      case WorkspaceChange.TrackChanges: {
        const updates = compareSnapshots(
          previousSnapshot as Snapshot<AudioTrackDetails[][]>, 
          currentState as AudioTrackDetails[][]
        );

        if (this.stack.length > this.maxStackSize) {
          this.stack.shift();
        }

        if (this.pointer !== this.stack.length - 1) {
          this.stack = this.stack.slice(0, this.pointer + 1);
        }

        // Push when any changes are there.
        if (updates.length > 0) {
          this.stack.push({
            workspaceChange: changeType,
            updatedValues: updates
          });
        }

        this.pointer = this.stack.length - 1;

        break;
      }

      // There should be an identifier for all the visible input (e.g.,
      // Checkbox, knob, slider and Dropdown in future, and others).
      // that could be modified throughout the page, hence keeping the
      // previous value and current value to undo changes.
      case WorkspaceChange.KnobChanges: {
        this.pointer = this.stack.length - 1;
        break;
      }
    }
  }

  /**
   * @description Clear all changes within history type.
   * @param changeType Filter to work on.
   * @param identifierFn Should return true if history change needs to be deleted.
   */
  clearHistoryContainingItem<ChangeProperties>(
    changeType: WorkspaceChange,
    identifierFn: (fn: ChangeDetails<ChangeProperties>) => boolean
  ) {
    const len = this.stack.length;
    let subtractPointerBy = 0;

    for (let index = 0; index < len; ++index) {
      const stackChange = this.stack[index];

      if (changeType === stackChange.workspaceChange) {
        const { updatedValues } = stackChange;

        stackChange.updatedValues = updatedValues.filter(item => !identifierFn(item));

        if (stackChange.updatedValues.length === 0) {       
          if (index <= this.pointer) {
            ++subtractPointerBy;
          }
        }
      }
    }

    this.stack = this.stack.filter((stack) => stack.updatedValues.length > 0);
    this.pointer -= subtractPointerBy;
  }

  rollbackChange<Type>(redo: boolean = false) {
    if (this.pointer < 0 && !redo) return undefined;
    if (this.pointer >= this.stack.length && redo) return undefined;

    const change = redo ? 
      this.stack[++this.pointer] :
      this.stack[this.pointer--];

    return change;
  }
};

export const changeHistory = new ChangeHistory();
        