import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global error boundary to prevent blank screens
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error: error.message || String(error) }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', color: '#ff2d78', background: '#0a0a12', minHeight: '100vh' }}>
          <div style={{ fontSize: 20, marginBottom: 16 }}>⚠ App Error</div>
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', color: '#e2d9ff' }}>{this.state.error}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '8px 16px', background: '#ff2d78', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
