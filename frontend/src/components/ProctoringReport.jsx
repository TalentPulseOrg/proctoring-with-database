import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import AppLayout from '../layouts/AppLayout';

const ProctoringReport = ({ sessionId, candidateName }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/proctoring/events/${sessionId}/report`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to fetch report');
      }
      const data = await response.json();
      if (data.status === 'success' && data.report) {
        setReport(data.report);
      } else {
        throw new Error('Invalid report data received');
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text(`Proctoring Summary Report - ${candidateName}`, 20, 20);
    
    // Date and Duration
    doc.setFontSize(12);
    doc.text(`Test Date: ${format(new Date(report.start_time), 'PPP')}`, 20, 40);
    doc.text(`Duration: ${report.session_duration_minutes.toFixed(1)} minutes`, 20, 50);
    
    // Environment Rating
    doc.setFontSize(14);
    doc.text(`Overall Environment Rating: ${report.environment_rating}`, 20, 70);
    
    // Metrics Table
    const metrics = report.metrics;
    const tableData = [
      ['Metric', 'Count'],
      ['Tab Switches', metrics.tab_switches],
      ['Multiple Faces Detected', metrics.multiple_faces],
      ['Poor Lighting Events', metrics.poor_lighting],
      ['Total Violations', metrics.total_violations],
    ];
    
    doc.autoTable({
      startY: 80,
      head: [tableData[0]],
      body: tableData.slice(1),
    });
    
    // Timeline
    const timelineY = doc.lastAutoTable.finalY + 20;
    doc.text('Event Timeline:', 20, timelineY);
    
    const timelineData = report.timeline.map(event => [
      format(new Date(event.timestamp), 'HH:mm:ss'),
      event.event_type,
      JSON.stringify(event.details),
    ]);
    
    doc.autoTable({
      startY: timelineY + 10,
      head: [['Time', 'Event Type', 'Details']],
      body: timelineData,
    });
    
    // Save the PDF
    doc.save(`proctoring_report_${sessionId}.pdf`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!report) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No report data available
      </Alert>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ p: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Proctoring Summary Report
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Session Information
                </Typography>
                <Typography>
                  Candidate: {candidateName}
                </Typography>
                <Typography>
                  Date: {format(new Date(report.start_time), 'PPP')}
                </Typography>
                <Typography>
                  Duration: {report.session_duration_minutes.toFixed(1)} minutes
                </Typography>
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Overall Environment Rating: {report.environment_rating}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Key Metrics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography>Tab Switches: {report.metrics.tab_switches}</Typography>
                    <Typography>Multiple Faces: {report.metrics.multiple_faces}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography>Poor Lighting: {report.metrics.poor_lighting}</Typography>
                    <Typography>Total Violations: {report.metrics.total_violations}</Typography>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Event Timeline
                </Typography>
                <Timeline>
                  {report.timeline.map((event, index) => (
                    <TimelineItem key={index}>
                      <TimelineSeparator>
                        <TimelineDot color="primary" />
                        {index < report.timeline.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography variant="subtitle2">
                          {format(new Date(event.timestamp), 'HH:mm:ss')}
                        </Typography>
                        <Typography>{event.event_type}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {JSON.stringify(event.details)}
                        </Typography>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={downloadPDF}
              >
                Download PDF Report
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </AppLayout>
  );
};

export default ProctoringReport; 