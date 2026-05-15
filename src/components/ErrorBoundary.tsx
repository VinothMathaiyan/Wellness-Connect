import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  isOffline: boolean;
}

/**
 * ErrorBoundary — catches render-time crashes (including Supabase / network
 * failures that bubble up through the component tree) and shows a friendly
 * recovery UI instead of a blank white screen.
 *
 * Place this around any subtree that makes network calls.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isOffline: false };

  static getDerivedStateFromError(): State {
    return { hasError: true, isOffline: !navigator.onLine };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, isOffline: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const offline = this.state.isOffline;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 text-center">
        <div className="text-[48px] mb-4">{offline ? '📶' : '⚠️'}</div>
        <h2 className="text-[18px] font-bold text-[#111827] mb-2">
          {offline ? "You're offline" : 'Something went wrong'}
        </h2>
        <p className="text-[13px] text-[#6B7280] mb-6 max-w-[280px] leading-relaxed">
          {offline
            ? 'Check your internet connection and try again. Your data is safe.'
            : 'An unexpected error occurred. Please try refreshing the page.'}
        </p>
        <button
          onClick={this.handleRetry}
          className="px-6 py-3 bg-[#1D9E75] text-white text-[14px] font-semibold rounded-[10px] active:scale-[0.97] transition-transform"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-[13px] text-[#6B7280] underline"
        >
          Reload page
        </button>
      </div>
    );
  }
}
