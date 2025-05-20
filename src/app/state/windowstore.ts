import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppDispatch } from './store';
import { removeRandomWindowId } from '../services/random';

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
    removeWindowWithUniqueIdentifier(state, action: PayloadAction<symbol>) {
      for (const key of Object.getOwnPropertySymbols(state.contents)) {
        const window = state.contents[key];

        if (window.propsUniqueIdentifier === action.payload) {
          const { windowId } = window;
          delete state.contents[key];
          removeRandomWindowId(windowId);

          const index = state.ordering.indexOf(window.windowSymbol);

          if (index > -1) {
            state.ordering.splice(index, 1);
          }
          return;
        }
      }
    },
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
    focusWindow(state, action: PayloadAction<symbol>) {
      const index = state.ordering.indexOf(action.payload);

      if (index > -1) {
        const value = state.ordering.splice(index, 1)[0];
        state.ordering.push(value);
      }
    },
    setWindowPosition(
      state,
      action: PayloadAction<{
        x: number
        y: number
        windowSymbol: symbol
      }>
    ) {
      const { x, y, windowSymbol } = action.payload;

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
export function addWindowToAction<TProps>(dispatch: AppDispatch, details: WindowView<TProps>) {
  dispatch(addWindow(details));
}

export default windowManagerSlice.reducer;
