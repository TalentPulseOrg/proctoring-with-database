import { useEffect, useRef, useState } from 'react';
import { initAudioClassifier, startMicStream, stopMicStream } from '../services/audioClassifierService';
import { useEnhancedViolationLogger } from './useEnhancedViolationLogger';

const ALERT_COOLDOWN = 3000; // ms
const VIOLATION_COOLDOWN = 10000; // 10 seconds cooldown for violation logging

export default function useEnhancedAudioMonitor(sessionId, enabled = true) {
  const [alert, setAlert] = useState(null);
  const [monitoring, setMonitoring] = useState(false);
  const cooldownRef = useRef(false);
  const violationCooldownRef = useRef(0);
  const sessionEvents = useRef([]);
  const [latestResult, setLatestResult] = useState(null);
  
  // Initialize enhanced violation logger
  const violationLogger = useEnhancedViolationLogger(sessionId);

  useEffect(() => {
    // Start violation logging when component mounts
    if (sessionId && violationLogger) {
      violationLogger.startLogging();
    }
    
    return () => {
      if (violationLogger) {
        violationLogger.stopLogging();
      }
    };
  }, [sessionId, violationLogger]);

  useEffect(() => {
    let active = true;
    if (!enabled) return;
    let classifierReady = false;
    let stopRequested = false;

    async function start() {
      await initAudioClassifier();
      classifierReady = true;
      if (!active || stopRequested) return;
      setMonitoring(true);
      startMicStream((result) => {
        if (!active || stopRequested) return;
        setLatestResult(result);
        
        if (result.suspicious && !cooldownRef.current) {
          let message = '';
          let audioType = '';
          
          if (result.volumeFlag) {
            message = `🔊 Audio level ${result.volumeFlag.toLowerCase()} (volume: ${result.volumeLevel.toFixed(2)}x baseline)`;
            audioType = 'volume_' + result.volumeFlag.toLowerCase();
          } else if (["Speech", "Music", "Typing"].includes(result.label)) {
            message = `🚨 ${result.label} detected (confidence: ${result.confidence.toFixed(2)})`;
            audioType = result.label.toLowerCase();
          }
          
          setAlert({ message, timestamp: Date.now() });
          sessionEvents.current.push({ ...result, time: Date.now() });
          
          // Log violation with cooldown
          const now = Date.now();
          if (now - violationCooldownRef.current > VIOLATION_COOLDOWN && violationLogger) {
            violationLogger.logAudioSuspicious({
              type: audioType,
              confidence: result.confidence,
              volumeLevel: result.volumeLevel
            });
            violationCooldownRef.current = now;
          }
          
          cooldownRef.current = true;
          setTimeout(() => {
            cooldownRef.current = false;
          }, ALERT_COOLDOWN);
        } else if (!result.suspicious) {
          setAlert(null);
        }
      });
    }
    
    start();
    
    return () => {
      active = false;
      stopRequested = true;
      stopMicStream();
      setMonitoring(false);
      setAlert(null);
    };
  }, [enabled, violationLogger]);

  return {
    alert,
    monitoring,
    sessionEvents: sessionEvents.current,
    latestResult,
    stop: stopMicStream,
    start: () => {
      setMonitoring(true);
    },
  };
}
