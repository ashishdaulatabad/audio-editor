import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ContextMenuProvider } from './app/providers/contextmenu'
import { DialogBoxProvider } from './app/providers/dialog'
import { PromptMenuProvider } from './app/providers/customprompt'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContextMenuProvider>
      <DialogBoxProvider>
        <PromptMenuProvider>
          <App />
        </PromptMenuProvider>
      </DialogBoxProvider>
    </ContextMenuProvider>
  </StrictMode>,
)
