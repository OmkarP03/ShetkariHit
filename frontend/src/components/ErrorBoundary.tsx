import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Without this, any thrown error during render unmounts the whole tree and
 * leaves a white page — the least debuggable outcome possible. This turns it
 * into a readable message plus the stack, which is what you actually need.
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ShetkariHit] render error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-dvh bg-canvas px-5 py-10">
        <div className="mx-auto max-w-md">
          <h1 className="text-display text-danger">Something broke</h1>
          <p className="mt-2 text-body text-ink-muted">
            The app hit an error while rendering. The details below are what to
            search for or send on.
          </p>
          <pre className="mt-5 overflow-auto rounded-card border border-hairline bg-surface p-4 text-sm text-ink">
            {error.message}
          </pre>
          {error.stack && (
            <pre className="mt-3 max-h-64 overflow-auto rounded-card border border-hairline bg-surface p-4 text-xs text-ink-faint">
              {error.stack}
            </pre>
          )}
          <button onClick={() => window.location.reload()} className="btn-primary mt-6">
            Reload
          </button>
        </div>
      </div>
    );
  }
}
