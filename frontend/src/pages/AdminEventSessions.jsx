import { useEffect, useState } from "react";
import { FaPlus, FaCalendarAlt, FaTrash } from "react-icons/fa";

import { useToast } from "../context/ToastContext";
import { fetchEventSessions, createEventSession, deleteEventSession } from "../services/attendanceService";
import Sidebar from "../components/Sidebar";
import { Link } from "react-router-dom";
import { FaHome } from "react-icons/fa";

export default function AdminEventSessions() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    title: "",
    start_time: "",
    duration_minutes: 60,
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_time || !formData.duration_minutes) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      setSubmitting(true);
      // Convert local datetime-local value to ISO string with proper UTC timezone
      const localDate = new Date(formData.start_time);
      const payload = {
        title: formData.title,
        start_time: localDate.toISOString(),
        duration_minutes: parseInt(formData.duration_minutes, 10)
      };

      await createEventSession(payload);
      toast.success("Event session created successfully!");
      setFormData({ title: "", start_time: "", duration_minutes: 60 });
      loadSessions();
    } catch (err) {
      toast.error(err.message || "Failed to create session.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this session?")) return;
    try {
      await deleteEventSession(id);
      toast.success("Event session deleted successfully!");
      loadSessions();
    } catch (err) {
      toast.error(err.message || "Failed to delete session.");
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
          <header>
            <p className="mt-1 text-sm text-slate-500">
              Create and view time-bound attendance sessions.
            </p>
          </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Session Form */}
        <div className="card p-5 md:col-span-1 h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FaPlus className="text-primary-600" /> New Session
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Day 1 Morning"
                className="input-field mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Start Time (Local)</label>
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
              <p className="text-xs text-slate-500 mt-1">Students can mark attendance until Duration + 5 mins grace period.</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center"
            >
              {submitting ? "Creating..." : "Create Session"}
            </button>
          </form>
        </div>

        {/* Sessions List */}
        <div className="card p-5 md:col-span-2">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FaCalendarAlt className="text-primary-600" /> All Sessions
          </h2>
          
          {loading ? (
            <p className="text-sm text-slate-500">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-500">No sessions created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Title</th>
                    <th className="px-4 py-3 font-semibold">Start Time (UTC)</th>
                    <th className="px-4 py-3 font-semibold text-right">Duration</th>
                    <th className="px-4 py-3 font-semibold text-center rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.title}</td>
                      <td className="px-4 py-3">{new Date(s.start_time + 'Z').toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{s.duration_minutes} mins</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Delete Session"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
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
