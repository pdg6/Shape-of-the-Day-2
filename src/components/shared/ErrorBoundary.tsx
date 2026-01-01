import { Component, ErrorInfo, ReactNode } from 'react';

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
                <div className="min-h-screen flex items-center justify-center bg-(--bg-page) p-6">
                    <div className="bg-tile p-10 rounded-2xl shadow-layered max-w-2xl w-full border border-border-subtle relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                        <h1 className="text-3xl font-black text-red-600 mb-6 uppercase tracking-tight">
                            Something went wrong
                        </h1>

                        <div className="mb-6">
                            <p className="text-brand-textSecondary mb-4 font-bold">
                                The application encountered an unexpected error.
                            </p>
                            {this.state.error && (
                                <div className="bg-red-500/5 p-5 rounded-xl border border-red-500/20 overflow-auto max-h-60 mb-8 shadow-inner-layered">
                                    <p className="font-mono text-xs text-red-600/80 whitespace-pre-wrap leading-relaxed">
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
                                className="px-6 py-3 bg-tile-alt hover:bg-tile-hover border border-border-subtle text-brand-textPrimary rounded-xl transition-float font-black text-[10px] uppercase tracking-widest shadow-layered-sm button-lift-dynamic"
                            >
                                Reload App
                            </button>
                        </div>

                        {this.state.errorInfo && (
                            <details className="mt-8 text-[10px] text-brand-textMuted font-black uppercase tracking-widest">
                                <summary className="cursor-pointer hover:text-brand-textSecondary mb-3 transition-colors">
                                    Advanced Error Details
                                </summary>
                                <pre className="whitespace-pre-wrap overflow-auto max-h-40 p-4 bg-tile-alt rounded-xl border border-border-subtle text-brand-textSecondary normal-case tracking-normal">
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
