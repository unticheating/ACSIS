import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/google-sans/400.css'
import '@fontsource/google-sans/500.css'
import '@fontsource/google-sans/600.css'
import '@fontsource/google-sans/700.css'
import '@fontsource/google-sans/latin-700-italic.css'
import './styles/design-tokens.css'
import './styles/acsis-card-surface.css'
import './index.css'
import './styles/dark-mode-system.css'
import './styles/scrollbars.css'
import './styles/light-mode-system.css'
import './styles/acsis-toast.css'
import App from './App.jsx'
import { DOCUMENT_LOGO_SRC } from './config/brandAssets.js'
import { setDocumentFavicon } from './lib/setDocumentFavicon.js'
import { Toaster } from './components/ui/sonner.jsx'
import { InstitutionThemeProvider } from './context/InstitutionThemeContext.jsx'
import { SessionProvider } from './context/SessionContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

setDocumentFavicon(DOCUMENT_LOGO_SRC)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SessionProvider>
          <InstitutionThemeProvider>
            <App />
            <Toaster />
          </InstitutionThemeProvider>
        </SessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
