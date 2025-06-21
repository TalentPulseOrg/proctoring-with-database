import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { ScreenMonitorProvider } from './contexts/ScreenMonitorContext';
import { BehavioralAnalysisProvider } from './contexts/BehavioralAnalysisContext';
import { BrowserControlsProvider } from './contexts/BrowserControlsContext';
import { AuthProvider } from './contexts/AuthContext';
import HealthCheck from './components/HealthCheck';
import { WarningProvider } from './contexts/WarningContext';

import ErrorBoundary from './components/ErrorBoundary';
import './styles/ErrorBoundary.css';

function App() {

  return (
    <ErrorBoundary>
      <WarningProvider>
        <BrowserRouter>
          <AuthProvider>
            <ScreenMonitorProvider>
              <BrowserControlsProvider>
                  <BehavioralAnalysisProvider>
                    <AppRoutes />
                    <HealthCheck />
                  </BehavioralAnalysisProvider>
              </BrowserControlsProvider>
            </ScreenMonitorProvider>
          </AuthProvider>
        </BrowserRouter>
      </WarningProvider>
    </ErrorBoundary>
  );
}

export default App;