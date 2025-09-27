import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ContextMenuProvider } from './app/providers/contextmenu'
import { DialogBoxProvider } from './app/providers/dialog'
import { PromptMenuProvider } from './app/providers/customprompt'
import { DropdownPanelProvider } from './app/components/shared/dropdown/dropdownpanel'
import { MarkerElement } from './app/components/web/marker'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContextMenuProvider>
      <DialogBoxProvider>
        <PromptMenuProvider>
          <DropdownPanelProvider>
            <App />
          </DropdownPanelProvider>
        </PromptMenuProvider>
      </DialogBoxProvider>
    </ContextMenuProvider>
  </StrictMode>,
)

function init() {
  customElements.define('c-marker', MarkerElement);
}

init();

