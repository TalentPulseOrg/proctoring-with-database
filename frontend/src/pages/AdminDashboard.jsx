import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminTestCreation from '../components/AdminTestCreation';
import AdminTestList from '../components/AdminTestList';
import ProctoringReport from '../components/ProctoringReport';
import { TestProvider } from '../contexts/TestContext';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { API_BASE_URL } from '../config';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import LogoutIcon from '@mui/icons-material/Logout';
import CompletedTests from '../components/admin/CompletedTests';
import TestMonitoringViewer from '../components/TestMonitoringViewer';
import { colors, fonts } from '../styles/theme';

export default function AdminDashboard() {
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const { logout, user } = useAuth();

  const handleViewLogs = async (testId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/exam/logs/${testId}`);
      setSelectedTest({
        testId,
        logs: response.data
      });
      setShowLogs(true);
    } catch (error) {
      console.error('Error fetching test logs:', error);
    }
  };

  const handleViewReport = (testId, candidateName) => {
    setSelectedReport({
      testId,
      candidateName
    });
    setShowReport(true);
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
    doc.text(`Score: ${test.score}/${test.total} (${test.percentage}%)`, 20, 70);
    
    // Violations Table
    const violations = test.violations || [];
    const tableData = violations.map(v => [
      format(new Date(v.timestamp), 'HH:mm:ss'),
      v.type,
      JSON.stringify(v.details)
    ]);
    
    doc.autoTable({
      startY: 80,
      head: [['Time', 'Type', 'Details']],
      body: tableData,
    });
    
    // Save the PDF
    doc.save(`test_report_${test.test_id}.pdf`);
  };

  const closeLogs = () => {
    setShowLogs(false);
    setSelectedTest(null);
  };

  const closeReport = () => {
    setShowReport(false);
    setSelectedReport(null);
  };

  const handleViewMonitoring = (test) => {
    setSelectedTest(test);
    setShowMonitoring(true);
  };

  return (
    <TestProvider>
      <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: fonts.main }}>
        {/* Themed Header */}
        <header style={{
          background: colors.sidebarBg,
          color: '#fff',
          boxShadow: '0 2px 8px rgba(20,184,166,0.10)',
        }}>
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold" style={{ color: '#fff', letterSpacing: '0.02em' }}>
              Admin Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Logged in as: <span className="font-medium">{user?.email || 'Admin'}</span>
              </div>
              <button 
                onClick={logout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md"
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(239,68,68,0.10)',
                  transition: 'background 0.2s',
                }}
              >
                <LogoutIcon className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">
            {/* Test Creation Section */}
            <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px rgba(20,184,166,0.07)', padding: '2rem' }}>
              <AdminTestCreation />
            </div>

            {/* Test List Section */}
            <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px rgba(20,184,166,0.07)', padding: '2rem' }}>
              <AdminTestList />
            </div>

            {/* Completed Tests Section */}
            <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px rgba(20,184,166,0.07)', padding: '2rem' }}>
              <CompletedTests />
            </div>

            {showMonitoring && selectedTest && (
              <div style={{ background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px rgba(20,184,166,0.07)', padding: '2rem' }}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-teal-700">
                    Monitoring Data for Test: {selectedTest.testId}
                  </h2>
                  <button
                    onClick={() => setShowMonitoring(false)}
                    className="px-4 py-2 rounded font-semibold"
                    style={{ background: colors.primary, color: '#fff', boxShadow: '0 2px 8px rgba(20,184,166,0.10)' }}
                  >
                    Back to Tests
                  </button>
                </div>
                <TestMonitoringViewer testId={selectedTest.testId} />
              </div>
            )}
          </div>
        </main>

        {/* Logs Dialog */}
        <Dialog open={showLogs} onClose={closeLogs} maxWidth="md" fullWidth>
          <DialogTitle>Test Logs</DialogTitle>
          <DialogContent>
            {selectedTest && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Violations</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedTest.logs.map((log, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.type}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{JSON.stringify(log.details)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeLogs} style={{ background: colors.primary, color: '#fff', fontWeight: 600, borderRadius: 8, boxShadow: '0 2px 8px rgba(20,184,166,0.10)' }}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Report Dialog */}
        <Dialog open={showReport} onClose={closeReport} maxWidth="lg" fullWidth>
          <DialogTitle>Proctoring Report</DialogTitle>
          <DialogContent>
            {selectedReport && (
              <ProctoringReport sessionId={selectedReport.testId} candidateName={selectedReport.candidateName} />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeReport} style={{ background: colors.primary, color: '#fff', fontWeight: 600, borderRadius: 8, boxShadow: '0 2px 8px rgba(20,184,166,0.10)' }}>Close</Button>
          </DialogActions>
        </Dialog>
      </div>
    </TestProvider>
  );
}
