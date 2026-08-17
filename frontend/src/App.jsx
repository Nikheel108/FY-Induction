import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Success from "./pages/Success";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDetails from "./pages/StudentDetails";
import NotFound from "./pages/NotFound";
import Attendance from "./pages/Attendance";           // new
import AdminAttendance from "./pages/AdminAttendance"; // new
import AdminBroadcast from "./pages/AdminBroadcast";
import AdminEventSessions from "./pages/AdminEventSessions";
import Highlights from "./pages/Highlights";
import AdminHighlights from "./pages/AdminHighlights";
import StudentLogin from "./pages/StudentLogin";
import StudentChangePassword from "./pages/StudentChangePassword";
import StudentDashboard from "./pages/StudentDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/success" element={<Success />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/attendance" element={<Attendance />} />  {/* public attendance kiosk */}
      <Route path="/student-login" element={<StudentLogin />} />
      <Route path="/student/change-password" element={<StudentChangePassword />} />
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
        path="/highlights"
        element={
          <ProtectedRoute>
            <Highlights />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}