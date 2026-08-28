import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaMinus, FaCalendarAlt, FaTrash, FaUserTie, FaMapMarkerAlt, FaEdit, FaTimes, FaFilter, FaClock, FaUpload } from "react-icons/fa";
import { Link } from "react-router-dom";
import { FaHome } from "react-icons/fa";

import { useToast } from "../context/ToastContext";
import { fetchEventSessions, createEventSession, deleteEventSession, updateEventSession, uploadScheduleFile, clearAllEventSessions } from "../services/adminService";
import Sidebar from "../components/Sidebar";
import Modal from "../components/Modal";

export default function AdminEventSessions() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Filtering States
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
  const [selectedDayFilter, setSelectedDayFilter] = useState("all");

  // Excel Schedule Upload States
  const [scheduleFile, setScheduleFile] = useState(null);
  const [uploadingSchedule, setUploadingSchedule] = useState(false);
  
  // Time Limit Edit Modal State
  const [timeLimitSession, setTimeLimitSession] = useState(null);
  const [limitStartTime, setLimitStartTime] = useState("");
  const [limitEndTime, setLimitEndTime] = useState("");
  const [savingTimeLimit, setSavingTimeLimit] = useState(false);

  const toast = useToast();

  const [formData, setFormData] = useState({
    title: "",
    start_time: "",
    duration_minutes: 60,
    attendance_limit_minutes: 10,
    resource_speaker: "",
    location: "",
    day: "",
    date_str: "",
    time_str: "",
    theme: "",
    key_topics: "",
    content_to_be_covered: "",
    student_activity: "",
    ai_tools: "",
    interaction_tools: "",
  });

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await fetchEventSessions();
      setSessions(res.sessions || []);
    } catch (err) {
      toast.error("Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Compute unique date keys (YYYY-MM-DD) and counts for date-based filtering
  const availableDates = useMemo(() => {
    const dateMap = {};
    sessions.forEach((s) => {
      if (!s.start_time) return;
      const d = new Date(s.start_time);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      if (!dateMap[key]) {
        dateMap[key] = { key, label, count: 0 };
      }
      dateMap[key].count += 1;
    });
    return Object.values(dateMap).sort((a, b) => a.key.localeCompare(b.key));
  }, [sessions]);

  // Compute unique Days from sessions for filtering
  const availableDays = useMemo(() => {
    const dayMap = {};
    sessions.forEach((s) => {
      if (s.day && s.day !== "-") {
        const d_key = s.day.trim();
        if (!dayMap[d_key]) {
          dayMap[d_key] = { key: d_key, label: d_key, count: 0 };
        }
        dayMap[d_key].count += 1;
      }
    });
    return Object.values(dayMap).sort((a, b) => a.key.localeCompare(b.key));
  }, [sessions]);

  // Filter sessions according to selected date AND day
  const displayedSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Date filter check
      if (selectedDateFilter !== "all") {
        if (!s.start_time) return false;
        const d = new Date(s.start_time);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (key !== selectedDateFilter) return false;
      }
      // Day filter check
      if (selectedDayFilter !== "all") {
        if (!s.day || s.day.trim() !== selectedDayFilter) return false;
      }
      return true;
    });
  }, [sessions, selectedDateFilter, selectedDayFilter]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleScheduleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setScheduleFile(e.target.files[0]);
    }
  };

  const handleScheduleUploadSubmit = async () => {
    if (!scheduleFile) return;
    const fData = new FormData();
    fData.append("file", scheduleFile);

    try {
      setUploadingSchedule(true);
      const res = await uploadScheduleFile(fData);
      toast.success(res.message || "Schedule uploaded successfully!");
      setScheduleFile(null);
      const inputEl = document.getElementById('schedule-excel-upload');
      if (inputEl) inputEl.value = '';
      loadSessions();
    } catch (err) {
      toast.error(err.message || "Failed to upload schedule.");
    } finally {
      setUploadingSchedule(false);
    }
  };

  const handleClearAllEvents = async () => {
    if (!window.confirm("WARNING: This will permanently delete ALL event sessions, linked attendance records, and highlights. Are you absolutely sure?")) return;
    try {
      setSubmitting(true);
      const res = await clearAllEventSessions();
      toast.success(res.message || "All events cleared successfully.");
      loadSessions();
    } catch (err) {
      toast.error(err.message || "Failed to clear events.");
    } finally {
      setSubmitting(false);
    }
  };

  const toLocalISOString = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getEndTimeLocalISO = (startTimeStr, limitMinutes) => {
    if (!startTimeStr) return "";
    const d = new Date(startTimeStr);
    const endD = new Date(d.getTime() + limitMinutes * 60000);
    return toLocalISOString(endD);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_time) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const localDate = new Date(formData.start_time);
      const payload = {
        title: formData.title.trim(),
        start_time: localDate.toISOString(),
        duration_minutes: parseInt(formData.duration_minutes || 60, 10),
        attendance_limit_minutes: parseInt(formData.attendance_limit_minutes || 10, 10),
        resource_speaker: formData.resource_speaker.trim() || "-",
        location: formData.location.trim() || "-",
        day: formData.day.trim() || "-",
        date_str: formData.date_str.trim() || "-",
        time_str: formData.time_str.trim() || "-",
        theme: formData.theme.trim() || "-",
        key_topics: formData.key_topics.trim() || "-",
        content_to_be_covered: formData.content_to_be_covered.trim() || "-",
        student_activity: formData.student_activity.trim() || "-",
        ai_tools: formData.ai_tools.trim() || "-",
        interaction_tools: formData.interaction_tools.trim() || "-",
      };

      if (editingId) {
        await updateEventSession(editingId, payload);
        toast.success("Event session updated successfully!");
        setEditingId(null);
      } else {
        await createEventSession(payload);
        toast.success("Event session created successfully!");
      }
      setFormData({
        title: "",
        start_time: "",
        duration_minutes: 60,
        attendance_limit_minutes: 10,
        resource_speaker: "",
        location: "",
        day: "",
        date_str: "",
        time_str: "",
        theme: "",
        key_topics: "",
        content_to_be_covered: "",
        student_activity: "",
        ai_tools: "",
        interaction_tools: "",
      });
      loadSessions();
    } catch (err) {
      toast.error(err.message || "Failed to save session.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (session) => {
    try {
      setFormData({
        title: session.title || "",
        start_time: toLocalISOString(session.start_time),
        duration_minutes: session.duration_minutes || 60,
        attendance_limit_minutes: session.attendance_limit_minutes || 10,
        resource_speaker: (session.resource_speaker === "-" || !session.resource_speaker) ? "" : session.resource_speaker,
        location: (session.location === "-" || !session.location) ? "" : session.location,
        day: (session.day === "-" || !session.day) ? "" : session.day,
        date_str: (session.date_str === "-" || !session.date_str) ? "" : session.date_str,
        time_str: (session.time_str === "-" || !session.time_str) ? "" : session.time_str,
        theme: (session.theme === "-" || !session.theme) ? "" : session.theme,
        key_topics: (session.key_topics === "-" || !session.key_topics) ? "" : session.key_topics,
        content_to_be_covered: (session.content_to_be_covered === "-" || !session.content_to_be_covered) ? "" : session.content_to_be_covered,
        student_activity: (session.student_activity === "-" || !session.student_activity) ? "" : session.student_activity,
        ai_tools: (session.ai_tools === "-" || !session.ai_tools) ? "" : session.ai_tools,
        interaction_tools: (session.interaction_tools === "-" || !session.interaction_tools) ? "" : session.interaction_tools,
      });
      setEditingId(session.id);
      toast.info(`Editing session: ${session.title}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("Failed to format date for edit:", err);
      toast.error("Failed to load session details for editing.");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      title: "",
      start_time: "",
      duration_minutes: 60,
      attendance_limit_minutes: 10,
      resource_speaker: "",
      location: "",
      day: "",
      date_str: "",
      time_str: "",
      theme: "",
      key_topics: "",
      content_to_be_covered: "",
      student_activity: "",
      ai_tools: "",
      interaction_tools: "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this session?")) return;
    try {
      await deleteEventSession(id);
      toast.success("Event session deleted successfully!");
      if (editingId === id) handleCancelEdit();
      loadSessions();
    } catch (err) {
      toast.error(err.message || "Failed to delete session.");
    }
  };

  const handleOpenTimeLimitModal = (session) => {
    setTimeLimitSession(session);
    const startLoc = toLocalISOString(session.start_time);
    setLimitStartTime(startLoc);
    setLimitEndTime(getEndTimeLocalISO(startLoc, session.attendance_limit_minutes ?? 10));
  };

  const handleQuickAddLimit = (mins) => {
    if (!limitEndTime) return;
    const endD = new Date(limitEndTime);
    if (isNaN(endD.getTime())) return;
    const newEnd = new Date(endD.getTime() + mins * 60000);
    setLimitEndTime(toLocalISOString(newEnd));
  };

  const handleSaveTimeLimitModal = async () => {
    if (!timeLimitSession || !limitStartTime || !limitEndTime) return;
    const dStart = new Date(limitStartTime);
    const dEnd = new Date(limitEndTime);

    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) {
      toast.error("Please enter valid start and end clock times.");
      return;
    }

    if (dEnd <= dStart) {
      toast.error("End time must be after start time.");
      return;
    }

    const finalMinutes = Math.round((dEnd - dStart) / 60000);
    if (finalMinutes < 1) {
      toast.error("Attendance window must be at least 1 minute.");
      return;
    }

    try {
      setSavingTimeLimit(true);
      await updateEventSession(timeLimitSession.id, {
        start_time: dStart.toISOString(),
        attendance_limit_minutes: finalMinutes
      });
      toast.success(`Timing updated successfully for "${timeLimitSession.title}" to ${finalMinutes} mins!`);
      setTimeLimitSession(null);
      loadSessions();
    } catch (err) {
      toast.error(err.message || "Failed to update attendance timing limit.");
    } finally {
      setSavingTimeLimit(false);
    }
  };

  const getSessionActiveInfo = (session) => {
    if (!session.start_time) return { status: 'Ended', active: false, windowStr: '—', attLimit: 10 };
    const start = new Date(session.start_time);
    const attLimit = session.attendance_limit_minutes ?? 10;
    const end = new Date(start.getTime() + (attLimit + 5) * 60000); // 5m grace
    const now = new Date();

    const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const windowStr = `${startStr} - ${endStr}`;

    if (now >= start && now <= end) {
      const remainingMs = end - now;
      const remainingMins = Math.ceil(remainingMs / 60000);
      return { status: `Attendance Open (${remainingMins}m left)`, active: true, windowStr, attLimit };
    } else if (now < start) {
      return { status: 'Upcoming', active: false, windowStr, attLimit };
    } else {
      return { status: 'Attendance Closed', active: false, windowStr, attLimit };
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
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
            <h1 className="text-lg font-extrabold text-slate-900">Manage Event Sessions</h1>
          </div>
          <Link to="/" className="btn-secondary !px-4 !py-2">
            <FaHome /> <span className="hidden sm:inline">Portal</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 animate-fade-up">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="mt-1 text-sm text-slate-500">
                Upload schedule Excel sheets, manage individual sessions, extend attendance timing limits, and filter events.
              </p>
            </div>

            {/* Filtering Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <FaFilter className="text-slate-400 text-xs" />
                <span className="text-xs font-bold text-slate-500">Filter Day:</span>
                <select
                  value={selectedDayFilter}
                  onChange={(e) => setSelectedDayFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer border border-slate-200 rounded px-2 py-1"
                >
                  <option value="all">All Days</option>
                  {availableDays.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label} ({d.count})
                    </option>
                  ))}
                </select>
              </div>

              {availableDates.length > 0 && (
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-slate-400 text-xs" />
                  <span className="text-xs font-bold text-slate-500">Filter Date:</span>
                  <select
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer border border-slate-200 rounded px-2 py-1"
                  >
                    <option value="all">All Dates ({sessions.length})</option>
                    {availableDates.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label} ({item.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-6 md:col-span-1">
              {/* Session Form (Create / Edit) */}
              <div className={`card p-5 h-fit border-t-4 ${editingId ? "border-t-amber-500 bg-amber-50/20" : "border-t-primary-500"}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {editingId ? <FaEdit className="text-amber-600" /> : <FaPlus className="text-primary-600" />}
                    {editingId ? "Edit Session" : "New Session"}
                  </h2>
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-2 py-1 rounded flex items-center gap-1 transition"
                    >
                      <FaTimes /> Cancel
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Theme / Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g. Generative AI & Prompt Engineering"
                      className="input-field mt-1"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Day</label>
                      <input
                        type="text"
                        name="day"
                        value={formData.day}
                        onChange={handleChange}
                        placeholder="e.g. 2"
                        className="input-field mt-1 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">Date String</label>
                      <input
                        type="text"
                        name="date_str"
                        value={formData.date_str}
                        onChange={handleChange}
                        placeholder="e.g. 21-Sep-2026"
                        className="input-field mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Time Range</label>
                      <input
                        type="text"
                        name="time_str"
                        value={formData.time_str}
                        onChange={handleChange}
                        placeholder="e.g. 10:00 - 11.00"
                        className="input-field mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Start (For Active window) *</label>
                      <input
                        type="datetime-local"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleChange}
                        className="input-field mt-1 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Duration (Mins) *</label>
                      <input
                        type="number"
                        name="duration_minutes"
                        value={formData.duration_minutes}
                        onChange={handleChange}
                        min="1"
                        placeholder="60"
                        className="input-field mt-1 text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Attendance Limit (Mins) *</label>
                      <input
                        type="number"
                        name="attendance_limit_minutes"
                        value={formData.attendance_limit_minutes}
                        onChange={handleChange}
                        min="1"
                        placeholder="10"
                        className="input-field mt-1 text-xs border-emerald-300 focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Resource Speaker</label>
                      <input
                        type="text"
                        name="resource_speaker"
                        value={formData.resource_speaker}
                        onChange={handleChange}
                        placeholder="Speaker name"
                        className="input-field mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Venue</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="e.g. Main Auditorium"
                        className="input-field mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Key Topics</label>
                    <textarea
                      name="key_topics"
                      value={formData.key_topics}
                      onChange={handleChange}
                      placeholder="Enter session topics..."
                      rows="2"
                      className="input-field mt-1 text-xs"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Content to be Covered</label>
                    <textarea
                      name="content_to_be_covered"
                      value={formData.content_to_be_covered}
                      onChange={handleChange}
                      placeholder="Detailed content details..."
                      rows="2"
                      className="input-field mt-1 text-xs"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Student Activity</label>
                    <input
                      type="text"
                      name="student_activity"
                      value={formData.student_activity}
                      onChange={handleChange}
                      placeholder="e.g. Guided discussion, Q&A"
                      className="input-field mt-1 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">AI Tools introduced</label>
                      <input
                        type="text"
                        name="ai_tools"
                        value={formData.ai_tools}
                        onChange={handleChange}
                        placeholder="AI tools list"
                        className="input-field mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Interaction Tools</label>
                      <input
                        type="text"
                        name="interaction_tools"
                        value={formData.interaction_tools}
                        onChange={handleChange}
                        placeholder="Poll/Quiz, etc."
                        className="input-field mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-2 rounded-lg font-bold text-white transition-all shadow-md text-xs ${
                      editingId
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-primary-600 hover:bg-primary-700"
                    }`}
                  >
                    {submitting ? "Saving..." : editingId ? "Update Session" : "Create Session"}
                  </button>
                </form>
              </div>

              {/* Import Excel Schedule Card */}
              <div className="card p-5 h-fit border-t-4 border-t-emerald-500">
                <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <FaUpload className="text-emerald-600 text-sm" /> Import Excel Schedule
                </h2>
                <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                  Directly upload schedule Excel sheet (.xlsx). Columns: <strong>Day</strong>, <strong>Date</strong>, <strong>Time</strong>, <strong>Theme</strong>, <strong>Key Topics</strong>, <strong>Content</strong>, <strong>Activity</strong>, <strong>Speaker</strong> will be imported.
                </p>
                <div className="space-y-4">
                  <input
                    type="file"
                    id="schedule-excel-upload"
                    accept=".xlsx, .xls"
                    onChange={handleScheduleFileChange}
                    className="block w-full text-xs text-slate-500
                      file:mr-3 file:py-1.5 file:px-3
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-emerald-50 file:text-emerald-700
                      hover:file:bg-emerald-100 cursor-pointer"
                  />
                  <button
                    type="button"
                    disabled={uploadingSchedule || !scheduleFile}
                    onClick={handleScheduleUploadSubmit}
                    className="btn-primary w-full justify-center !py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {uploadingSchedule ? "Importing..." : "Upload Schedule"}
                  </button>
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <button
                      type="button"
                      disabled={loading || submitting}
                      onClick={handleClearAllEvents}
                      className="w-full justify-center py-2 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <FaTrash className="text-[10px]" /> Clear All Events
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sessions List */}
            <div className="card p-5 md:col-span-2 space-y-4 h-fit overflow-hidden">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FaCalendarAlt className="text-primary-600" />
                  {selectedDateFilter === "all" && selectedDayFilter === "all"
                    ? "Complete Schedule"
                    : `Filtered Schedule (${displayedSessions.length} sessions)`}
                </h2>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                  Showing {displayedSessions.length} of {sessions.length}
                </span>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500 py-8 text-center">Loading schedule...</p>
              ) : displayedSessions.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FaCalendarAlt className="mx-auto text-3xl text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No sessions found for these filters.</p>
                  {(selectedDateFilter !== "all" || selectedDayFilter !== "all") && (
                    <button
                      onClick={() => { setSelectedDateFilter("all"); setSelectedDayFilter("all"); }}
                      className="mt-2 text-xs text-primary-600 hover:underline font-bold"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 min-w-[1000px]">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 font-bold rounded-tl-lg w-16">Day & Date</th>
                        <th className="px-3 py-3 font-bold w-24">Time Range</th>
                        <th className="px-3 py-3 font-bold w-48">Theme / Session Title</th>
                        <th className="px-3 py-3 font-bold">Details & Topics</th>
                        <th className="px-3 py-3 font-bold w-32">Resource Speaker</th>
                        <th className="px-3 py-3 font-bold text-center w-40">Attendance Timing Limit</th>
                        <th className="px-3 py-3 font-bold text-center rounded-tr-lg w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedSessions.map((s) => {
                        const isEditingThis = editingId === s.id;
                        const activeInfo = getSessionActiveInfo(s);

                        return (
                          <tr
                            key={s.id}
                            className={`transition ${
                              isEditingThis ? "bg-amber-50/60 font-semibold" : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-3 py-3">
                              <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                Day {s.day || "-"}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">{s.date_str || "-"}</div>
                            </td>
                            <td className="px-3 py-3 font-semibold text-slate-700">
                              {s.time_str || "-"}
                            </td>
                            <td className="px-3 py-3 text-slate-800">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 leading-tight">{s.title}</span>
                                {isEditingThis && (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                    Editing
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-slate-400 mt-1">
                                {s.location !== "-" ? `Venue: ${s.location}` : ""}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-[11px] text-slate-600 space-y-1 max-w-xs whitespace-normal">
                              {s.key_topics && s.key_topics !== "-" && (
                                <div><strong className="text-slate-700">Topics:</strong> {s.key_topics}</div>
                              )}
                              {s.content_to_be_covered && s.content_to_be_covered !== "-" && (
                                <div><strong className="text-slate-700">Content:</strong> {s.content_to_be_covered}</div>
                              )}
                              {s.student_activity && s.student_activity !== "-" && (
                                <div><strong className="text-slate-700">Activity:</strong> {s.student_activity}</div>
                              )}
                              {(s.ai_tools && s.ai_tools !== "-") || (s.interaction_tools && s.interaction_tools !== "-") ? (
                                <div className="text-[10px] bg-slate-50 p-1 rounded border border-slate-100 flex flex-col gap-0.5">
                                  {s.ai_tools && s.ai_tools !== "-" && (
                                    <div>🤖 <strong>AI Tools:</strong> {s.ai_tools}</div>
                                  )}
                                  {s.interaction_tools && s.interaction_tools !== "-" && (
                                    <div>💬 <strong>Interaction:</strong> {s.interaction_tools}</div>
                                  )}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 font-medium text-slate-700">
                              {s.resource_speaker || "-"}
                            </td>

                            {/* Attendance window timing */}
                            <td className="px-3 py-3 text-center text-[11px]">
                              <div className="font-mono font-bold text-slate-700">
                                {activeInfo.windowStr}
                              </div>
                              <div className="mt-1 flex flex-col items-center gap-1">
                                {activeInfo.active ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live ({activeInfo.attLimit}m)
                                  </span>
                                ) : activeInfo.status === 'Upcoming' ? (
                                  <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                    Upcoming ({activeInfo.attLimit}m)
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                                    Closed ({activeInfo.attLimit}m)
                                  </span>
                                )}
                                
                                <button
                                  type="button"
                                  onClick={() => handleOpenTimeLimitModal(s)}
                                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200 transition inline-flex items-center gap-1 mt-1 shadow-sm"
                                  title="Manage attendance limit"
                                >
                                  <FaClock className="text-[9px]" /> Manage limit
                                </button>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  onClick={() => handleOpenTimeLimitModal(s)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition"
                                  title="Manage Attendance Limit"
                                >
                                  <FaClock />
                                </button>
                                <button
                                  onClick={() => handleEdit(s)}
                                  className={`p-1.5 rounded transition ${
                                    isEditingThis
                                      ? "bg-amber-500 text-white"
                                      : "text-amber-600 hover:bg-amber-50"
                                  }`}
                                  title="Edit Session"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => handleDelete(s.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                                  title="Delete Session"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* DEDICATED ATTENDANCE TIME LIMIT EDIT MODAL */}
      <Modal
        open={!!timeLimitSession}
        onClose={() => setTimeLimitSession(null)}
        title="Manage Attendance Limit Timing"
      >
        {timeLimitSession && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-800 text-sm">{timeLimitSession.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Speaker: <span className="font-semibold text-slate-700">{timeLimitSession.resource_speaker}</span>
              </p>
            </div>

            {/* Start Time Input (Clock timing) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Attendance Start Date & Time (Clock Timing)
              </label>
              <input
                type="datetime-local"
                value={limitStartTime}
                onChange={(e) => {
                  setLimitStartTime(e.target.value);
                  // Read current duration, add to new start time
                  const mins = Math.max(1, Math.round((new Date(limitEndTime) - new Date(limitStartTime)) / 60000)) || 10;
                  setLimitEndTime(getEndTimeLocalISO(e.target.value, mins));
                }}
                className="input-field mt-1 text-xs"
                required
              />
            </div>

            {/* End Time Input (Clock timing) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Attendance End Date & Time (Clock Timing)
              </label>
              <input
                type="datetime-local"
                value={limitEndTime}
                onChange={(e) => setLimitEndTime(e.target.value)}
                className="input-field mt-1 text-xs"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Calculated Limit: <span className="font-bold text-slate-700">
                  {Math.round((new Date(limitEndTime) - new Date(limitStartTime)) / 60000) || 10} Mins
                </span>
              </p>
            </div>

            {/* Quick Extension Buttons */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Quick Extend End Time
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAddLimit(5)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold text-xs rounded-lg border border-emerald-300 shadow-sm transition"
                >
                  +5 Mins
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddLimit(10)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold text-xs rounded-lg border border-emerald-300 shadow-sm transition"
                >
                  +10 Mins
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddLimit(15)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold text-xs rounded-lg border border-emerald-300 shadow-sm transition"
                >
                  +15 Mins
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTimeLimitSession(null)}
                className="btn-secondary !px-4 !py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTimeLimitModal}
                disabled={savingTimeLimit}
                className="btn-primary !px-5 !py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {savingTimeLimit ? "Saving..." : "Save Attendance Limit"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
