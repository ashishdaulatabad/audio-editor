'use client';

import { Provider } from "react-redux";
import { Editor } from "./components/editor/editor";
import { store } from "./state/store";

export default function Home() {
  return (
    <Provider store={store}>
      <div className="max-h-screen font-[family-name:var(--font-geist-sans)]">
        <Editor />
      </div>
    </Provider>
  );
}
