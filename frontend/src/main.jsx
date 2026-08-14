import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './admin-final.css'
import App from './App.jsx'
import GlobalDialog from './components/GlobalDialog.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <GlobalDialog />
  </StrictMode>,
)
