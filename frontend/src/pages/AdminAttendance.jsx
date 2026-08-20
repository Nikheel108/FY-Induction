import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUsers, FaCheckCircle, FaTimesCircle, FaStar, FaFilter, FaSearch, 
  FaDownload, FaFileExcel, FaPlus, FaTrash, FaEdit, FaCheck, FaImage, 
  FaBuilding, FaCalendarAlt, FaUserTie, FaMapMarkerAlt, FaHome, FaTimes, FaSync, FaMagic, FaClock
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import { 
  fetchAttendance, fetchSessionStats, adminMarkAttendance, 
  adminDemarkAttendance, exportAttendance 
} from '../services/attendanceService';
import { fetchEventSessions, updateEventSession } from '../services/adminService';
import { createHighlight, updateHighlight, deleteHighlight, generateHighlightDescription } from '../services/highlightService';
import { useToast } from '../context/ToastContext';
import { DEPARTMENTS } from '../constants';

export default function AdminAttendance() {
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Session & Stats state ---
  const [sessionsList, setSessionsList] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // --- Search & Tabs ---
  const [activeTab, setActiveTab] = useState('present'); // 'present' | 'absent' | 'highlights' | 'all_records'
  const [presentSearch, setPresentSearch] = useState('');
  const [absentSearch, setAbsentSearch] = useState('');

  // --- All Records Tab state ---
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordPages, setRecordPages] = useState(1);
  const [recordPage, setRecordPage] = useState(1);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordFilters, setRecordFilters] = useState({ date: '', prn: '', student_name: '', event_session_id: '' });

  // --- Manual marking state ---
  const [markingPrn, setMarkingPrn] = useState('');
  const [markingSessionId, setMarkingSessionId] = useState('');
  const [isMarking, setIsMarking] = useState(false);

  // --- Attendance Time Limit Modal State ---
  const [timeLimitModalOpen, setTimeLimitModalOpen] = useState(false);
  const [editLimitMinutes, setEditLimitMinutes] = useState(15);
  const [updatingLimit, setUpdatingLimit] = useState(false);

  const handleOpenEditTimeLimit = () => {
    if (!sessionData?.session) return;
    const currentLimit = sessionData.session.attendance_limit_minutes ?? sessionData.session.duration_minutes ?? 15;
    setEditLimitMinutes(currentLimit);
    setTimeLimitModalOpen(true);
  };

  const handleSaveTimeLimit = async () => {
    if (!sessionData?.session) return;
    const finalMinutes = parseInt(editLimitMinutes, 10);
    if (isNaN(finalMinutes) || finalMinutes < 1) {
      toast.error("Please enter a valid attendance time limit.");
      return;
    }

    try {
      setUpdatingLimit(true);
      await updateEventSession(sessionData.session.id, { attendance_limit_minutes: finalMinutes });
      toast.success(`Attendance active limit updated to ${finalMinutes} mins!`);
      setTimeLimitModalOpen(false);
      loadSessionStats();
      const res = await fetchEventSessions();
      setSessionsList(res.sessions || []);
    } catch (err) {
      toast.error(err.message || "Failed to update attendance time limit.");
    } finally {
      setUpdatingLimit(false);
    }
  };

  // --- Highlight Modal / Form state ---
  const [highlightModalOpen, setHighlightModalOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState(null);
  const [highlightSubmitting, setHighlightSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [highlightForm, setHighlightForm] = useState({
    title: '',
    description: '',
    resource_speaker: '',
    image_base64: '',
  });
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleGenerateAIDescription = async () => {
    if (!highlightForm.title) {
      toast.error("Please enter a Title first to generate AI description.");
      return;
    }
    setGeneratingAI(true);
    try {
      toast.info("Generating description via Gemini AI...");
      const res = await generateHighlightDescription({
        title: highlightForm.title,
        resource_speaker: highlightForm.resource_speaker,
        notes: highlightForm.description,
      });
      if (res.success && res.description) {
        setHighlightForm((prev) => ({ ...prev, description: res.description }));
        toast.success("AI description generated!");
      }
    } catch (err) {
      toast.error(err.message || "Failed to generate description.");
    } finally {
      setGeneratingAI(false);
    }
  };

  // Load Sessions List
  const loadSessions = async () => {
    try {
      const res = await fetchEventSessions();
      if (res.success) {
        setSessionsList(res.sessions || []);
        if (res.sessions && res.sessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(res.sessions[0].id.toString());
        }
      }
    } catch (err) {
      toast.error('Failed to load sessions.');
    }
  };

  // Load Session Stats & Lists
  const loadSessionStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetchSessionStats({
        event_session_id: selectedSessionId || undefined,
        department: selectedDepartment || undefined,
      });
      if (res.success) {
        setSessionData(res);
        if (res.session && !selectedSessionId) {
          setSelectedSessionId(res.session.id.toString());
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load session analytics.');
    } finally {
      setStatsLoading(false);
    }
  };

  // Load All Attendance Log Records
  const loadAllRecords = async () => {
    setRecordsLoading(true);
    try {
      const params = { ...recordFilters, page: recordPage, per_page: 20 };
      const res = await fetchAttendance(params);
      setRecords(res.data.items);
      setTotalRecords(res.data.total);
      setRecordPages(res.data.pages);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    loadSessionStats();
    // eslint-disable-next-line
  }, [selectedSessionId, selectedDepartment]);

  useEffect(() => {
    if (activeTab === 'all_records') {
      loadAllRecords();
    }
    // eslint-disable-next-line
  }, [activeTab, recordPage, recordFilters]);

  // Filtered Present Students
  const filteredPresentStudents = useMemo(() => {
    if (!sessionData?.present_students) return [];
    if (!presentSearch.trim()) return sessionData.present_students;
    const q = presentSearch.toLowerCase();
    return sessionData.present_students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.prn?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
    );
  }, [sessionData, presentSearch]);

  // Filtered Absent Students
  const filteredAbsentStudents = useMemo(() => {
    if (!sessionData?.absent_students) return [];
    if (!absentSearch.trim()) return sessionData.absent_students;
    const q = absentSearch.toLowerCase();
    return sessionData.absent_students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.prn?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q) ||
        s.student_email?.toLowerCase().includes(q)
    );
  }, [sessionData, absentSearch]);

  // Handlers for manual marking & demarking
  const handleMarkPresent = async (prnToMark, sessionIdToUse) => {
    const sId = sessionIdToUse || selectedSessionId || sessionData?.session?.id;
    if (!prnToMark || !sId) {
      toast.error('Please select a session and PRN.');
      return;
    }
    setIsMarking(true);
    try {
      await adminMarkAttendance(prnToMark, sId);
      toast.success(`Marked PRN ${prnToMark} as Present!`);
      if (sId === markingSessionId) setMarkingPrn('');
      loadSessionStats();
      if (activeTab === 'all_records') loadAllRecords();
    } catch (err) {
      toast.error(err.message || 'Failed to mark attendance.');
    } finally {
      setIsMarking(false);
    }
  };

  const handleDemark = async (attendanceId) => {
    if (!window.confirm('Are you sure you want to demark this attendance record?')) return;
    try {
      await adminDemarkAttendance(attendanceId);
      toast.success('Attendance demarked successfully.');
      loadSessionStats();
      if (activeTab === 'all_records') loadAllRecords();
    } catch (err) {
      toast.error(err.message || 'Failed to demark attendance.');
    }
  };

  // Export handlers
  const handleExport = async (format) => {
    try {
      toast.info('Generating export file...');
      const filters = {
        event_session_id: selectedSessionId || recordFilters.event_session_id,
        date: recordFilters.date,
        prn: recordFilters.prn,
        student_name: recordFilters.student_name,
      };
      const blob = await exportAttendance(format, filters);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `attendance_session_${selectedSessionId || 'export'}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('Export successful');
    } catch (err) {
      toast.error(err.message || 'Export failed');
    }
  };

  // Highlight Form & Modal Handlers
  const handleOpenHighlightModal = (highlightToEdit = null) => {
    if (highlightToEdit) {
      setEditingHighlight(highlightToEdit);
      setHighlightForm({
        title: highlightToEdit.title || '',
        description: highlightToEdit.description || '',
        resource_speaker: highlightToEdit.resource_speaker !== '-' ? highlightToEdit.resource_speaker : '',
        image_base64: highlightToEdit.image_base64 || '',
      });
      setImagePreview(highlightToEdit.image_base64 || null);
    } else {
      setEditingHighlight(null);
      const currentSessionTitle = sessionData?.session?.title || '';
      const currentSessionSpeaker = sessionData?.session?.resource_speaker !== '-' ? sessionData?.session?.resource_speaker : '';
      setHighlightForm({
        title: currentSessionTitle ? `${currentSessionTitle} Highlights` : '',
        description: '',
        resource_speaker: currentSessionSpeaker || '',
        image_base64: '',
      });
      setImagePreview(null);
    }
    setHighlightModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target.result;
      setHighlightForm((prev) => ({ ...prev, image_base64: base64 }));
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveHighlight = async (e) => {
    e.preventDefault();
    if (!highlightForm.title || !highlightForm.description || !highlightForm.image_base64) {
      toast.error('Title, description, and image are required.');
      return;
    }
    setHighlightSubmitting(true);
    try {
      const payload = {
        title: highlightForm.title.trim(),
        description: highlightForm.description.trim(),
        image_base64: highlightForm.image_base64,
        resource_speaker: highlightForm.resource_speaker.trim() || '-',
        event_session_id: selectedSessionId ? parseInt(selectedSessionId, 10) : null,
      };

      if (editingHighlight) {
        await updateHighlight(editingHighlight.id, payload);
        toast.success('Session highlight updated!');
      } else {
        await createHighlight(payload);
        toast.success('Session highlight added!');
      }
      setHighlightModalOpen(false);
      loadSessionStats();
    } catch (err) {
      toast.error(err.message || 'Failed to save highlight.');
    } finally {
      setHighlightSubmitting(false);
    }
  };

  const handleDeleteHighlight = async (id) => {
    if (!window.confirm('Are you sure you want to delete this highlight?')) return;
    try {
      await deleteHighlight(id);
      toast.success('Highlight deleted.');
      loadSessionStats();
    } catch (err) {
      toast.error(err.message || 'Failed to delete highlight.');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-lg font-extrabold text-slate-900">Attendance & Session Tracking</h1>
          </div>
          <Link to="/" className="btn-secondary !px-4 !py-2">
            <FaHome /> <span className="hidden sm:inline">Portal</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 animate-fade-up">
          {/* Controls Bar: Session Selector & Department Filter */}
          <div className="card p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Session Selector */}
              <div className="flex-1 min-w-[240px]">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <FaCalendarAlt className="text-emerald-400" /> Select Session
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {sessionsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({new Date(s.start_time).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div className="min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <FaFilter className="text-emerald-400" /> Filter Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadSessionStats}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
                title="Refresh Data"
              >
                <FaSync />
              </button>

              <button
                type="button"
                onClick={() => handleOpenHighlightModal()}
                className="btn-primary !py-2 !px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 text-sm font-bold shadow-sm"
              >
                <FaStar /> <span className="hidden sm:inline">Add Session Highlight</span>
              </button>

              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                <button
                  onClick={() => handleExport('excel')}
                  className="p-2 text-emerald-400 hover:bg-slate-700 rounded transition"
                  title="Export Session Excel"
                >
                  <FaFileExcel />
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="p-2 text-slate-300 hover:bg-slate-700 rounded transition"
                  title="Export Session CSV"
                >
                  <FaDownload />
                </button>
              </div>
            </div>
          </div>

          {/* Session Info Badge */}
          {sessionData?.session && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>{sessionData.session.title}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                    {sessionData.stats.attendance_percentage}% Attendance Rate
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                  {sessionData.session.resource_speaker !== '-' && (
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <FaUserTie className="text-primary-500" /> Speaker: {sessionData.session.resource_speaker}
                    </span>
                  )}
                  {sessionData.session.location !== '-' && (
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <FaMapMarkerAlt className="text-primary-500" /> Location: {sessionData.session.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md font-semibold text-slate-700">
                    <FaClock className="text-primary-600" />
                    <span>Attendance Active Limit: <strong className="text-slate-900">{sessionData.session.attendance_limit_minutes ?? sessionData.session.duration_minutes ?? 15} Mins</strong></span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenEditTimeLimit}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition"
                  title="Change how many minutes attendance is active for students"
                >
                  <FaClock /> <span>Edit Time Limit</span>
                </button>

                {sessionData.highlights && sessionData.highlights.length > 0 && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-amber-800 text-xs font-semibold">
                    <FaStar className="text-amber-500" />
                    <span>{sessionData.highlights.length} Highlight(s)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Overview Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Students */}
            <div className="card p-5 border-l-4 border-l-primary-500 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Dept Students</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {statsLoading ? '...' : sessionData?.stats?.total_students ?? 0}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Department / System Count</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary-50 text-primary-600 grid place-items-center text-xl">
                <FaUsers />
              </div>
            </div>

            {/* Present Count */}
            <div className="card p-5 border-l-4 border-l-emerald-500 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Present Students</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-black text-emerald-600">
                    {statsLoading ? '...' : sessionData?.stats?.present_count ?? 0}
                  </h3>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {sessionData?.stats?.attendance_percentage ?? 0}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Marked Present for Session</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center text-xl">
                <FaCheckCircle />
              </div>
            </div>

            {/* Absent Count */}
            <div className="card p-5 border-l-4 border-l-rose-500 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Absent Students</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-black text-rose-600">
                    {statsLoading ? '...' : sessionData?.stats?.absent_count ?? 0}
                  </h3>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                    {sessionData?.stats?.total_students
                      ? (100 - (sessionData?.stats?.attendance_percentage ?? 0)).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Not Yet Marked</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 grid place-items-center text-xl">
                <FaTimesCircle />
              </div>
            </div>

            {/* Session Highlights */}
            <div className="card p-5 border-l-4 border-l-amber-500 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Highlights</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">
                  {statsLoading ? '...' : sessionData?.highlights?.length ?? 0}
                </h3>
                <button
                  onClick={() => setActiveTab('highlights')}
                  className="text-xs font-semibold text-amber-700 hover:underline mt-1 block"
                >
                  View / Edit Highlights →
                </button>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 grid place-items-center text-xl">
                <FaStar />
              </div>
            </div>
          </div>

          {/* Department Breakdown Summary Table */}
          {sessionData?.stats?.by_department && sessionData.stats.by_department.length > 0 && (
            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FaBuilding className="text-primary-600" /> Department Attendance Stats
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sessionData.stats.by_department.map((dept) => (
                  <div key={dept.department} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{dept.department}</h4>
                      <span className="text-xs font-black text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                        {dept.attendance_percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${dept.attendance_percentage}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
                      <span>Total: {dept.total_students}</span>
                      <span className="text-emerald-700 font-semibold">Present: {dept.present_count}</span>
                      <span className="text-rose-700 font-semibold">Absent: {dept.absent_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="card p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('present')}
                className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
                  activeTab === 'present'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FaCheckCircle /> Present Students ({sessionData?.present_students?.length ?? 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('absent')}
                className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
                  activeTab === 'absent'
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FaTimesCircle /> Absent Students ({sessionData?.absent_students?.length ?? 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('highlights')}
                className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
                  activeTab === 'highlights'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FaStar /> Session Highlights ({sessionData?.highlights?.length ?? 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all_records')}
                className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
                  activeTab === 'all_records'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FaUsers /> All Attendance Logs
              </button>
            </div>

            {/* TAB 1: PRESENT STUDENTS */}
            {activeTab === 'present' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="relative w-full sm:w-80">
                    <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                      type="text"
                      className="input-field !pl-9 !py-1.5 text-xs w-full"
                      placeholder="Search present student name, PRN..."
                      value={presentSearch}
                      onChange={(e) => setPresentSearch(e.target.value)}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">
                    Showing {filteredPresentStudents.length} of {sessionData?.present_students?.length ?? 0} present students
                  </span>
                </div>

                {statsLoading ? (
                  <Spinner label="Loading present students..." />
                ) : filteredPresentStudents.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                    No present students match your query for this session.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 bg-slate-50">
                          <th className="px-3 py-2.5 font-semibold">Student Name</th>
                          <th className="px-3 py-2.5 font-semibold">PRN</th>
                          <th className="px-3 py-2.5 font-semibold">Department</th>
                          <th className="px-3 py-2.5 font-semibold">Time Marked</th>
                          <th className="px-3 py-2.5 font-semibold">Device IP & Location</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPresentStudents.map((st) => (
                          <tr key={st.prn} className="hover:bg-slate-50 transition group">
                            <td className="px-3 py-2 font-medium text-slate-900">{st.full_name}</td>
                            <td className="px-3 py-2 font-mono text-xs text-primary-700">{st.prn}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">{st.department}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">
                              {st.created_at ? new Date(st.created_at).toLocaleTimeString() : '—'}
                            </td>
                            <td className="px-3 py-2 text-xs font-mono text-slate-500">
                              {st.ip} ({st.location})
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => handleDemark(st.attendance_id)}
                                className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition"
                                title="Demark Attendance"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ABSENT STUDENTS */}
            {activeTab === 'absent' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="relative w-full sm:w-80">
                    <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                      type="text"
                      className="input-field !pl-9 !py-1.5 text-xs w-full"
                      placeholder="Search absent student name, PRN, email..."
                      value={absentSearch}
                      onChange={(e) => setAbsentSearch(e.target.value)}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">
                    Showing {filteredAbsentStudents.length} of {sessionData?.absent_students?.length ?? 0} absent students
                  </span>
                </div>

                {statsLoading ? (
                  <Spinner label="Loading absent students..." />
                ) : filteredAbsentStudents.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                    🎉 All students are marked present for this session!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 bg-slate-50">
                          <th className="px-3 py-2.5 font-semibold">Student Name</th>
                          <th className="px-3 py-2.5 font-semibold">PRN</th>
                          <th className="px-3 py-2.5 font-semibold">Department</th>
                          <th className="px-3 py-2.5 font-semibold">Contact Email & Phone</th>
                          <th className="px-3 py-2.5 font-semibold">Status</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Quick Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAbsentStudents.map((st) => (
                          <tr key={st.prn} className="hover:bg-slate-50 transition">
                            <td className="px-3 py-2 font-medium text-slate-900">{st.full_name}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-700">{st.prn}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">{st.department}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">
                              <div>{st.student_email}</div>
                              <div className="text-[10px] text-slate-400">{st.student_phone}</div>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {st.is_registered ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Registered
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Pre-approved PRN
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => handleMarkPresent(st.prn)}
                                disabled={isMarking}
                                className="btn-primary !px-3 !py-1 text-xs bg-emerald-600 hover:bg-emerald-700 inline-flex items-center gap-1"
                              >
                                <FaCheck className="text-[10px]" /> Mark Present
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SESSION HIGHLIGHTS */}
            {activeTab === 'highlights' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FaStar className="text-amber-500" /> Highlights for {sessionData?.session?.title || 'Selected Session'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleOpenHighlightModal()}
                    className="btn-primary !py-1.5 !px-3 bg-amber-600 hover:bg-amber-700 text-xs flex items-center gap-1.5"
                  >
                    <FaPlus /> Add Session Highlight
                  </button>
                </div>

                {statsLoading ? (
                  <Spinner label="Loading session highlights..." />
                ) : !sessionData?.highlights || sessionData.highlights.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <FaStar className="mx-auto text-3xl text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No highlights posted for this session yet.</p>
                    <button
                      onClick={() => handleOpenHighlightModal()}
                      className="mt-2 text-xs text-amber-600 hover:underline font-bold"
                    >
                      Post first highlight for this session
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sessionData.highlights.map((h) => (
                      <div key={h.id} className="card overflow-hidden group border border-slate-200">
                        <div className="h-44 relative overflow-hidden bg-slate-200">
                          <img src={h.image_base64} alt={h.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenHighlightModal(h)}
                              className="bg-amber-500 hover:bg-amber-600 text-white rounded-full p-2.5 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"
                              title="Edit Highlight"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteHighlight(h.id)}
                              className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2.5 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all"
                              title="Delete Highlight"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-slate-900 line-clamp-1">{h.title}</h4>
                          {h.resource_speaker && h.resource_speaker !== '-' && (
                            <p className="text-xs font-semibold text-primary-600 mt-1 flex items-center gap-1">
                              👤 {h.resource_speaker}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{h.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ALL LOGGED ATTENDANCE RECORDS */}
            {activeTab === 'all_records' && (
              <div className="space-y-4">
                {/* Manual Marking Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleMarkPresent(markingPrn, markingSessionId);
                  }}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-end gap-4"
                >
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Event Session</label>
                    <select
                      className="input-field w-full text-xs"
                      value={markingSessionId}
                      onChange={(e) => setMarkingSessionId(e.target.value)}
                      required
                    >
                      <option value="">Select Session...</option>
                      {sessionsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({new Date(s.start_time).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Student PRN</label>
                    <input
                      type="text"
                      placeholder="Enter Student PRN"
                      className="input-field w-full text-xs"
                      value={markingPrn}
                      onChange={(e) => setMarkingPrn(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isMarking}
                    className="btn-primary !px-5 !py-2 text-xs w-full sm:w-auto flex items-center justify-center gap-1.5"
                  >
                    <FaCheck /> {isMarking ? 'Marking...' : 'Mark Present'}
                  </button>
                </form>

                {/* Table Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <input
                    type="text"
                    className="input-field text-xs"
                    placeholder="Filter by Student Name"
                    value={recordFilters.student_name}
                    onChange={(e) => setRecordFilters((prev) => ({ ...prev, student_name: e.target.value }))}
                  />
                  <input
                    type="text"
                    className="input-field text-xs"
                    placeholder="Filter by PRN"
                    value={recordFilters.prn}
                    onChange={(e) => setRecordFilters((prev) => ({ ...prev, prn: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="input-field text-xs"
                    value={recordFilters.date}
                    onChange={(e) => setRecordFilters((prev) => ({ ...prev, date: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="btn-secondary text-xs !py-2"
                    onClick={() => setRecordFilters({ date: '', prn: '', student_name: '', event_session_id: '' })}
                  >
                    Reset Filters
                  </button>
                </div>

                {/* Records Table */}
                {recordsLoading ? (
                  <Spinner label="Loading attendance logs..." />
                ) : records.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">No attendance records found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 bg-slate-50">
                          <th className="px-3 py-2 font-semibold">Student</th>
                          <th className="px-3 py-2 font-semibold">PRN</th>
                          <th className="px-3 py-2 font-semibold">Department</th>
                          <th className="px-3 py-2 font-semibold">Event Session</th>
                          <th className="px-3 py-2 font-semibold">Date</th>
                          <th className="px-3 py-2 font-semibold">IP & Location</th>
                          <th className="px-3 py-2 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {records.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50 transition group">
                            <td className="px-3 py-2 font-medium">{rec.student_name}</td>
                            <td className="px-3 py-2 font-mono text-xs">{rec.prn}</td>
                            <td className="px-3 py-2 text-xs">{rec.department}</td>
                            <td className="px-3 py-2 text-xs truncate max-w-[150px]">{rec.event_session_title}</td>
                            <td className="px-3 py-2 text-xs">{rec.date}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-500">
                              {rec.session.ip} ({rec.session.location || '—'})
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => handleDemark(rec.id)}
                                className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition"
                                title="Demark Attendance"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {!recordsLoading && recordPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <p className="text-xs text-slate-500">
                      Showing {records.length} of {totalRecords} records
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        className="btn-secondary !px-3 !py-1 text-xs"
                        disabled={recordPage <= 1}
                        onClick={() => setRecordPage((p) => p - 1)}
                      >
                        Prev
                      </button>
                      <span className="text-xs font-medium text-slate-600">
                        Page {recordPage} / {recordPages}
                      </span>
                      <button
                        className="btn-secondary !px-3 !py-1 text-xs"
                        disabled={recordPage >= recordPages}
                        onClick={() => setRecordPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* HIGHLIGHT ADD / EDIT MODAL */}
      <Modal
        open={highlightModalOpen}
        onClose={() => setHighlightModalOpen(false)}
        title={editingHighlight ? 'Edit Session Highlight' : 'Add Session Highlight'}
      >
        <form onSubmit={handleSaveHighlight} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Event Session</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="input-field w-full text-xs"
            >
              <option value="">No Session Link</option>
              {sessionsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({new Date(s.start_time).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Photo</label>
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-36 object-cover rounded-md" />
              ) : (
                <div className="py-4">
                  <FaImage className="mx-auto text-2xl text-slate-400 mb-1" />
                  <span className="text-xs text-slate-500 font-medium">Click to upload photo</span>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg, image/png, image/webp"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Highlight Title</label>
            <input
              type="text"
              className="input-field w-full text-xs"
              placeholder="e.g. Guest Lecture Session Highlights"
              value={highlightForm.title}
              onChange={(e) => setHighlightForm({ ...highlightForm, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Speaker (Optional)</label>
            <input
              type="text"
              className="input-field w-full text-xs"
              placeholder="e.g. Dr. A. P. Sharma"
              value={highlightForm.resource_speaker}
              onChange={(e) => setHighlightForm({ ...highlightForm, resource_speaker: e.target.value })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700">Description</label>
              <button
                type="button"
                onClick={handleGenerateAIDescription}
                disabled={generatingAI}
                className="text-[10px] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1 transition"
                title="Generate ~60-word description using Gemini AI"
              >
                <FaMagic className="text-[9px]" />
                {generatingAI ? "Generating..." : "✨ AI Generate"}
              </button>
            </div>
            <textarea
              className="input-field w-full text-xs resize-y"
              rows="3"
              placeholder="Describe what happened or click ✨ AI Generate to auto-synthesize with Gemini..."
              value={highlightForm.description}
              onChange={(e) => setHighlightForm({ ...highlightForm, description: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="btn-secondary text-xs !px-4 !py-2"
              onClick={() => setHighlightModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={highlightSubmitting}
              className="btn-primary text-xs !px-5 !py-2 bg-amber-600 hover:bg-amber-700"
            >
              {highlightSubmitting ? 'Saving...' : editingHighlight ? 'Update Highlight' : 'Publish Highlight'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DEDICATED ATTENDANCE TIME LIMIT EDIT MODAL */}
      <Modal
        open={timeLimitModalOpen}
        onClose={() => setTimeLimitModalOpen(false)}
        title="Edit Attendance Time Limit"
      >
        {sessionData?.session && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-800 text-sm">{sessionData.session.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Session Start: <span className="font-semibold text-slate-700">{new Date(sessionData.session.start_time).toLocaleString()}</span>
              </p>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                Current Attendance Limit: <strong>{sessionData.session.attendance_limit_minutes || sessionData.session.duration_minutes || 15} Mins</strong>
              </p>
            </div>

            {/* Quick Increase Options (Popup Only) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Quick Increase Limit
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditLimitMinutes((prev) => parseInt(prev || 0) + 5)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold text-xs rounded-lg border border-emerald-300 shadow-sm transition"
                >
                  +5 Mins
                </button>
                <button
                  type="button"
                  onClick={() => setEditLimitMinutes((prev) => parseInt(prev || 0) + 10)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold text-xs rounded-lg border border-emerald-300 shadow-sm transition"
                >
                  +10 Mins
                </button>
                <button
                  type="button"
                  onClick={() => setEditLimitMinutes((prev) => parseInt(prev || 0) + 15)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold text-xs rounded-lg border border-emerald-300 shadow-sm transition"
                >
                  +15 Mins
                </button>
              </div>
            </div>

            {/* Custom Input Option */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Custom Attendance Limit (Minutes)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Set or type any custom limit in minutes for active attendance:
              </p>
              <input
                type="number"
                min="1"
                value={editLimitMinutes}
                onChange={(e) => setEditLimitMinutes(e.target.value)}
                className="input-field text-center font-bold text-lg !py-2.5"
                placeholder="e.g. 10, 12, 18, 25..."
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTimeLimitModalOpen(false)}
                className="btn-secondary !px-4 !py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTimeLimit}
                disabled={updatingLimit}
                className="btn-primary !px-5 !py-2 text-xs"
              >
                {updatingLimit ? "Updating..." : "Save Time Limit"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}