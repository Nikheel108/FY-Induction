import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle, FaFileDownload, FaClipboardCheck, FaSignOutAlt, FaIdCard } from "react-icons/fa";
import { useToast } from "../context/ToastContext";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem("student_token");
    const profile = localStorage.getItem("student_profile");
    
    if (!token || !profile) {
      navigate("/student-login");
      return;
    }
    
    try {
      const parsed = JSON.parse(profile);
      if (!parsed.is_registered) {
        navigate("/student/register");
        return;
      }
      setStudent(parsed);
    } catch (e) {
      navigate("/student-login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("student_token");
    localStorage.removeItem("student_profile");
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleDownloadReceipt = () => {
    if (!student) return;
    const url = `/api/student/${student.id}/receipt`;
    // We can just open this URL because it doesn't strictly need a token for download currently, 
    // or if it does, we need to fetch it via blob. Since it's public in backend right now:
    window.open(url, '_blank');
  };

  if (!student) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-slate-200 px-4 py-3 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary-700 font-bold text-lg">
          <FaUserCircle className="text-2xl" />
          Student Portal
        </div>
        <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 flex items-center gap-1 text-sm font-medium transition-colors">
          <FaSignOutAlt /> <span className="hidden sm:inline">Logout</span>
        </button>
      </nav>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-up">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Welcome, {student.full_name ? student.full_name.split(' ')[0] : student.prn}!</h1>
            <p className="text-primary-100 mb-6 text-sm sm:text-base max-w-lg">
              Manage your induction journey, mark your attendance, and access important resources from your portal.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleDownloadReceipt} className="bg-white text-primary-700 hover:bg-slate-50 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all shadow-sm">
                <FaFileDownload /> Download Receipt
              </button>
              <Link to="/attendance" className="bg-primary-500/30 hover:bg-primary-500/50 border border-primary-400/50 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all backdrop-blur-sm">
                <FaClipboardCheck /> Mark Attendance
              </Link>
            </div>
          </div>
          {/* Decorative background shape */}
          <FaIdCard className="absolute -bottom-6 -right-6 text-9xl text-white opacity-10 rotate-12" />
        </div>

        {/* Profile Details */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Your Profile Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Registration ID</p>
                <p className="font-mono font-medium text-slate-800 bg-slate-100 px-3 py-1.5 rounded-md inline-block">
                  {student.registration_id}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">PRN</p>
                <p className="font-medium text-slate-800">{student.prn}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Full Name</p>
                <p className="font-medium text-slate-800">{student.full_name}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                <p className="font-medium text-slate-800">{student.department}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email Address</p>
                <p className="font-medium text-slate-800">{student.student_email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Mobile Number</p>
                <p className="font-medium text-slate-800">{student.student_phone}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
