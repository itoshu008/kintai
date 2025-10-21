import React from 'react'

export class ErrorBoundary extends React.Component<{children: React.ReactNode},{error?: Error}> {
  state = { error: undefined as Error | undefined }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16 }}>
          <h2>❌ 画面の描画でエラーが発生しました</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error.stack || this.state.error.message)}</pre>
        </div>
      )
    }
    return this.props.children
  }
}