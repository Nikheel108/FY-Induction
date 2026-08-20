import { useEffect, useState, useMemo } from "react";
import { FaPlus, FaCalendarAlt, FaTrash, FaUserTie, FaMapMarkerAlt, FaEdit, FaTimes, FaFilter } from "react-icons/fa";
import { Link } from "react-router-dom";
import { FaHome } from "react-icons/fa";

import { useToast } from "../context/ToastContext";
import { fetchEventSessions, createEventSession, deleteEventSession, updateEventSession } from "../services/adminService";
import Sidebar from "../components/Sidebar";

export default function AdminEventSessions() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
  const toast = useToast();

  const [formData, setFormData] = useState({
    title: "",
    start_time: "",
    duration_minutes: 60,
    resource_speaker: "",
    location: "",
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

  // Filter sessions according to selected date
  const displayedSessions = useMemo(() => {
    if (selectedDateFilter === "all") return sessions;
    return sessions.filter((s) => {
      if (!s.start_time) return false;
      const d = new Date(s.start_time);
      if (isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return key === selectedDateFilter;
    });
  }, [sessions, selectedDateFilter]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_time || !formData.duration_minutes) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      // Convert local datetime-local value to ISO string with UTC timezone
      const localDate = new Date(formData.start_time);
      const payload = {
        title: formData.title.trim(),
        start_time: localDate.toISOString(),
        duration_minutes: parseInt(formData.duration_minutes, 10),
        resource_speaker: formData.resource_speaker.trim() || "-",
        location: formData.location.trim() || "-",
      };

      if (editingId) {
        await updateEventSession(editingId, payload);
        toast.success("Event session updated successfully!");
        setEditingId(null);
      } else {
        await createEventSession(payload);
        toast.success("Event session created successfully!");
      }
      setFormData({ title: "", start_time: "", duration_minutes: 60, resource_speaker: "", location: "" });
      loadSessions();
    } catch (err) {
      toast.error(err.message || "Failed to save session.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (session) => {
    try {
      let localISOTime = "";
      if (session.start_time) {
        const d = new Date(session.start_time);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          localISOTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
      }

      setFormData({
        title: session.title || "",
        start_time: localISOTime,
        duration_minutes: session.duration_minutes || 60,
        resource_speaker: (session.resource_speaker === "-" || !session.resource_speaker) ? "" : session.resource_speaker,
        location: (session.location === "-" || !session.location) ? "" : session.location,
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
    setFormData({ title: "", start_time: "", duration_minutes: 60, resource_speaker: "", location: "" });
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

  const handleExtendDuration = async (session, minutesToAdd) => {
    try {
      const newDuration = (session.duration_minutes || 60) + minutesToAdd;
      await updateEventSession(session.id, { duration_minutes: newDuration });
      toast.success(`Extended session duration by +${minutesToAdd} mins (New: ${newDuration} mins)`);
      loadSessions();
    } catch (err) {
      toast.error(err.message || "Failed to extend duration.");
    }
  };

  const getSessionActiveInfo = (session) => {
    if (!session.start_time) return { status: 'Ended', active: false, windowStr: '—' };
    const start = new Date(session.start_time);
    const end = new Date(start.getTime() + (session.duration_minutes + 5) * 60000); // 5m grace
    const now = new Date();

    const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const windowStr = `${startStr} - ${endStr}`;

    if (now >= start && now <= end) {
      const remainingMs = end - now;
      const remainingMins = Math.ceil(remainingMs / 60000);
      return { status: `Live Now (${remainingMins}m left)`, active: true, windowStr };
    } else if (now < start) {
      return { status: 'Upcoming', active: false, windowStr };
    } else {
      return { status: 'Ended', active: false, windowStr };
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
                Create, edit, extend live attendance windows, and filter sessions by date.
              </p>
            </div>

            {/* Date Filter Dropdown */}
            {availableDates.length > 0 && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                <FaFilter className="text-slate-400 text-xs" />
                <span className="text-xs font-semibold text-slate-500">Filter Date:</span>
                <select
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
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
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Session Form (Create / Edit) */}
            <div className={`card p-5 md:col-span-1 h-fit border-t-4 ${editingId ? "border-t-amber-500 bg-amber-50/20" : "border-t-primary-500"}`}>
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
                  <label className="block text-sm font-semibold text-slate-700">Session Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Day 1 Morning Session"
                    className="input-field mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Start Time (Local Date & Time)</label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="input-field mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Resource Speaker (Optional)</label>
                  <input
                    type="text"
                    name="resource_speaker"
                    value={formData.resource_speaker}
                    onChange={handleChange}
                    placeholder="e.g. Dr. A. P. Sharma"
                    className="input-field mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Location / Venue (Optional)</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Main Auditorium"
                    className="input-field mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Duration (Minutes)</label>
                  <input
                    type="number"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleChange}
                    min="1"
                    className="input-field mt-1"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Attendance remains open until Duration + 5 mins grace period.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-2.5 rounded-lg font-bold text-white transition-all shadow-md ${
                    editingId
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-primary-600 hover:bg-primary-700"
                  }`}
                >
                  {submitting ? "Saving..." : editingId ? "Update Session" : "Create Session"}
                </button>
              </form>
            </div>

            {/* Sessions List with Date Filter Tabs */}
            <div className="card p-5 md:col-span-2 space-y-4">
              {/* Date Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                    selectedDateFilter === "all"
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Dates ({sessions.length})
                </button>
                {availableDates.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedDateFilter(item.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                      selectedDateFilter === item.key
                        ? "bg-primary-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <FaCalendarAlt className="text-[10px]" />
                    {item.label} ({item.count})
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FaCalendarAlt className="text-primary-600" />
                  {selectedDateFilter === "all"
                    ? "All Event Sessions"
                    : `Sessions for ${availableDates.find(d => d.key === selectedDateFilter)?.label || selectedDateFilter}`}
                </h2>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                  Showing {displayedSessions.length} of {sessions.length}
                </span>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500 py-8 text-center">Loading sessions...</p>
              ) : displayedSessions.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FaCalendarAlt className="mx-auto text-3xl text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No sessions found for this date.</p>
                  {selectedDateFilter !== "all" && (
                    <button
                      onClick={() => setSelectedDateFilter("all")}
                      className="mt-2 text-xs text-primary-600 hover:underline font-bold"
                    >
                      Show all sessions
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 font-semibold rounded-tl-lg">Title & Speaker</th>
                        <th className="px-3 py-3 font-semibold">Attendance Live Window</th>
                        <th className="px-3 py-3 font-semibold text-center">Duration & Extend</th>
                        <th className="px-3 py-3 font-semibold text-center rounded-tr-lg">Actions</th>
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
                            <td className="px-3 py-3 font-medium text-slate-800">
                              <div className="flex items-center gap-2">
                                <span>{s.title}</span>
                                {isEditingThis && (
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Editing
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 font-normal mt-1 flex flex-wrap gap-3">
                                {s.resource_speaker !== "-" && (
                                  <span className="flex items-center gap-1">
                                    <FaUserTie className="text-primary-500" /> {s.resource_speaker}
                                  </span>
                                )}
                                {s.location !== "-" && (
                                  <span className="flex items-center gap-1">
                                    <FaMapMarkerAlt className="text-primary-500" /> {s.location}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Attendance Live Time Window */}
                            <td className="px-3 py-3 text-xs">
                              <div className="font-semibold text-slate-800">
                                {activeInfo.windowStr}
                              </div>
                              <div className="mt-1">
                                {activeInfo.active ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {activeInfo.status}
                                  </span>
                                ) : activeInfo.status === 'Upcoming' ? (
                                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Upcoming
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                    Ended
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Duration & Quick Extend Buttons */}
                            <td className="px-3 py-3 text-center">
                              <div className="font-mono font-bold text-xs text-slate-800">
                                {s.duration_minutes} mins
                              </div>
                              <div className="flex items-center justify-center gap-1 mt-1">
                                <span className="text-[10px] text-slate-400 font-semibold">Extend:</span>
                                <button
                                  type="button"
                                  onClick={() => handleExtendDuration(s, 15)}
                                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200 transition"
                                  title="Extend attendance live duration by 15 minutes"
                                >
                                  +15m
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExtendDuration(s, 30)}
                                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200 transition"
                                  title="Extend attendance live duration by 30 minutes"
                                >
                                  +30m
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExtendDuration(s, 60)}
                                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200 transition"
                                  title="Extend attendance live duration by 60 minutes"
                                >
                                  +60m
                                </button>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEdit(s)}
                                  className={`p-2 rounded-lg transition ${
                                    isEditingThis
                                      ? "bg-amber-500 text-white"
                                      : "text-primary-600 hover:bg-primary-50"
                                  }`}
                                  title="Edit Session"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => handleDelete(s.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
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
    </div>
  );
}
