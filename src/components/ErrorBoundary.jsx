import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected render error.' };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="shell page-shell">
          <div className="card">
            <p className="eyebrow">Render error</p>
            <h2>Something on the page failed to load.</h2>
            <p className="muted">{this.state.message}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
