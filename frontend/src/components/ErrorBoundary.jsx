import React from 'react';
import { handleAPIError } from '../utils/errorHandling';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error,
            errorInfo
        });
        
        // Log the error to an error reporting service
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            const errorDetails = handleAPIError(this.state.error);
            
            return (
                <div className="error-boundary">
                    <div className="error-container">
                        <h2>Something went wrong</h2>
                        <p>{errorDetails.message}</p>
                        {process.env.NODE_ENV === 'development' && (
                            <details style={{ whiteSpace: 'pre-wrap' }}>
                                <summary>Error Details</summary>
                                <p>{this.state.error && this.state.error.toString()}</p>
                                <p>{this.state.errorInfo && this.state.errorInfo.componentStack}</p>
                            </details>
                        )}
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null, errorInfo: null });
                                window.location.reload();
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 