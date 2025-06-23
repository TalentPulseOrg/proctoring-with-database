import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssessmentIcon from "@mui/icons-material/Assessment";
import DownloadIcon from "@mui/icons-material/Download";
import MonitorIcon from "@mui/icons-material/Monitor";
import ProctoringReport from "../ProctoringReport";
import TestMonitoringViewer from "../TestMonitoringViewer";

const API_BASE_URL = "http://localhost:8000";

const CompletedTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);

  useEffect(() => {
    fetchCompletedTests();
  }, []);

  const fetchCompletedTests = async () => {
    try {
      setLoading(true);
      setError(null);
      let allTests = [];

      // Fetch from database via the completed endpoint
      try {
        const response = await fetch(`${API_BASE_URL}/api/sessions/completed`);
        if (response.ok) {
          const completedSessions = await response.json();

          if (Array.isArray(completedSessions)) {
            // Convert database sessions to display format
            completedSessions.forEach((session) => {
              const convertedTest = {
                test_id: session.id,
                candidate_name: session.user_name || "Anonymous",
                date: new Date(
                  session.end_time || session.start_time || Date.now()
                ).toLocaleDateString(),
                time: new Date(
                  session.end_time || session.start_time || Date.now()
                ).toLocaleTimeString(),
                score: session.score || 0,
                total: session.total_questions || 0,
                percentage: session.percentage || 0,
                violations: session.violations || [],
                status: session.status || "completed",
                skill: session.skill || "Unknown",
                source: "database",
                session_id: session.id,
                user_id: session.user_id,
                test_table_id: session.test_id,
                start_time: session.start_time,
                end_time: session.end_time,
              };
              allTests.push(convertedTest);
            });
          }
        }
      } catch (completedError) {
        // Silently handle error - no need to show in console
      }

      // Also fetch from debug endpoint for comprehensive view
      try {
        const debugResponse = await fetch(
          `${API_BASE_URL}/api/sessions/debug/all`
        );
        if (debugResponse.ok) {
          const allSessions = await debugResponse.json();

          if (Array.isArray(allSessions)) {
            // Add any sessions not already included
            allSessions.forEach((session) => {
              const existsInList = allTests.some(
                (test) => test.session_id === session.id
              );

              if (!existsInList) {
                const convertedTest = {
                  test_id: session.id,
                  candidate_name: session.user_name || "Anonymous",
                  date: new Date(
                    session.end_time || session.start_time || Date.now()
                  ).toLocaleDateString(),
                  time: new Date(
                    session.end_time || session.start_time || Date.now()
                  ).toLocaleTimeString(),
                  score: session.score || 0,
                  total: session.total_questions || 0,
                  percentage: session.percentage || 0,
                  violations: session.violations || [],
                  status: session.status || "in_progress",
                  skill: session.skill || "Unknown",
                  source: "database",
                  session_id: session.id,
                  user_id: session.user_id,
                  test_table_id: session.test_id,
                  start_time: session.start_time,
                  end_time: session.end_time,
                };
                allTests.push(convertedTest);
              }
            });
          }
        }
      } catch (debugError) {
        // Silently handle error - no need to show in console
      }

      setTests(allTests);
    } catch (err) {
      setError("Failed to fetch completed tests");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId) => {
    try {
      // Call the backend API to delete the session
      const response = await fetch(`${API_BASE_URL}/api/sessions/${testId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from frontend state
        const updatedTests = tests.filter((test) => test.test_id !== testId);
        setTests(updatedTests);
      } else {
        setError("Failed to delete test from server");
      }
    } catch (err) {
      setError("Failed to delete test");
    }
  };

  const handleDeleteAllTests = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAll = async () => {
    try {
      // Call the backend API to delete all sessions
      const response = await fetch(`${API_BASE_URL}/api/sessions/`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Clear frontend state
        setTests([]);
        setShowDeleteConfirm(false);
      } else {
        setError("Failed to delete all tests from server");
      }
    } catch (err) {
      setError("Failed to delete all tests");
    }
  };

  const handleViewLogs = (test) => {
    setSelectedTest(test);
    setShowLogs(true);
  };

  const handleViewReport = (test) => {
    setSelectedTest(test);
    setShowReport(true);
  };

  const handleViewMonitoring = (test) => {
    setSelectedTest(test);
    setShowMonitoring(true);
  };

  const handleDownloadReport = (test) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text(`Test Report - ${test.candidate_name}`, 20, 20);

    // Test Information
    doc.setFontSize(12);
    doc.text(`Test ID: ${test.test_id}`, 20, 40);
    doc.text(`Date: ${test.date}`, 20, 50);
    doc.text(`Time: ${test.time}`, 20, 60);
    doc.text(
      `Score: ${test.score}/${test.total} (${test.percentage}%)`,
      20,
      70
    );

    // Violations Table
    const violations = test.violations || [];
    const tableData = violations.map((v) => [
      format(new Date(v.timestamp), "HH:mm:ss"),
      v.type,
      JSON.stringify(v.details),
    ]);

    doc.autoTable({
      startY: 80,
      head: [["Time", "Type", "Details"]],
      body: tableData,
    });

    // Save the PDF
    doc.save(`test_report_${test.test_id}.pdf`);
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "terminated":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Completed Tests
            </h2>
            <p className="text-gray-600">
              Manage and review completed test sessions from database
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchCompletedTests}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
            {tests.length > 0 && (
              <button
                onClick={handleDeleteAllTests}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}

        {tests.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No completed tests
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No completed test sessions found in the database.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Test Info
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Candidate
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Score
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date/Time
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tests.map((test, index) => (
                  <tr
                    key={`${test.test_id}-${index}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          ID: {test.session_id || test.test_id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {test.skill}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {test.candidate_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        User ID: {test.user_id || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span
                          className={`font-medium ${getScoreColor(
                            test.percentage
                          )}`}
                        >
                          {test.score}/{test.total}
                        </span>
                        <div
                          className={`text-xs ${getScoreColor(
                            test.percentage
                          )}`}
                        >
                          {test.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          test.status
                        )}`}
                      >
                        {test.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{test.date}</div>
                      <div className="text-xs text-gray-500">{test.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewLogs(test)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Logs"
                        >
                          <VisibilityIcon />
                        </button>
                        <button
                          onClick={() => handleViewReport(test)}
                          className="text-green-600 hover:text-green-900"
                          title="View Report"
                        >
                          <AssessmentIcon />
                        </button>
                        <button
                          onClick={() => handleViewMonitoring(test)}
                          className="text-purple-600 hover:text-purple-900"
                          title="View Monitoring"
                        >
                          <MonitorIcon />
                        </button>
                        <button
                          onClick={() => handleDownloadReport(test)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Download Report"
                        >
                          <DownloadIcon />
                        </button>
                        <button
                          onClick={() => handleDeleteTest(test.test_id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Test"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
        >
          <DialogTitle>Confirm Delete All</DialogTitle>
          <DialogContent>
            <p>
              Are you sure you want to delete all test results? This action
              cannot be undone.
            </p>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button onClick={confirmDeleteAll} color="error">
              Delete All
            </Button>
          </DialogActions>
        </Dialog>

        {/* Logs Modal */}
        {showLogs && selectedTest && (
          <Dialog
            open={showLogs}
            onClose={() => setShowLogs(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>Test Logs - {selectedTest.candidate_name}</DialogTitle>
            <DialogContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700">
                    Test Information
                  </h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p>
                      <strong>Session ID:</strong> {selectedTest.session_id}
                    </p>
                    <p>
                      <strong>Test ID:</strong> {selectedTest.test_table_id}
                    </p>
                    <p>
                      <strong>User ID:</strong> {selectedTest.user_id}
                    </p>
                    <p>
                      <strong>Start Time:</strong>{" "}
                      {selectedTest.start_time
                        ? new Date(selectedTest.start_time).toLocaleString()
                        : "N/A"}
                    </p>
                    <p>
                      <strong>End Time:</strong>{" "}
                      {selectedTest.end_time
                        ? new Date(selectedTest.end_time).toLocaleString()
                        : "N/A"}
                    </p>
                    <p>
                      <strong>Source:</strong> {selectedTest.source}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700">
                    Violations ({selectedTest.violations?.length || 0})
                  </h4>
                  <div className="bg-gray-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
                    {selectedTest.violations &&
                    selectedTest.violations.length > 0 ? (
                      selectedTest.violations.map((violation, index) => (
                        <div
                          key={index}
                          className="mb-2 p-2 bg-white rounded border"
                        >
                          <p>
                            <strong>Type:</strong> {violation.type || "Unknown"}
                          </p>
                          <p>
                            <strong>Time:</strong>{" "}
                            {violation.timestamp || "N/A"}
                          </p>
                          <p>
                            <strong>Details:</strong>{" "}
                            {violation.details || "No details"}
                          </p>
                          {violation.filepath && (
                            <p>
                              <strong>Image:</strong>{" "}
                              <a
                                href={violation.filepath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View Image
                              </a>
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No violations recorded</p>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowLogs(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Report Modal */}
        {showReport && selectedTest && (
          <Dialog
            open={showReport}
            onClose={() => setShowReport(false)}
            maxWidth="lg"
            fullWidth
          >
            <DialogTitle>
              Test Report - {selectedTest.candidate_name}
            </DialogTitle>
            <DialogContent>
              <ProctoringReport test={selectedTest} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowReport(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Monitoring Modal */}
        {showMonitoring && selectedTest && (
          <Dialog
            open={showMonitoring}
            onClose={() => setShowMonitoring(false)}
            maxWidth="xl"
            fullWidth
          >
            <DialogTitle>
              Test Monitoring - {selectedTest.candidate_name}
            </DialogTitle>
            <DialogContent>
              <TestMonitoringViewer testId={selectedTest.session_id || selectedTest.test_id} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowMonitoring(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default CompletedTests;
