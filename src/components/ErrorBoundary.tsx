import * as Sentry from '@sentry/react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { appStoreApi, useAppStore } from '@/state/useAppStore';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    Sentry.captureException(error);
    appStoreApi.getState().reportError('react', `${error.message}\n${info.componentStack}`);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <main className="app">
        <div className="errorFallback">
          <h1>VELOX recovered from a UI crash</h1>
          <p>{this.state.error.message}</p>
          <button type="button" onClick={() => this.setState({ error: null })}>Try Again</button>
        </div>
      </main>
    );
  }
}

export function ErrorTray() {
  const errors = useAppStore(state => state.errors);
  const clearErrors = useAppStore(state => state.clearErrors);
  if (!errors.length) return null;
  const latest = errors[0];
  return (
    <div className="errorTray" role="status">
      <b>{latest.source}</b>
      <span>{latest.message}</span>
      <button type="button" onClick={clearErrors} aria-label="Dismiss error">x</button>
    </div>
  );
}
