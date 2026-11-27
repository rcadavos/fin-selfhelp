"use client";

import { Component, type ReactNode } from "react";

type Props = {
  /** What shows in place of the section; `retry` clears the error and renders the section again. */
  fallback: (retry: () => void) => ReactNode;
  /** Called by `retry` before re-rendering. Pass React Query's `reset` from `QueryErrorResetBoundary` so a failed query refetches. */
  onReset?: () => void;
  /** Changing it clears the error, for example when a panel opens on a different item. */
  resetKey?: string;
  children: ReactNode;
};

type State = { hasError: boolean; key: string | undefined };

/**
 * Catches a render error (such as a failed `useSuspenseQuery`) in one section and
 * shows a fallback in its place, so a side panel that cannot load its list does not
 * take the whole page down with it.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, key: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { hasError: false, key: props.resetKey } : null;
  }

  retry = () => {
    this.props.onReset?.();
    this.setState({ hasError: false });
  };

  render() {
    return this.state.hasError ? this.props.fallback(this.retry) : this.props.children;
  }
}
