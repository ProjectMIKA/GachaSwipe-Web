import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './core/index.css';
import JSZip from 'jszip';

// Export JSZip to window for deck archiving
window.JSZip = JSZip;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
