import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'react-phone-number-input/style.css'
import './index.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
