import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  generateQuestions,
  startTestSession,
  submitTest,
  recordViolation,
  saveScreenCapture,
  getTestById,
  startScreenshotService,
  stopScreenshotService,
  getCurrentUser,
} from "../api/api";
import { useScreenMonitor } from "../contexts/ScreenMonitorContext";
import { useBrowserControls } from "../contexts/BrowserControlsContext";
import { useTestSubmission } from "../hooks/useTestSubmission";
import ScreenMonitorStatus from "./ScreenMonitorStatus";
import ProctoringSuite from "./ProctoringSuite";
import { analyzeLighting } from "../utils/lightingAnalyzer";
import axios from "axios";
import WebcamFeed from "./WebcamFeed";
import CodeBlock from "./CodeBlock";
import { useWarning } from "../contexts/WarningContext";
import { Box } from "@mui/material";
import { WarningProvider } from "../contexts/WarningContext";
import useAudioMonitor from '../hooks/useAudioMonitor';
import { API_BASE_URL } from '../config';
import { useViolationLogger } from '../hooks/useViolationLogger';
import { colors } from '../styles/theme';

export default function TestInterface() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [testData, setTestData] = useState(null);
  const [suspiciousActivity, setSuspiciousActivity] = useState(null);
  const [lightingStatus, setLightingStatus] = useState(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [faceCount, setFaceCount] = useState(0);
  const [showWebcamAlert, setShowWebcamAlert] = useState(false);
  const [isScreenshotServiceActive, setIsScreenshotServiceActive] =
    useState(false);
  const [isFullscreenRequested, setIsFullscreenRequested] = useState(false);
  const [showWarningExhaustionDialog, setShowWarningExhaustionDialog] =
    useState(false);
  const [gazeDirection, setGazeDirection] = useState("Center");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const lightingCheckIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const webcamRef = useRef(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams();
  const location = useLocation();
  const { startMonitoring, stopMonitoring, requestFullscreen, setIsTestActive, isFullScreen } = useScreenMonitor();
  const {
    submitTestWithRetry,
    formatAnswers: formatTestAnswers,
    calculateScore: calculateTestScore,
  } = useTestSubmission();

  // Add the browser controls hook with fallback
  const { setTestSession, startTest, endTest } = useBrowserControls();

  const {
    warningCount,
    handleViolation: handleWarningExhausted,
    setOnWarningExhausted,
    startTest: startWarningSystem,
    endTest: endWarningSystem,
    MAX_WARNINGS,
    hasInitialized,
  } = useWarning();

  // Audio monitoring
  const { alert: audioAlert, monitoring: isAudioActive, sessionEvents: audioSessionEvents } = useAudioMonitor(isTestStarted);
  const [audioToast, setAudioToast] = useState(null);
  const [audioMeter, setAudioMeter] = useState({ volume: 0, label: '---', confidence: 0 });

  // Ensure sessionId is always an integer
  const setSessionIdSafe = (id) => {
    // Convert to integer if possible, otherwise generate a numeric ID
    if (id) {
      if (typeof id === "number") {
        setSessionId(id);
      } else if (typeof id === "string" && /^\d+$/.test(id)) {
        // String contains only digits, convert to number
        setSessionId(parseInt(id, 10));
      } else {
        // Generate a new numeric ID based on current timestamp
        const numericId = parseInt(Date.now().toString().slice(-8));
        console.log(
          `Converting non-numeric ID to numeric: ${id} -> ${numericId}`
        );
        setSessionId(numericId);
      }
    }
  };

  // Initialize test data
  useEffect(() => {
    const initializeTest = async () => {
      try {
        setLoading(true);
        console.log("Initializing test with data from state:", location.state);
        console.log("URL session ID:", urlSessionId);
        console.log("Authenticated user:", user);

        // Get current user information
        let currentUser = user;
        if (!currentUser) {
          currentUser = getCurrentUser();
          console.log("Retrieved user from storage:", currentUser);
        }

        if (!currentUser) {
          console.error("No authenticated user found");
          setError("Please log in to take a test");
          setLoading(false);
          return;
        }

        // Try to get session data from location state first
        let testSessionData = location.state;

        // If no location state, check if we have URL session ID and try to reconstruct data
        if (!testSessionData && urlSessionId) {
          // Try to get minimal data to continue
          const urlParams = new URLSearchParams(window.location.search);
          const testIdFromUrl = urlParams.get("testId");

          if (testIdFromUrl) {
            console.log("Reconstructing session data from URL params");
            testSessionData = {
              testId: testIdFromUrl,
              sessionId: urlSessionId,
              userName: currentUser.name,
              userEmail: currentUser.email,
              user_id: currentUser.id,
            };
          }
        }

        if (!testSessionData) {
          console.log("No test data found, redirecting to exam page");
          setError(
            "Missing test session data. Please register for a test first."
          );
          setLoading(false);
          return;
        }

        // Fetch test details from the backend
        let testDetails = {};
        if (testSessionData.testId) {
          try {
            console.log(
              "Fetching test details for test ID:",
              testSessionData.testId
            );
            const testResponse = await getTestById(testSessionData.testId);

            if (!testResponse.error) {
              console.log("Received test details:", testResponse);
              testDetails = {
                skill: testResponse.skill,
                duration: testResponse.duration,
                numQuestions: testResponse.num_questions,
              };
            } else {
              console.error("Error fetching test details:", testResponse.error);
            }
          } catch (testError) {
            console.error("Error fetching test details:", testError);
          }
        }

        // Merge all data with user information
        const mergedTestData = {
          testId: testSessionData.testId,
          skill:
            testDetails.skill || testSessionData.skill || "General Knowledge",
          numQuestions:
            testDetails.numQuestions || testSessionData.numQuestions || 5,
          duration: testDetails.duration || testSessionData.duration || 30,
          userName: currentUser.name,
          userEmail: currentUser.email,
          user_id: currentUser.id,
        };

        console.log("Merged test data:", mergedTestData);

        // Generate questions
        let testIdToUse = mergedTestData.testId;

        // If we don't have a testId, try to parse it from the URL or generate a random one
        if (!testIdToUse) {
          const urlParams = new URLSearchParams(window.location.search);
          testIdToUse =
            urlParams.get("testId") || Math.floor(Math.random() * 10000);
          console.log("Using test ID from URL or generated:", testIdToUse);
        }

        console.log("Generating questions for test ID:", testIdToUse);

        const response = await generateQuestions({
          skill: mergedTestData.skill,
          num_questions: mergedTestData.numQuestions,
          duration: mergedTestData.duration,
          test_id: parseInt(testIdToUse, 10),
        });

        if (response.error) {
          throw new Error("Failed to generate questions: " + response.message);
        }

        setTestData({
          ...mergedTestData,
          questions: response.questions,
        });

        // Set session ID if we have one
        if (urlSessionId) {
          console.log("TEST INTERFACE: Using URL session ID:", urlSessionId);
          setSessionIdSafe(urlSessionId);
        } else if (testSessionData.sessionId) {
          console.log(
            "TEST INTERFACE: Using session ID from location state:",
            testSessionData.sessionId
          );
          setSessionIdSafe(testSessionData.sessionId);
        } else {
          console.log("TEST INTERFACE: No session ID found in initialization");
        }

        console.log("Test initialized with session ID:", sessionId);
      } catch (error) {
        console.error("Error initializing test:", error);
        setError("Failed to initialize test: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeTest();
  }, [navigate, urlSessionId, location, user]);

  // Start webcam monitoring when test is started
  useEffect(() => {
    if (!isTestStarted || !testData) return;

    const startMonitoringWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsWebcamActive(true);

          // Wait for video to be ready
          await new Promise((resolve) => {
            if (videoRef.current.readyState >= 2) {
              resolve();
            } else {
              videoRef.current.onloadeddata = resolve;
            }
          });

          // Start periodic capture at 5-second intervals
          if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
          }

          captureIntervalRef.current = setInterval(() => {
            takeWebcamSnapshot();
          }, 5000); // Take webcam snapshot every 5 seconds

          // Start periodic lighting check with reduced frequency
          if (lightingCheckIntervalRef.current) {
            clearInterval(lightingCheckIntervalRef.current);
          }

          lightingCheckIntervalRef.current = setInterval(() => {
            checkLighting().catch(err => {
              console.error('Error in lighting check:', err);
            });
          }, 10000); // Increased to 10 seconds
        }
      } catch (err) {
        console.error("Failed to access webcam:", err);
        setError("Failed to access webcam: " + err.message);
      }
    };

    const checkLighting = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const lightingAnalysis = await analyzeLighting(canvas, sessionId, isTestStarted);
        setLightingStatus(lightingAnalysis);
      } catch (error) {
        console.error('Error analyzing lighting:', error);
      }
    };

    startMonitoringWebcam();

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      if (lightingCheckIntervalRef.current) {
        clearInterval(lightingCheckIntervalRef.current);
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }

      // Stop Python screenshot service on component unmount
      if (isScreenshotServiceActive) {
        stopScreenshotService()
          .then((response) => {
            console.log("Screenshot service stopped on unmount");
            setIsScreenshotServiceActive(false);
          })
          .catch((error) => {
            console.error("Error stopping screenshot service:", error);
          });
      }
    };
  }, [isTestStarted, testData]);

  // Effect to manage test timer
  useEffect(() => {
    if (isTestStarted && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Clear interval when time's up
            clearInterval(timerIntervalRef.current);
            // Auto-submit the test
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTestStarted, timeLeft]);

  // Gaze tracking with WebGazer
  useEffect(() => {
    if (!isTestStarted) return;

    const webgazer = window.webgazer;
    let animationFrameId = null;

    // Helper to determine gaze direction
    const getGazeDirection = (x, y) => {
      // Get viewport dimensions
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Define center region (30% of width/height)
      const centerXMin = width * 0.35;
      const centerXMax = width * 0.65;
      const centerYMin = height * 0.35;
      const centerYMax = height * 0.65;
      if (
        x >= centerXMin &&
        x <= centerXMax &&
        y >= centerYMin &&
        y <= centerYMax
      ) {
        return "Center";
      } else if (y < centerYMin) {
        return "Up";
      } else if (y > centerYMax) {
        return "Down";
      } else if (x < centerXMin) {
        return "Left";
      } else if (x > centerXMax) {
        return "Right";
      }
      return "Unknown";
    };

    if (webgazer) {
      webgazer
        .showVideoPreview(false)
        .showFaceOverlay(false)
        .showFaceFeedbackBox(false)
        .setGazeListener((data, clock) => {
          if (data) {
            const { x, y } = data;
            const direction = getGazeDirection(x, y);
            setGazeDirection(direction);
            // Optionally, still log for debug
            console.log({ x, y, direction, clock });
          }
        })
        .begin();
    }

    return () => {
      if (webgazer && webgazer.end) {
        webgazer.end();
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isTestStarted]);

  const handleStartTest = async () => {
    try {
      setError(null);
      // Call handleEnterFullscreen to trigger fullscreen prompt and start test
      await handleEnterFullscreen();
    } catch (error) {
      console.error("Error in handleStartTest:", error);
      setError(error.message);
    }
  };

  const handleEnterFullscreen = async () => {
    try {
      if (isFullscreenRequested) return;
      setIsFullscreenRequested(true);
      setError(null);
      
      // Start warning system BEFORE starting monitoring
      startWarningSystem();
      console.log("Warning system started");
      
      // Start monitoring which will handle fullscreen
      const monitoringStarted = await startMonitoring(testData.testId);
      if (!monitoringStarted) {
        setError("Failed to start test monitoring. Please try again.");
        setIsFullscreenRequested(false);
        return;
      }
      // setShowFullscreenPrompt(false); // Removed as per edit hint
      // Use existing session ID instead of creating a new one
      let actualSessionId = sessionId;
      if (!actualSessionId) {
        if (location.state?.sessionId) {
          actualSessionId = location.state.sessionId;
          setSessionIdSafe(actualSessionId);
        } else if (urlSessionId) {
          actualSessionId = urlSessionId;
          setSessionIdSafe(actualSessionId);
        } else {
          throw new Error("No session ID available. Please restart the test registration process.");
        }
      }
      // Initialize video and tracking first
      if (videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoRef.current.srcObject = stream;
          await new Promise((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = resolve;
            }
          });
        } catch (error) {
          console.error("Error initializing video:", error);
        }
      }
      await startScreenshotService({ session_id: actualSessionId, test_id: testData.testId });
      setIsScreenshotServiceActive(true);
      // Add a small delay to ensure warning system is properly initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      setTimeLeft(testData.duration * 60);
      setIsTestStarted(true);
      // Set test as active AFTER warning system is started
      setIsTestActive(true); // <-- Start logging for tab/blur/shortcut
      console.log("Test is now active, monitoring started");
      setError(null);
      setIsFullscreenRequested(false);
    } catch (error) {
      console.error("Error starting test:", error);
      setError(error.message);
      setIsFullscreenRequested(false);
    }
  };

  const handleAnswer = (questionIndex, answer) => {
    console.log(`Setting answer for question ${questionIndex} to ${answer}`);
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionIndex]: answer,
    }));
  };

  // Move handleSubmit above memoizedHandleSubmit
  const handleSubmit = async (submissionType = "manual") => {
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setError(null);

      // Format answers for submission using database IDs
      const formattedAnswers = Object.entries(answers).map(
        ([questionIndex, selectedOptionId]) => {
          // Get the actual question ID from the database
          const question = testData.questions[parseInt(questionIndex)];
          const questionId = question?.id || parseInt(questionIndex);
          return {
            question_id: questionId,
            selected_option_id: selectedOptionId,
          };
        }
      );

      // Clear any active intervals
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      // Stop monitoring services
      if (isScreenshotServiceActive) {
        try {
          await stopScreenshotService();
          setIsScreenshotServiceActive(false);
        } catch (error) {
          console.error("Failed to stop screenshot service:", error);
        }
      }

      // Stop webcam monitoring
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }

      // Submit to backend
      const result = await submitTest(
        sessionId,
        formattedAnswers,
        new Date().toISOString()
      );

      if (!result || result.error) {
        throw new Error(result?.message || "Failed to submit test");
      }

      // Set test as ended
      setIsTestStarted(false);
      setIsTestActive(false); // <-- Stop logging for tab/blur/shortcut

      // Navigate to results with complete data
      navigate("/test-results", {
        state: {
          sessionId: sessionId,
          score: result.score,
          totalQuestions: result.total_questions,
          percentage: result.percentage,
          testDetails: {
            testId: testData.testId,
            skill: testData.skill,
            candidate_name: testData.userName,
            duration: testData.duration,
            startTime: testData.startTime,
            endTime: new Date().toISOString(),
          },
          submissionType: submissionType,
          responses: result.responses || [],
          autoSubmitted:
            submissionType === "warnings_exhausted" ||
            submissionType === "time_expired",
        },
        replace: true,
      });
    } catch (error) {
      console.error("Submission failed:", error);
      setError("Failed to submit test. Please try again.");
      setIsSubmitting(false);
    }
  };

  const memoizedHandleSubmit = useCallback((submissionType = "manual") => {
    handleSubmit(submissionType);
  }, [handleSubmit]);

  // Handle manual submission (user clicks submit button)
  const handleManualSubmit = () => handleSubmit("manual");

  // Handle auto submission due to time expiration
  useEffect(() => {
    if (timeLeft === 0 && isTestStarted && !isSubmitting) {
      console.log("Time expired, auto-submitting test");
      handleSubmit("time_expired");
    }
  }, [timeLeft, isTestStarted, isSubmitting]);  // Handle warning exhaustion
  useEffect(() => {
    if (!hasInitialized) return;
    const handleWarningExhausted = () => {
      console.log("[TestInterface] Warning exhaustion handler called");
      setShowWarningExhaustionDialog(true);
      setIsTestStarted(false);
      // Auto-submit the test when warnings are exhausted
      memoizedHandleSubmit("warnings_exhausted");
    };
    setOnWarningExhausted(handleWarningExhausted);
    return () => {
      setOnWarningExhausted(null);
    };
  }, [hasInitialized, setOnWarningExhausted, memoizedHandleSubmit]);

  // Handle warning count reaching zero
  useEffect(() => {
    if (!hasInitialized) return;

    console.log(
      "[TestInterface] Warning count effect - Current count:",
      warningCount
    );
    if (warningCount === 0 && isTestStarted && !isSubmitting) {
      console.log("[TestInterface] Warning count reached 0, showing dialog");
      setShowWarningExhaustionDialog(true);
      setIsTestStarted(false);
    }
  }, [warningCount, isTestStarted, isSubmitting, hasInitialized]);

  // Debug log for dialog state
  useEffect(() => {
    console.log("Dialog state changed:", showWarningExhaustionDialog);
  }, [showWarningExhaustionDialog]);

  // Start test monitoring when test begins
  useEffect(() => {
    let mounted = true;
    if (isTestStarted) {
      const initializeTest = async () => {
        try {
          await startTest();
          if (mounted) {
            // startWarningSystem() is already called in handleEnterFullscreen
            console.log("Test started, monitoring initialized");
          }
        } catch (error) {
          console.error("Error initializing test:", error);
        }
      };
      initializeTest();
    }
    return () => {
      mounted = false;
    };
  }, [isTestStarted, startTest]); // Removed startWarningSystem from dependencies

  // End test monitoring when test ends
  useEffect(() => {
    let mounted = true;
    if (!isTestStarted) {
      const cleanupTest = async () => {
        try {
          await endTest();
          if (mounted) {
            endWarningSystem();
            console.log("Test ended, warning system deactivated");
          }
        } catch (error) {
          console.error("Error cleaning up test:", error);
        }
      };
      cleanupTest();
    }
    return () => {
      mounted = false;
    };
  }, [isTestStarted, endTest, endWarningSystem]);

  const takeWebcamSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current || !sessionId) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            try {
              // Create form data
              const formData = new FormData();
              formData.append("image", blob, "webcam_snapshot.jpg");
              formData.append("sessionId", sessionId);
              formData.append("snapshot_type", "webcam");

              // Send to API
              const response = await axios.post(
                `${API_BASE_URL}/api/tests/save-snapshot`,
                formData,
                {
                  headers: {
                    "Content-Type": "multipart/form-data",
                  },
                }
              );

              // Check for multiple faces if response includes face_count
              if (
                response &&
                response.data &&
                response.data.face_count !== undefined
              ) {
                const count = response.data.face_count;
                setFaceCount(count);

                if (count > 1) {
                  setSuspiciousActivity("More than one face detected");
                  setShowWebcamAlert(true);
                  // Hide alert after 5 seconds
                  setTimeout(() => setShowWebcamAlert(false), 5000);
                } else if (count === 0) {
                  setSuspiciousActivity("No face detected");
                  setShowWebcamAlert(true);
                  // Hide alert after 5 seconds
                  setTimeout(() => setShowWebcamAlert(false), 5000);
                } else {
                  setSuspiciousActivity(null);
                }
              }
            } catch (error) {
              console.error("Error sending webcam snapshot:", error);
            }
          }
        },
        "image/jpeg",
        0.7
      );
    } catch (error) {
      console.error("Error taking webcam snapshot:", error);
    }
  };

  // Separate useEffect to handle component unmount cleanup
  useEffect(() => {
    // Only set up cleanup for component unmount
    return () => {
      // Only stop screenshot service when component fully unmounts
      if (isScreenshotServiceActive) {
        console.log("TestInterface unmounting, stopping screenshot service");
        try {
          stopScreenshotService();
        } catch (err) {
          console.error("Error stopping screenshot service on unmount:", err);
        }
      }
    };
  }, []); // Empty dependency array means this only runs on mount/unmount

  // Update the fullscreen re-entry button handler
  const handleReenterFullscreen = async () => {
    try {
      const success = await requestFullscreen();
      if (!success) {
        setError("Failed to re-enter fullscreen mode. Please try again.");
      }
    } catch (error) {
      console.error("Error re-entering fullscreen:", error);
      setError("Failed to re-enter fullscreen mode. Please try again.");
    }
  };

  // Audio monitoring
  useEffect(() => {
    if (!isTestStarted) return;
    if (!audioAlert) return;
    setAudioToast(audioAlert.message);
    const timeout = setTimeout(() => setAudioToast(null), 2500);
    return () => clearTimeout(timeout);
  }, [audioAlert, isTestStarted]);

  useEffect(() => {
    if (!isTestStarted) return;
    // Listen for live audio events for meter
    const interval = setInterval(() => {
      if (audioSessionEvents.length > 0) {
        const last = audioSessionEvents[audioSessionEvents.length - 1];
        setAudioMeter({
          volume: Math.min(last.volumeLevel || 0, 3),
          label: last.label || '---',
          confidence: last.confidence || 0,
        });
      }
    }, 300);
    return () => clearInterval(interval);
  }, [isTestStarted, audioSessionEvents]);

  // Debug: Log fullscreen and test state on every render
  useEffect(() => {
    console.log('[DEBUG][TestInterface] isFullScreen:', isFullScreen, 'isTestStarted:', isTestStarted, 'showFullscreenPrompt:', false); // Changed to false as per edit hint
  });

  // Render the appropriate content based on test state
  return (
    <WarningProvider>
    <Box sx={{ position: "relative", minHeight: "100vh" }}>
      {/* Gaze Direction Label */}
      {isTestStarted && (
        <div
          style={{
            position: "fixed",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "8px 24px",
            borderRadius: "8px",
            fontSize: "1.2rem",
            fontWeight: "bold",
            letterSpacing: "1px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          Gaze Direction: {gazeDirection}
        </div>
      )}
      {!isTestStarted ? (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-6">Ready to Begin</h1>
              <p className="mb-4">
                Your test is ready to start. Click the button below when you're
                ready to begin.
              </p>

              <button
                onClick={handleStartTest}
                className="w-full bg-teal-500 text-white py-3 rounded-md hover:bg-teal-700 transition-colors"
              >
                Start Test
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
          {/* Sidebar accent for visual interest */}
          <div className="hidden lg:block w-64 bg-gradient-to-b from-teal-500 to-teal-700 rounded-tr-3xl rounded-br-3xl shadow-lg mr-8"></div>
          <div className="relative w-full h-full">
            <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(circle at 70% 20%, #14b8a622 0%, #fff 80%)' }}></div>
            <div className="relative z-10 flex flex-col items-center justify-center p-6">
              {/* Test Info Header Card */}
              <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-teal-700 mb-2">{testData?.skill || 'Test'}</h2>
                  <div className="flex flex-wrap gap-4 text-gray-700">
                    <span><strong>Duration:</strong> {testData?.duration} min</span>
                    <span><strong>Questions:</strong> {testData?.questions?.length}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-sm text-gray-500">Candidate:</span>
                  <span className="font-semibold text-gray-800">{testData?.userName || user?.name}</span>
                </div>
              </div>
              {/* Fullscreen Re-entry Button - Only shown when not in fullscreen mode */}
              {isTestStarted && !isFullScreen && !showWarningExhaustionDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]">
                  <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
                    <div className="text-red-600 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold mb-4">Fullscreen Required</h2>
                    <p className="mb-6">
                      For test security, you must remain in fullscreen mode. Please
                      click the button below to continue your test.
                    </p>
                    <button
                      onClick={handleReenterFullscreen}
                      className="bg-teal-500 text-white px-6 py-3 rounded-md shadow-md hover:bg-teal-700 transition-colors text-lg font-medium"
                    >
                      Re-enter Fullscreen Mode
                    </button>
                  </div>
                </div>
              )}

              {/* Warning Display */}
              {warningCount > 0 && (
                <div className="fixed top-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg z-50">
                  <div className="flex items-center">
                    <div className="py-1">
                      <svg
                        className="h-6 w-6 text-yellow-500 mr-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold">Warnings</p>
                      <p className="text-sm">Remaining: {warningCount}/{MAX_WARNINGS}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning Exhaustion Dialog */}
              {showWarningExhaustionDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                  <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">
                      Test Termination Notice
                    </h2>
                    <p className="text-gray-700 mb-4">
                      You have exhausted all your warnings. The test will be
                      automatically submitted.
                    </p>
                    <p className="text-gray-600 text-sm mb-6">
                      Your answers will be saved and submitted. You will be
                      redirected to the results page.
                    </p>
                    <div className="flex justify-center">
                      <button
                        onClick={() => {
                          setShowWarningExhaustionDialog(false);
                          handleSubmit("warnings_exhausted");
                        }}
                        className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors"
                      >
                        Submit Test Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Audio Suspicious Toast */}
              {audioToast && (
                <div className="fixed top-20 right-1/2 translate-x-1/2 z-50">
                  <div className="bg-red-100 text-red-700 px-4 py-2 rounded shadow text-sm animate-pulse">
                    {audioToast}
                  </div>
                </div>
              )}

              {/* Header with test info */}
              <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <p className="font-bold">
                    Question {currentQuestion + 1} of {testData?.questions?.length}
                  </p>
                </div>

                <div className="bg-white p-3 rounded-md shadow-sm">
                  <p className="font-bold flex items-center">
                    Time Left: {Math.floor(timeLeft / 60)}:
                    {(timeLeft % 60).toString().padStart(2, "0")}
                  </p>
                </div>
              </div>

              {/* Main content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Questions */}
                <div className="lg:col-span-2">
                  {/* Question and Answer Area */}
                  <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    {testData?.questions && (
                      <>
                        <h2 className="text-xl font-bold mb-6">
                          {testData.questions[currentQuestion].question ||
                            testData.questions[currentQuestion].question_text}
                        </h2>

                        {/* Display code block if question contains code */}
                        {testData.questions[currentQuestion].code && (
                          <CodeBlock code={testData.questions[currentQuestion].code} />
                        )}

                        <div className="space-y-4">
                          {(testData.questions[currentQuestion].options || []).map(
                            (option, index) => {
                              // Handle both object options and string options
                              let optionText =
                                typeof option === "string"
                                  ? option
                                  : option.text || option.option_text || option;
                              const optionId =
                                typeof option === "string" ? index : (option.id || index);

                              // Detect code in option (either as a separate field or as a code block in text)
                              let codeBlock = null;
                              let nonCodeText = optionText;
                              if (typeof option === "object" && option.code) {
                                codeBlock = option.code;
                                nonCodeText = optionText.replace(option.code, "");
                              } else if (typeof optionText === "string" && optionText.includes("```")) {
                                // Extract code block from markdown-style triple backticks
                                const codeMatch = optionText.match(/```([\s\S]*?)```/);
                                if (codeMatch) {
                                  codeBlock = codeMatch[1];
                                  nonCodeText = optionText.replace(/```[\s\S]*?```/, "");
                                }
                              }

                              return (
                                <div
                                  key={optionId || index}
                                  className={`p-4 border rounded-md cursor-pointer transition-colors ${
                                    answers[currentQuestion] === optionId
                                      ? "bg-teal-100 border-teal-500 font-medium"
                                      : "hover:bg-gray-50 border-gray-200"
                                  }`}
                                  onClick={() => handleAnswer(currentQuestion, optionId)}
                                >
                                  <span className="inline-block w-6 h-6 bg-gray-100 rounded-full text-center mr-3 text-gray-700">
                                    {String.fromCharCode(65 + index)}
                                  </span>
                                  {/* Render non-code text if present */}
                                  {nonCodeText && <span>{nonCodeText.trim()} </span>}
                                  {/* Render code block if present */}
                                  {codeBlock && <CodeBlock code={codeBlock} />}
                                </div>
                              );
                            }
                          )}
                        </div>

                        <div className="flex justify-between mt-8">
                          <button
                            disabled={currentQuestion === 0}
                            onClick={() => setCurrentQuestion((prev) => prev - 1)}
                            className={`px-6 py-2 rounded-md transition-colors ${
                              currentQuestion === 0
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-teal-600 text-white hover:bg-teal-700"
                            }`}
                          >
                            Previous
                          </button>

                          {currentQuestion < testData.questions.length - 1 ? (
                            <button
                              onClick={() => setCurrentQuestion((prev) => prev + 1)}
                              className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
                            >
                              Next
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSubmit("manual")}
                              disabled={isSubmitting}
                              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                              {isSubmitting ? "Submitting..." : "Submit Test"}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Question Navigation */}
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <div className="grid grid-cols-10 gap-2">
                      {testData?.questions?.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentQuestion(index)}
                          className={`p-2 rounded-md transition-colors ${
                            currentQuestion === index
                              ? "bg-teal-600 text-white font-bold"
                              : answers[index] !== undefined
                              ? "bg-green-100 border border-green-500 font-medium"
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right column - Monitoring */}
                <div className="lg:col-span-1">
                  {/* Monitoring Area */}
                  <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                    <h3 className="font-bold mb-3 text-lg border-b pb-2">
                      Proctoring Monitor
                    </h3>

                    {/* Live Webcam Feed */}
                    <div className="mt-4 mb-4">
                      <h4 className="text-sm font-semibold mb-2 text-gray-700">
                        Webcam Feed
                      </h4>
                      {sessionId && (
                        <WebcamFeed
                          sessionId={sessionId}
                          userId={user?.id || testData?.user_id}
                          isActive={isTestStarted}
                        />
                      )}
                    </div>

                    {/* Audio Monitoring Meter */}
                    <div className="mt-4 mb-2">
                      <h4 className="text-sm font-semibold mb-2 text-gray-700 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M9 18a1 1 0 102 0v-1.035A7.001 7.001 0 0017 10V8a7 7 0 10-14 0v2a7.001 7.001 0 006 6.965V18z" /></svg>
                        Audio Monitor
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-3 rounded-full transition-all duration-200 ${audioMeter.volume > 2 ? 'bg-red-500' : audioMeter.volume > 1.2 ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${Math.min(audioMeter.volume * 33, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-mono w-10 text-right">{audioMeter.volume.toFixed(2)}x</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1 text-gray-600">
                        <span>Label: <span className={`font-bold ${['Speech','Music','Typing'].includes(audioMeter.label) ? 'text-red-600' : 'text-gray-800'}`}>{audioMeter.label}</span></span>
                        <span>Conf: {audioMeter.confidence.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Monitoring tools in a grid */}
                    <div className="grid grid-cols-1 gap-4 mt-4">
                      {/* Test Progress */}
                      <div className="mt-4 p-3 bg-teal-50 rounded-md border border-teal-100">
                        <h4 className="text-sm font-semibold mb-2 text-gray-700 flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Test Progress
                        </h4>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-teal-600 h-2.5 rounded-full"
                            style={{
                              width: `${
                                (Object.keys(answers).length /
                                  testData?.questions?.length) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-600">
                          <span>
                            Answered: {Object.keys(answers).length}/
                            {testData?.questions?.length}
                          </span>
                          <span>
                            Remaining:{" "}
                            {testData?.questions?.length -
                              Object.keys(answers).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Box>
    </WarningProvider>
);
}
