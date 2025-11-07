/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in child component tree and displays fallback UI
 */

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 text-center">
            <p className="text-sm text-white/50">Preview failed to load.</p>
            <p className="text-xs text-white/30 mt-2">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
