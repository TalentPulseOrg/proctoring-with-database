import { useState, useCallback, useEffect } from 'react';
import { recordViolation } from '../api/api';

/**
 * Hook for logging violations and suspicious activities
 * @param {number} sessionId - The test session ID
 * @param {number} testId - The test ID
 * @returns {Object} - Functions and state for violation logging
 */
export const useViolationLogger = (sessionId, testId) => {
  const [violations, setViolations] = useState([]);
  const [violationCount, setViolationCount] = useState(0);
  const [isLogging, setIsLogging] = useState(false);
  
  // Initialize violation logging
  const startLogging = useCallback(() => {
    if (!sessionId) {
      console.error('Cannot start violation logging: Missing session ID');
      return false;
    }
    
    setIsLogging(true);
    return true;
  }, [sessionId]);
  
  // Stop violation logging
  const stopLogging = useCallback(() => {
    setIsLogging(false);
  }, []);
  
  // Log a violation
  const logViolation = useCallback(async (type, details = {}, filepath = null) => {
    if (!isLogging || !sessionId) return false;
    
    const timestamp = new Date().toISOString();
    const violation = {
      type,
      timestamp,
      details: {
        ...details,
        timestamp
      },
      filepath
    };
    
    // Add to local state
    setViolations(prev => [...prev, violation]);
    setViolationCount(prev => prev + 1);
    
    // Send to backend
    try {
      await recordViolation({
        session_id: sessionId,
        test_id: testId,
        violation_type: type,
        details: {
          ...details,
          timestamp
        },
        filepath,
        timestamp
      });
      return true;
    } catch (error) {
      console.error(`Failed to record violation (${type}):`, error);
      return false;
    }
  }, [isLogging, sessionId, testId]);
  
  // Get a summary of violations
  const getViolationSummary = useCallback(() => {
    const summary = {};
    
    violations.forEach(violation => {
      if (!summary[violation.type]) {
        summary[violation.type] = 0;
      }
      summary[violation.type]++;
    });
    
    return summary;
  }, [violations]);
  
  // Generate a consolidated log file content
  const generateLogContent = useCallback(() => {
    if (violations.length === 0) {
      return "No violations recorded.";
    }
    
    let content = `Test Session Violation Log\n`;
    content += `==========================\n`;
    content += `Session ID: ${sessionId}\n`;
    content += `Test ID: ${testId}\n`;
    content += `Total violations: ${violations.length}\n`;
    content += `Generated at: ${new Date().toISOString()}\n\n`;
    
    // Add summary
    content += `Summary:\n`;
    const summary = getViolationSummary();
    Object.entries(summary).forEach(([type, count]) => {
      content += `- ${type}: ${count}\n`;
    });
    
    content += `\nDetailed Log:\n`;
    content += `------------\n\n`;
    
    // Sort violations by timestamp
    const sortedViolations = [...violations].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Add detailed log entries
    sortedViolations.forEach((violation, index) => {
      content += `[${index + 1}] ${violation.type.toUpperCase()}\n`;
      content += `    Timestamp: ${violation.timestamp}\n`;
      
      // Add details
      if (violation.details && Object.keys(violation.details).length > 0) {
        content += `    Details:\n`;
        Object.entries(violation.details).forEach(([key, value]) => {
          if (key !== 'timestamp') {
            content += `        - ${key}: ${value}\n`;
          }
        });
      }
      
      // Add filepath if available
      if (violation.filepath) {
        content += `    Image File: ${violation.filepath}\n`;
      }
      
      content += `\n`;
    });
    
    return content;
  }, [violations, sessionId, testId, getViolationSummary]);
  
  // Save log to file
  const downloadLog = useCallback(() => {
    const content = generateLogContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `violation_log_session_${sessionId}_${new Date().toISOString().replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }, [generateLogContent, sessionId]);
  
  // Clear all violations
  const clearViolations = useCallback(() => {
    setViolations([]);
    setViolationCount(0);
  }, []);
  
  return {
    violations,
    violationCount,
    isLogging,
    startLogging,
    stopLogging,
    logViolation,
    getViolationSummary,
    generateLogContent,
    downloadLog,
    clearViolations
  };
};