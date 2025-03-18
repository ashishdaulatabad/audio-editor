import { Provider } from 'react-redux'
import './App.css'
import { Editor } from './app/components/editor/editor'
import { store } from './app/state/store'

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
