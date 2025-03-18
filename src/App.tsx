import { Provider } from 'react-redux'
import './App.css'
import { Editor } from './app/components/editor/editor'
import { store } from './app/state/store'

// On page load or when changing themes, best to add inline in `head` to avoid FOUC
function theme() {
  if (
    localStorage.theme === 'dark' ||
    (!('theme' in localStorage) &&
      window.matchMedia &&
      window?.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.documentElement.classList.add('dark');
    localStorage.theme = 'dark';
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.theme = 'light';
  }
}

function App() {
  return (
    <Provider store={store}>
      <div className="max-h-screen font-[family-name:var(--font-geist-sans)]">
        <Editor />
      </div>
    </Provider>
  )
}

export default App
