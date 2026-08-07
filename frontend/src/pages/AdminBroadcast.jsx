import { useState } from "react";
import { FaPaperPlane, FaBullhorn } from "react-icons/fa";

import Sidebar from "../components/Sidebar";
import { useToast } from "../context/ToastContext";
import { broadcastEmail } from "../services/adminService";

export default function AdminBroadcast() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: "Important Update: First Year Induction",
    program_name: "First Year Induction Program",
    date: "",
    time: "",
    venue: "Main Auditorium",
    additional_message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.date || !formData.time || !formData.venue.trim()) {
      toast.error("Subject, Date, Time, and Venue are required.");
      return;
    }

    if (!window.confirm("Are you sure you want to broadcast this email to ALL enrolled students?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await broadcastEmail(formData);
      toast.success(res.message);
      // Reset some fields but keep defaults
      setFormData((prev) => ({
        ...prev,
        additional_message: "",
      }));
    } catch (err) {
      toast.error(err.message || "Failed to start broadcast");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3">
          <h1 className="text-lg font-extrabold text-slate-900">Broadcast Email</h1>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
          <div className="card p-6 sm:p-8">
            <div className="mb-6 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-100 text-xl text-blue-700">
                  <FaBullhorn />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Send Event Details</h2>
                  <p className="text-sm text-slate-500">
                    This email will be sent to <strong>all registered students</strong> in the background.
                    The official schedule documents will be attached automatically.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Email Subject</label>
                <input
                  type="text"
                  name="subject"
                  className="input-field"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="e.g. Important Update: Induction Program"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Program / Event Name</label>
                <input
                  type="text"
                  name="program_name"
                  className="input-field"
                  value={formData.program_name}
                  onChange={handleChange}
                  placeholder="e.g. FY Induction Day 1"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Date</label>
                  <input
                    type="date"
                    name="date"
                    className="input-field"
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Time</label>
                  <input
                    type="time"
                    name="time"
                    className="input-field"
                    value={formData.time}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Venue / Location</label>
                <input
                  type="text"
                  name="venue"
                  className="input-field"
                  value={formData.venue}
                  onChange={handleChange}
                  placeholder="e.g. Main Auditorium"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Additional Message (Optional)</label>
                <textarea
                  name="additional_message"
                  rows="4"
                  className="input-field resize-y"
                  value={formData.additional_message}
                  onChange={handleChange}
                  placeholder="Write any extra instructions or a welcome note here..."
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  className="btn-primary w-full sm:w-auto"
                  disabled={loading}
                >
                  <FaPaperPlane />
                  {loading ? "Starting Broadcast..." : "Send to All Students"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
