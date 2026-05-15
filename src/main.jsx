import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { initFileStorage } from './db.js'

registerSW({ immediate: true })

// Initialize file storage first, then render
// This loads data from linked desktop file (if any) before UI appears
initFileStorage().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  )
})
