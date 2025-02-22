import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ContextMenuProvider } from './app/providers/contextmenu'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContextMenuProvider>
      <App />
    </ContextMenuProvider>
  </StrictMode>,
)
