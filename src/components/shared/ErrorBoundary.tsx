import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl w-full border border-red-200 dark:border-red-900">
                        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
                            Something went wrong
                        </h1>

                        <div className="mb-6">
                            <p className="text-gray-700 dark:text-gray-300 mb-2">
                                The application encountered an unexpected error.
                            </p>
                            {this.state.error && (
                                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-100 dark:border-red-900/50 overflow-auto max-h-60">
                                    <p className="font-mono text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">
                                        {this.state.error.toString()}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-md transition-colors font-medium"
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.reload();
                                }}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition-colors font-medium"
                            >
                                Clear Cache & Reload
                            </button>
                        </div>

                        {this.state.errorInfo && (
                            <details className="mt-6 text-xs text-gray-500 dark:text-gray-400">
                                <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 mb-2">
                                    Component Stack
                                </summary>
                                <pre className="whitespace-pre-wrap overflow-auto max-h-40 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
