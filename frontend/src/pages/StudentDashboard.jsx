import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle, FaFileDownload, FaSignOutAlt, FaIdCard, FaCalendarAlt, FaCheckCircle, FaClock } from "react-icons/fa";
import { useToast } from "../context/ToastContext";
import { getSchedule } from "../services/studentAuthService";
import { submitAttendance } from "../services/attendanceService";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' or 'schedule'
  const [markingAttendance, setMarkingAttendance] = useState(false);

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

  useEffect(() => {
    if (activeTab === "schedule") {
      fetchSchedule();
    }
  }, [activeTab]);

  const fetchSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const data = await getSchedule();
      if (data.success) {
        setSchedule(data.schedule);
      }
    } catch (error) {
      toast.error("Failed to load schedule");
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("student_token");
    localStorage.removeItem("student_profile");
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleDownloadReceipt = () => {
    if (!student) return;
    const url = `/api/student/${student.id}/receipt`;
    window.open(url, '_blank');
  };

  const handleMarkAttendance = async (session) => {
    if (!student) return;
    setMarkingAttendance(true);
    try {
      const res = await submitAttendance(student.prn);
      if (res.success) {
        toast.success(res.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setMarkingAttendance(false);
    }
  };

  if (!student) return null;

  // Group schedule by date
  const groupedSchedule = schedule.reduce((acc, session) => {
    const date = new Date(session.start_time).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  const isSessionActive = (session) => {
    const now = new Date();
    const start = new Date(session.start_time);
    const end = new Date(start.getTime() + (session.duration_minutes + 5) * 60000); // 5 mins grace
    return now >= start && now <= end;
  };

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
            </div>
          </div>
          {/* Decorative background shape */}
          <FaIdCard className="absolute -bottom-6 -right-6 text-9xl text-white opacity-10 rotate-12" />
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "profile"
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            My Profile
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "schedule"
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <FaCalendarAlt /> Schedule & Events
          </button>
        </div>

        {/* Tab Content: Profile */}
        {activeTab === "profile" && (
          <div className="card p-6 animate-fade-in">
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
        )}

        {/* Tab Content: Schedule */}
        {activeTab === "schedule" && (
          <div className="space-y-8 animate-fade-in">
            {loadingSchedule ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : schedule.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
                <FaCalendarAlt className="mx-auto text-4xl text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No sessions scheduled yet.</p>
              </div>
            ) : (
              Object.entries(groupedSchedule).map(([date, sessions]) => (
                <div key={date} className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <FaCalendarAlt className="text-primary-600" /> {date}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sessions.map((session) => {
                      const active = isSessionActive(session);
                      const start = new Date(session.start_time);
                      const end = new Date(start.getTime() + session.duration_minutes * 60000);
                      
                      const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                      return (
                        <div key={session.id} className={`bg-white border rounded-xl p-5 shadow-sm transition-all relative overflow-hidden ${active ? 'border-primary-500 shadow-md ring-1 ring-primary-500' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
                          {active && (
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
                          )}
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-slate-800 text-lg leading-tight pr-4">{session.title}</h4>
                            {active && (
                              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2 font-medium">
                            <FaClock className="text-slate-400" />
                            {timeStr}
                          </div>

                          {(session.resource_speaker !== "-" || session.location !== "-") && (
                            <div className="text-sm text-slate-600 mb-4 space-y-1">
                              {session.resource_speaker !== "-" && (
                                <div className="flex items-center gap-2">
                                  <span title="Resource Speaker">👤</span> {session.resource_speaker}
                                </div>
                              )}
                              {session.location !== "-" && (
                                <div className="flex items-center gap-2">
                                  <span title="Location">📍</span> {session.location}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {active && (
                            <button
                              onClick={() => handleMarkAttendance(session)}
                              disabled={markingAttendance}
                              className="w-full btn-primary !py-2.5 justify-center"
                            >
                              {markingAttendance ? "Recording..." : <><FaCheckCircle className="mr-2" /> Mark Attendance</>}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
