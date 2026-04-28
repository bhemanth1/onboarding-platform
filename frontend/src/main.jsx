import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="desktop">
          <div className="desktop-viewport" style={{ display: "grid", placeItems: "center" }}>
            <div className="card" style={{ maxWidth: 560, padding: 24 }}>
              <div className="card-title">Something went wrong</div>
              <div className="card-sub">The app hit a render error and switched to a safe fallback.</div>
              <div style={{ marginTop: 14, fontSize: 12, color: "var(--n4)" }}>{this.state.error?.message || "Unknown error"}</div>
              <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => window.location.reload()}>Reload app</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
