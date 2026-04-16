import { Component } from 'react'

// Error boundary to catch recharts crashes on remount
export class ChartBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { crashed: false }
  }
  static getDerivedStateFromError() { return { crashed: true } }
  componentDidUpdate(prevProps) {
    // Reset on new data
    if (prevProps.dataKey !== this.props.dataKey && this.state.crashed) {
      this.setState({ crashed: false })
    }
  }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: this.props.height || 260,
          fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)' }}>
          <button onClick={() => this.setState({ crashed: false })}
            style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--cyan)', background: 'none',
              border: '1px solid rgba(0,229,255,0.3)', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}>
            Reload chart
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
