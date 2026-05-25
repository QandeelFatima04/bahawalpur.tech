"use client";

import { Component } from "react";

/**
 * Generic React error boundary. Use to wrap routes/components that may throw at
 * render time (e.g. CoachView's useMicVAD can fail if microphone or WASM
 * assets are unavailable). Without this, a single failed hook collapses the
 * whole route to a network-level "This page couldn't load" error in Chrome.
 *
 * Usage:
 *   <ErrorBoundary fallback={<MyFallback />}>
 *     <RiskyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to the browser console so the cause is visible in DevTools.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.reset);
      }
      return this.props.fallback ?? (
        <div className="flex h-[calc(100vh-200px)] min-h-[480px] flex-col items-center justify-center gap-3 rounded-2xl bg-card p-6 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-[15px] font-semibold text-foreground">
            Something went wrong loading this page.
          </p>
          <p className="max-w-md text-[13px] text-muted-foreground">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.reset}
            className="rounded-pill bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
