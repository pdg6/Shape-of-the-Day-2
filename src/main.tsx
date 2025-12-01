import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/shared/ErrorBoundary'

// Ensure the root element exists before trying to render
const rootElement = document.getElementById('root');

if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            <ErrorBoundary>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ErrorBoundary>
        </StrictMode>,
    )
} else {
    console.error('Failed to find the root element');
}
