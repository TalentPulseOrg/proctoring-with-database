// Progressive loading utilities and lazy-loaded components
import { lazy, Suspense } from 'react';

// Loading component
export const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">{message}</span>
  </div>
);

// Error boundary for lazy components
export class LazyComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy component loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800">Failed to load component</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for progressive loading
export const withProgressiveLoading = (
  importFunc, 
  fallback = <LoadingSpinner />,
  errorBoundary = true
) => {
  const LazyComponent = lazy(importFunc);
  
  const ProgressiveComponent = (props) => {
    const content = (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );

    if (errorBoundary) {
      return (
        <LazyComponentErrorBoundary>
          {content}
        </LazyComponentErrorBoundary>
      );
    }

    return content;
  };

  ProgressiveComponent.displayName = `Progressive(${LazyComponent.displayName || 'Component'})`;
  return ProgressiveComponent;
};

// Lazy-loaded monitoring components
export const LazyProctoringStatus = withProgressiveLoading(
  () => import('../components/ProctoringStatus'),
  <LoadingSpinner message="Loading proctoring status..." />
);

export const LazyWebcamFeed = withProgressiveLoading(
  () => import('../components/WebcamFeed'),
  <LoadingSpinner message="Loading webcam feed..." />
);

export const LazyProctoringSuite = withProgressiveLoading(
  () => import('../components/ProctoringSuite'),
  <LoadingSpinner message="Loading proctoring suite..." />
);

export const LazyProctoringReport = withProgressiveLoading(
  () => import('../components/ProctoringReport'),
  <LoadingSpinner message="Loading report..." />
);

export const LazyTestMonitoringViewer = withProgressiveLoading(
  () => import('../components/TestMonitoringViewer'),
  <LoadingSpinner message="Loading monitoring viewer..." />
);

// Progressive resource loader
export class ProgressiveResourceLoader {
  constructor() {
    this.loadedResources = new Set();
    this.loadingPromises = new Map();
    this.observers = new Map();
  }

  // Load resource with caching
  async loadResource(id, loadFunction) {
    if (this.loadedResources.has(id)) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id);
    }

    const promise = loadFunction().then(() => {
      this.loadedResources.add(id);
      this.loadingPromises.delete(id);
      this.notifyObservers(id, 'loaded');
    }).catch(error => {
      this.loadingPromises.delete(id);
      this.notifyObservers(id, 'error', error);
      throw error;
    });

    this.loadingPromises.set(id, promise);
    this.notifyObservers(id, 'loading');
    
    return promise;
  }

  // Add observer for resource loading
  addObserver(id, callback) {
    if (!this.observers.has(id)) {
      this.observers.set(id, []);
    }
    this.observers.get(id).push(callback);
  }

  // Remove observer
  removeObserver(id, callback) {
    if (this.observers.has(id)) {
      const callbacks = this.observers.get(id);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notify observers
  notifyObservers(id, status, data = null) {
    if (this.observers.has(id)) {
      this.observers.get(id).forEach(callback => {
        callback(status, data);
      });
    }
  }

  // Check if resource is loaded
  isLoaded(id) {
    return this.loadedResources.has(id);
  }

  // Preload resources
  async preloadResources(resourceConfigs) {
    const preloadPromises = resourceConfigs.map(config => 
      this.loadResource(config.id, config.loadFunction)
    );

    await Promise.allSettled(preloadPromises);
  }
}

// Global resource loader instance
export const resourceLoader = new ProgressiveResourceLoader();

// Hook for using progressive loading
export const useProgressiveLoading = (resourceId, loadFunction) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (resourceLoader.isLoaded(resourceId)) {
      setStatus('loaded');
      return;
    }

    const observer = (newStatus, data) => {
      setStatus(newStatus);
      if (newStatus === 'error') {
        setError(data);
      } else {
        setError(null);
      }
    };

    resourceLoader.addObserver(resourceId, observer);

    // Start loading if not already loading
    if (status === 'idle') {
      resourceLoader.loadResource(resourceId, loadFunction).catch(() => {
        // Error handling is done by the observer
      });
    }

    return () => {
      resourceLoader.removeObserver(resourceId, observer);
    };
  }, [resourceId, loadFunction]);

  const reload = useCallback(() => {
    resourceLoader.loadResource(resourceId, loadFunction).catch(() => {
      // Error handling is done by the observer
    });
  }, [resourceId, loadFunction]);

  return { status, error, reload };
};

// Component for conditional rendering based on test state
export const ConditionalRender = ({ condition, children, fallback = null, defer = false }) => {
  const [shouldRender, setShouldRender] = useState(!defer);

  useEffect(() => {
    if (defer && condition) {
      // Defer rendering to next tick to avoid blocking
      setTimeout(() => setShouldRender(true), 0);
    } else if (!defer) {
      setShouldRender(condition);
    }
  }, [condition, defer]);

  if (!shouldRender || !condition) {
    return fallback;
  }

  return children;
};
