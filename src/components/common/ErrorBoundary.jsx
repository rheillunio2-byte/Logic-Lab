import React from "react";
export default class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("LogicLab error:", error, info?.componentStack); }
  componentDidUpdate(prev) { if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="error-boundary" role="alert"><h2>Something went wrong</h2><p>This page hit an unexpected error. Your saved circuits are safe in local storage.</p><pre>{String(this.state.error?.message || this.state.error)}</pre>
      <div className="btn-row"><button className="btn primary" onClick={() => this.setState({ error: null })}>Try again</button><button className="btn" onClick={() => { location.hash = "#/dashboard"; this.setState({ error: null }); }}>Go to dashboard</button></div></div>;
  }
}
