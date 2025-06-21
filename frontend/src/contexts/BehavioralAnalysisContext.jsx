import React, { createContext, useContext, useState, useEffect } from 'react';
import { recordBehavioralAnomaly, getProctoringData } from '../api/api';

const BehavioralAnalysisContext = createContext();

export const useBehavioralAnalysis = () => {
  const context = useContext(BehavioralAnalysisContext);
  if (!context) {
    throw new Error('useBehavioralAnalysis must be used within a BehavioralAnalysisProvider');
  }
  return context;
};

export const BehavioralAnalysisProvider = ({ children }) => {
  const [anomalies, setAnomalies] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize a session when tracking starts
  const initSession = async (testSessionId) => {
    if (testSessionId) {
      setSessionId(testSessionId);
      return testSessionId;
    }
    return null;
  };

  // Fetch anomalies from the server for a session
  const fetchAnomalies = async (sid) => {
    if (!sid) return;
    
    try {
      setLoading(true);
      setError(null);
      const proctoringData = await getProctoringData(sid);
      if (proctoringData && proctoringData.behavioral_anomalies) {
        setAnomalies(proctoringData.behavioral_anomalies);
      }
    } catch (err) {
      console.error('Failed to fetch behavioral anomalies:', err);
      setError('Failed to load behavioral data');
    } finally {
      setLoading(false);
    }
  };

  const addAnomaly = async (anomaly) => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const anomalyData = {
        session_id: sessionId,
        anomaly_type: anomaly.type,
        details: anomaly.details || {},
        timestamp: anomaly.timestamp || new Date().toISOString()
      };
      
      const response = await recordBehavioralAnomaly(anomalyData);
      setAnomalies(prev => [...prev, response]);
    } catch (err) {
      console.error('Failed to record behavioral anomaly:', err);
      setError('Failed to record behavioral data');
    } finally {
      setLoading(false);
    }
  };

  const clearAnomalies = () => {
    setAnomalies([]);
  };

  const startTracking = async (testSessionId) => {
    const sid = await initSession(testSessionId);
    if (sid) {
      setIsTracking(true);
      return true;
    }
    return false;
  };

  const stopTracking = () => {
    setIsTracking(false);
  };

  const value = {
    anomalies,
    isTracking,
    loading,
    error,
    sessionId,
    addAnomaly,
    clearAnomalies,
    startTracking,
    stopTracking,
    fetchAnomalies
  };

  return (
    <BehavioralAnalysisContext.Provider value={value}>
      {children}
    </BehavioralAnalysisContext.Provider>
  );
};

export default BehavioralAnalysisContext; 