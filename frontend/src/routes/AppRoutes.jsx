import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Landing from "../pages/Landing";
import AdminDashboard from "../pages/AdminDashboard";
import CandidateDashboard from "../pages/CandidateDashboard";
import TestForm from "../components/TestForm";
import PrerequisitesCheck from "../components/PrerequisitesCheck";
import FaceVerification from "../components/FaceVerification";
import ExamForm from "../components/ExamForm";
import TestInterface from "../components/TestInterface";
import TestResults from "../components/TestResults";
import SelectRole from "../pages/SelectRole";
import TestSession from "../pages/TestSession";
import TestInstructions from "../components/TestInstructions";
import TestApiPage from "../pages/TestApiPage";

// Protected route component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If requiredRole is specified, check if user has that role
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/select-role" element={<SelectRole />} />
      
      {/* Test registration and access routes - publicly accessible */}
      <Route path="/test-registration" element={<TestForm />} />
      <Route path="/prerequisites" element={<PrerequisitesCheck />} />
      <Route path="/test-session/:testId" element={<TestSession />} />
      <Route path="/test-instructions/:testId" element={<TestInstructions />} />
      <Route path="/test-interface" element={<TestInterface />} />
      <Route path="/test-interface/:sessionId" element={<TestInterface />} />
      <Route path="/test-results" element={<TestResults />} />
      
      {/* API Test page - for development/testing */}
      <Route path="/api-test" element={<TestApiPage />} />
      
      {/* Admin routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/:sessionId" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />

      {/* Candidate routes */}
      <Route 
        path="/candidate" 
        element={
          <ProtectedRoute requiredRole="candidate">
            <CandidateDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/candidate/test-form" 
        element={
          <ProtectedRoute requiredRole="candidate">
            <TestForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/face-verification" 
        element={
          <ProtectedRoute requiredRole="candidate">
            <FaceVerification />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}
