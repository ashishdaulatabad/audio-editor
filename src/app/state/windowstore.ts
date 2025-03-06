import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Windowable {}

type PropsType<TProps> = Parameters<(props: React.PropsWithoutRef<TProps>) => React.JSX.Element>[0];

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
   * @description To maintain window that is unique to an opened entity, an 
   * identifier is supplied, so that there are no duplicate window for 
   * same thing the user opens (for e.g., for scheduled track, 
   * it would be `trackDetail.scheduledKey`).
   */
  propsUniqueIdentifier: symbol
}

export type InitialType<TProps> = {
  contents: Array<WindowView<TProps>>
};

const initialState: InitialType<any> = {
  contents: []
}

const windowManagerSlice = createSlice({
  name: 'windowManager',
  initialState,
  reducers: {
    /**
     * Add window to the state
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

      const index = state.contents.findIndex(window => window.propsUniqueIdentifier === propsUniqueIdentifier);
      
      if (index === -1) {
        state.contents.push(action.payload);
      } else {
        // Focus on the window referenced by `index`
      }
    },
    /**
     * Remove the window from the system.
     *
     * @param state current state
     * @param action action containing the windowSymbol
     */
    removeWindow(state, action: PayloadAction<symbol>) {
      const index = state.contents.findIndex(window => window.windowSymbol === action.payload);

      if (index > -1) {
        state.contents.splice(index, 1);
      }
    },
    /**
     * Remove the window identified by unique identifier.

     * @param state current state
     * @param action action containing the windowSymbol
     */
    removeWindowWithUniqueIdentifier(state, action: PayloadAction<symbol>) {
      const index = state.contents.findIndex(window => window.propsUniqueIdentifier === action.payload);

      if (index > -1) {
        state.contents.splice(index, 1);
      }
    },
    /**
     * Batch remove the window identified by unique identifier.

     * @param state current state
     * @param action action containing the windowSymbol
     */
    batchRemoveWindowWithUniqueIdentifier(state, action: PayloadAction<symbol[]>) {
      state.contents = state.contents.filter(window => (
        action.payload.indexOf(window.propsUniqueIdentifier) === -1
      ));
    },
    /**
     * Focuses the window that user interacted with
     * - [ ] To do: Find a better way to focus, i.e.,
     *   - Search the window
     *   - Focus while maintaining the order.
     *   - Keep the stacking order in separate array (Maybe splice and put it like in a queue??)
     * @param state 
     * @param action 
     */
    focusWindow(state, action: PayloadAction<symbol>) {
      const index = state.contents.findIndex(window => window.windowSymbol === action.payload);

      if (index > -1) {
        const value = state.contents.splice(index, 1)[0];
        state.contents.push(value);
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
        index: number
      }>
    ) {
      const { x, y, index } = action.payload;

      state.contents[index].x = x
      state.contents[index].y = y;
    }
  }
})

export const {
  addWindow,
  focusWindow,
  removeWindow,
  setWindowPosition,
  removeWindowWithUniqueIdentifier,
  batchRemoveWindowWithUniqueIdentifier
} = windowManagerSlice.actions;

export default windowManagerSlice.reducer;
