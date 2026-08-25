import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Success from "./pages/Success";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUploadStudents from "./pages/AdminUploadStudents";
import StudentDetails from "./pages/StudentDetails";
import NotFound from "./pages/NotFound";
import Attendance from "./pages/Attendance";           // new
import AdminAttendance from "./pages/AdminAttendance"; // new
import AdminBroadcast from "./pages/AdminBroadcast";
import AdminEventSessions from "./pages/AdminEventSessions";
import AdminHighlights from "./pages/AdminHighlights";
import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";
import Contact from "./pages/Contact";
import AdminContactQueries from "./pages/AdminContactQueries";

function IframeSync() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only apply this logic if embedded in an iframe
    if (window.self !== window.top) {
      const isInitialLoad = !window.sessionStorage.getItem('app_initialized');
      const savedPath = window.sessionStorage.getItem('last_path');

      if (isInitialLoad) {
        window.sessionStorage.setItem('app_initialized', 'true');
        if (savedPath && savedPath !== '/' && location.pathname === '/') {
          navigate(savedPath, { replace: true });
        }
      }
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (window.self !== window.top) {
      window.sessionStorage.setItem('last_path', location.pathname + location.search);
    }
  }, [location]);

  return null;
}

export default function App() {
  return (
    <>
      <IframeSync />
      <Routes>
        <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/success" element={<Success />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/attendance" element={<Attendance />} />  {/* public attendance kiosk */}
      <Route path="/contact" element={<Contact />} />        {/* public contact us page */}
      <Route path="/student-login" element={<StudentLogin />} />
      <Route path="/student/register" element={<Register />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/upload-students"
        element={
          <ProtectedRoute>
            <AdminUploadStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/student/:id"
        element={
          <ProtectedRoute>
            <StudentDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute>
            <AdminAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/broadcast"
        element={
          <ProtectedRoute>
            <AdminBroadcast />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/sessions"
        element={
          <ProtectedRoute>
            <AdminEventSessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/highlights"
        element={
          <ProtectedRoute>
            <AdminHighlights />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/contact-queries"
        element={
          <ProtectedRoute>
            <AdminContactQueries />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}