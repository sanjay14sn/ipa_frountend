"use client";

import React from "react";
import { sendClientLog } from "@/lib/client-telemetry";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ComponentErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    sendClientLog({
      level: "error",
      event: "component-error",
      message: error.message || "Component error",
      context: {
        componentName: this.props.componentName,
        componentStack: info.componentStack,
        stack: error.stack,
      },
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          <span>This component failed to load. Please refresh the page.</span>
        </div>
      );
    }
    return this.props.children;
  }
}
