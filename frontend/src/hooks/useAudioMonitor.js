import { useEffect, useRef, useState } from 'react';
import { initAudioClassifier, startMicStream, stopMicStream } from '../services/audioClassifierService';

const ALERT_COOLDOWN = 3000; // ms

export default function useAudioMonitor(enabled = true) {
  const [alert, setAlert] = useState(null);
  const [monitoring, setMonitoring] = useState(false);
  const cooldownRef = useRef(false);
  const sessionEvents = useRef([]);
  const [latestResult, setLatestResult] = useState(null);

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
          if (result.volumeFlag) {
            message = `🔊 Audio level ${result.volumeFlag.toLowerCase()} (volume: ${result.volumeLevel.toFixed(2)}x baseline)`;
          } else if (["Speech", "Music", "Typing"].includes(result.label)) {
            message = `🚨 ${result.label} detected (confidence: ${result.confidence.toFixed(2)})`;
          }
          setAlert({ message, timestamp: Date.now() });
          sessionEvents.current.push({ ...result, time: Date.now() });
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
  }, [enabled]);

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