"use client";
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) {
    console.error('[pronunciation-render]', error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="mt-4 rounded-xl border border-rose-800 p-3 text-sm text-rose-300">
      Khung luyện phát âm gặp lỗi. Bài học vẫn được giữ.
      <button type="button" className="ml-2 min-h-11 underline" onClick={() => this.setState({ failed: false })}>Mở lại luyện phát âm</button>
    </div>;
  }
}
