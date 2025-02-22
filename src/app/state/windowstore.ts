import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type PropsType<TProps> = Parameters<(props: React.PropsWithoutRef<TProps>) => React.JSX.Element>[0];

export interface WindowView<TProps> {
  windowSymbol: symbol,
  header: string | React.JSX.Element,
  view: (props: TProps) => React.JSX.Element,
  props: PropsType<TProps>,
  w?: number,
  h?: number,
  x: number,
  y: number
}

const initialState: {
  contents: Array<WindowView<any>>
} = {
  contents: []
}

const windowManagerSlice = createSlice({
  name: 'windowManager',
  initialState,
  reducers: {
    addWindow(state: any, action: PayloadAction<WindowView<any>>) {
      state.contents.push(action.payload);
    },
    removeWindow(state, action: PayloadAction<symbol>) {
      const index = state.contents.findIndex(window => window.windowSymbol === action.payload);

      if (index > -1) {
        state.contents.splice(index, 1);
      }
    },
    /// The window that is focused on should be at the end,
    /// z-indexes will be managed accordingly.
    focusWindow(state, action: PayloadAction<symbol>) {
      const index = state.contents.findIndex(window => window.windowSymbol === action.payload);

      if (index > -1) {
        const value = state.contents.splice(index, 1)[0];
        state.contents.push(value);
      }
    },
    setWindowPosition(state, action: PayloadAction<{x: number, y: number, index: number}>) {
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
  setWindowPosition
} = windowManagerSlice.actions;

export default windowManagerSlice.reducer;