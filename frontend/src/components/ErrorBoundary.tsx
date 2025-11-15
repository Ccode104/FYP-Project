// src/components/ErrorBoundary.tsx

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center flex-col">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-500">Please refresh the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}