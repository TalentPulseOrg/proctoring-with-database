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
    console.log('WarningContext: handleViolation called with type:', type, 'isWarningSystemActive:', isWarningSystemActive, 'isExhaustionHandled:', isExhaustionHandled);
    if (isWarningSystemActive && !isExhaustionHandled) {
      setWarningCount(prev => {
        const newCount = prev > 0 ? prev - 1 : prev;
        console.log('WarningContext: Warning count decremented from', prev, 'to', newCount);
        return newCount;
      });
    } else {
      console.log('WarningContext: Warning system not active or exhaustion already handled');
    }
  }, [isWarningSystemActive, isExhaustionHandled]);

  const setOnWarningExhausted = useCallback((callback) => {
    setOnWarningExhaustedCallback(() => callback);
  }, []);

  const startTest = useCallback(() => {
    console.log('WarningContext: startTest called, activating warning system');
    setIsWarningSystemActive(true);
    setIsTestActive(true);
    setHasInitialized(true);
    setWarningCount(MAX_WARNINGS);
    setIsExhaustionHandled(false);
    console.log('WarningContext: Warning system activated, warning count reset to', MAX_WARNINGS);
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