import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch } from "./store";
import { removeRandomWindowId } from "../services/random";

export interface Windowable {}

type PropsType<TProps> = Parameters<(props: React.PropsWithoutRef<TProps>) => React.JSX.Element>[0];

export enum HorizontalAlignment {
  Center,
  Left,
  Right,
}

export enum VerticalAlignment {
  Center,
  Top,
  Bottom,
}

/**
 * @description Window view
 */
export interface WindowView<TProps> {
  /**
   * @description Unique identifier for this window
   */
  windowSymbol: symbol
  /**
   * @description Header.
   */
  header: string | React.JSX.Element
  /**
   * @description Component to attach on, requires to set the props in this object.
   * @param props Props of this component
   * @returns JSX.Element
   */
  view: (props: TProps) => React.JSX.Element
  /**
   * @description Props of the component; this will be supplied to the view Component.
   */
  props: PropsType<TProps>
  /**
   * @description Width of the window.
   */
  w?: number
  /**
   * @description Height of the window.
   */
  h?: number
  /**
   * @description Absolute Left Position
   */
  x: number
  /**
   * @description Absolute Top Position
   */
  y: number
  /**
   * @description Visibility of this window.
   */
  visible: boolean
  /**
   * @description Overflow X
   */
  overflow?: boolean
  /**
   * @description To maintain window that is unique to an opened entity, an 
   * identifier is supplied, so that there are no duplicate window for 
   * same thing the user opens (for e.g., for scheduled track, 
   * it would be `trackDetail.scheduledKey`).
   */
  propsUniqueIdentifier: symbol
  /**
   * @description Content Horizontal Alignment
   */
  horizontalAlignment?: HorizontalAlignment
  /**
   * @description Content Vertical Alignment
   */
  verticalAlignment?: VerticalAlignment
  /**
   * @description Unique Window ID
   */
  windowId: number
}

export type InitialType<TProps> = {
  contents: {
    [k: symbol]: WindowView<TProps> 
  },
  ordering: Array<symbol>
};

const initialState: InitialType<any> = {
  contents: {},
  ordering: []
}

const windowManagerSlice = createSlice({
  name: 'windowManager',
  initialState,
  reducers: {
    /**
     * @description Add window to the state
     * - [ ] To do: Directly tie the window manager state to identifier of 
     * the entity (either a plugin in future or the current track.).
     * 
     * i.e., If user wants to open an already opened scheduled track, then that
     * key must be searched in an already opened windows, otherwise there would be
     * multiple windows for the same tracks.
     * 
     * @param state current state of the window manager.
     * @param action action with detailed information about the window manager.
     */
    addWindow(
      state: InitialType<any>, 
      action: PayloadAction<WindowView<any>>
    ) {
      const { propsUniqueIdentifier } = action.payload;

      for (const key of Object.getOwnPropertySymbols(state.contents)) {
        const window = state.contents[key];

        // Instead, focus, since user requested for this window.
        if (window.propsUniqueIdentifier === propsUniqueIdentifier) {
          const index = state.ordering.indexOf(window.windowSymbol);
          const value = state.ordering.splice(index, 1)[0];
          state.ordering.push(value);

          return;
        }
      }
      
      state.contents[action.payload.windowSymbol] = action.payload;
      state.ordering.push(action.payload.windowSymbol);
    },
    /**
     * Remove the window from the system.
     *
     * @param state current state
     * @param action action containing the windowSymbol
     */
    removeWindow(state, action: PayloadAction<symbol>) {
      if (Object.hasOwn(state.contents, action.payload)) {
        const { windowId } = state.contents[action.payload];
        delete state.contents[action.payload];
        removeRandomWindowId(windowId);

        const index = state.ordering.findIndex(w => w === action.payload);

        if (index > -1) {
          state.ordering.splice(index, 1);
        }
      }
    },
    /**
     * Remove the window identified by unique identifier.

     * @param state current state
     * @param action action containing the windowSymbol
     */
    removeWindowWithUniqueIdentifier(state, action: PayloadAction<symbol>) {
      for (const key of Object.getOwnPropertySymbols(state.contents)) {
        const window = state.contents[key];

        if (window.propsUniqueIdentifier === action.payload) {
          const { windowId } = state.contents[action.payload];
          delete state.contents[action.payload];
          removeRandomWindowId(windowId);

          const index = state.ordering.indexOf(action.payload);

          if (index > -1) {
            state.ordering.splice(index, -1);
          }
          return;
        }
      }
    },
    /**
     * Batch remove the window identified by unique identifier.

     * @param state current state
     * @param action action containing the windowSymbol
     */
    batchRemoveWindowWithUniqueIdentifier(state, action: PayloadAction<symbol[]>) {
      for (const key of Object.getOwnPropertySymbols(state.contents)) {
        const window = state.contents[key];

        if (action.payload.indexOf(window.propsUniqueIdentifier) > -1) {
          const windowId = state.contents[key].windowId;
          state.ordering = state.ordering.filter(sym => action.payload.includes(window.windowSymbol));
          delete state.contents[key];
          removeRandomWindowId(windowId);
        }
      }

    },
    /**
     * Focuses the window that user interacted with
     * - [ ] To do: Find a better way to focus, i.e.,
     *   - Search the window
     *   - Focus while maintaining the order.
     *   - Keep the stacking order in separate array (Maybe splice and put it like in a queue??)
     * @param state current state
     * @param action window symbol
     */
    focusWindow(state, action: PayloadAction<symbol>) {
      const index = state.ordering.indexOf(action.payload);

      if (index > -1) {
        const value = state.ordering.splice(index, 1)[0];
        state.ordering.push(value);
      }
    },
    /**
     * Set the current window position.
     * 
     * > **Note**: The position should be set after the uses finishes dragging the
     * > window and releases the trigger from the mouse
     * @param state current state
     * @param action Details related to changes in current window.
     */
    setWindowPosition(
      state,
      action: PayloadAction<{
        x: number
        y: number
        windowSymbol: symbol
      }>
    ) {
      const {
        x,
        y,
        windowSymbol
      } = action.payload;

      if (Object.hasOwn(state.contents, windowSymbol)) {
        state.contents[windowSymbol].x = x
        state.contents[windowSymbol].y = y;
      }
    }
  }
})

export const {
  focusWindow,
  removeWindow,
  setWindowPosition,
  removeWindowWithUniqueIdentifier,
  batchRemoveWindowWithUniqueIdentifier
} = windowManagerSlice.actions;

const { addWindow } = windowManagerSlice.actions;

/**
 * @description Add window to window management.
 * Ensures types for props are well defined and raises error while adding.
 * @param dispatch dispatch
 * @param details 
 */
export function addWindowToAction<TProps>(
  dispatch: AppDispatch,
  details: WindowView<TProps>
) {
  dispatch(addWindow(details));
}

export default windowManagerSlice.reducer;
