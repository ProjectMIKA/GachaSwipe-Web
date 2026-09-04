import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { LaylaWebSDK } from './web/laylaWebAdapter.js';
import JSZip from 'jszip';

// Initialize Web-Native Layla SDK and export globals
window.LaylaSDK = LaylaWebSDK;
window.layla = new LaylaWebSDK();
window.JSZip = JSZip;
window.installLaylaMock = ({ debug } = {}) => {
  console.log("🐾 [M.I.K.A. OS] Web-Native Layla Shim Active 🐾");
};

// Dispatch readiness event for any listeners waiting on the SDK
window.dispatchEvent(new Event('layla-sdk-ready'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🐾 [M.I.K.A. OS] Unhandled UI Exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', width: '100vw', background: '#050308', color: '#00E5FF',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐾⚠️</div>
          <h2 style={{ color: '#00E5FF', margin: '0 0 12px 0', textShadow: '0 0 10px rgba(0,229,255,0.4)' }}>
            &gt; SYSTEM_EXCEPTION_INTERCEPTED
          </h2>
          <p style={{ color: '#EBE3D6', maxWidth: '600px', lineHeight: 1.5, marginBottom: '24px', fontSize: '12px' }}>
            {this.state.error?.message || 'A neural matrix disruption occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: '4px', border: '1px solid #00E5FF',
              background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF',
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontWeight: 'bold', cursor: 'pointer', letterSpacing: '0.1em'
            }}
          >
            [ REBOOT_MATRIX ]
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const bootApp = () => {
  try {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("CRITICAL BOOT FAILURE:", error);
    if (document.body) {
      document.body.innerHTML = `
        <div style="color: #00E5FF; background: #050308; padding: 30px; font-family: monospace; position: absolute; inset: 0; z-index: 999999;">
          <h3>🐾 [M.I.K.A. OS] BOOT FAILURE</h3>
          <p>${error.message}</p>
          <pre>${error.stack}</pre>
        </div>
      `;
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
