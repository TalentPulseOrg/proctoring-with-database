import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const WarningContext = createContext();

export const WarningProvider = ({ children }) => {
  const MAX_WARNINGS = 3;
  const [warningCount, setWarningCount] = useState(MAX_WARNINGS);
  const [isWarningSystemActive, setIsWarningSystemActive] = useState(false);
  const [isTestActive, setIsTestActive] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isExhaustionHandled, setIsExhaustionHandled] = useState(false);
  const [onWarningExhausted, setOnWarningExhaustedCallback] = useState(null);

  // Reset exhaustion state and warning count when test ends
  useEffect(() => {
    if (!isTestActive) {
      setIsExhaustionHandled(false);
      setWarningCount(MAX_WARNINGS);
    }
  }, [isTestActive]);

  // Call exhaustion callback when warnings reach 0
  useEffect(() => {
    if (warningCount === 0 && !isExhaustionHandled && onWarningExhausted) {
      setIsExhaustionHandled(true);
      onWarningExhausted();
    }
  }, [warningCount, isExhaustionHandled, onWarningExhausted]);

  const handleViolation = useCallback((type, details) => {
    if (isWarningSystemActive && !isExhaustionHandled) {
      setWarningCount(prev => {
        if (prev > 0) {
          return prev - 1;
        }
        return prev;
      });
    }
  }, [isWarningSystemActive, isExhaustionHandled]);

  const setOnWarningExhausted = useCallback((callback) => {
    setOnWarningExhaustedCallback(() => callback);
  }, []);

  const startTest = useCallback(() => {
    setIsWarningSystemActive(true);
    setIsTestActive(true);
    setHasInitialized(true);
    setWarningCount(MAX_WARNINGS);
    setIsExhaustionHandled(false);
  }, []);

  const endTest = useCallback(() => {
    setIsWarningSystemActive(false);
    setIsTestActive(false);
    setWarningCount(MAX_WARNINGS);
    setHasInitialized(false);
    setIsExhaustionHandled(false);
  }, []);

  const value = {
    warningCount,
    handleViolation,
    setOnWarningExhausted,
    startTest,
    endTest,
    isTestActive,
    hasInitialized,
    MAX_WARNINGS
  };

  return (
    <WarningContext.Provider value={value}>
      {children}
    </WarningContext.Provider>
  );
};

export const useWarning = () => {
  const context = useContext(WarningContext);
  if (!context) {
    throw new Error('useWarning must be used within a WarningProvider');
  }
  return context;
}; 