import { useEffect, useState, useMemo } from "react";
import {
  FaCommentDots,
  FaCheckCircle,
  FaClock,
  FaTrash,
  FaSearch,
  FaFilter,
  FaEnvelope,
  FaUserGraduate,
  FaHome,
  FaExclamationCircle
} from "react-icons/fa";
import { Link } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Modal from "../components/Modal";
import Spinner from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import {
  getContactQueries,
  updateContactQueryStatus,
  deleteContactQuery
} from "../services/adminService";

export default function AdminContactQueries() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [queries, setQueries] = useState([]);
  const [stats, setStats] = useState({ pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'pending' | 'resolved'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const toast = useToast();

  const loadQueries = async () => {
    try {
      setLoading(true);
      const res = await getContactQueries();
      setQueries(res.queries || []);
      setStats(res.stats || { pending: 0, total: 0 });
    } catch (err) {
      toast.error("Failed to load contact queries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      // Status filter
      if (statusFilter !== "all" && q.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = q.name?.toLowerCase().includes(query);
        const prnMatch = q.prn?.toLowerCase().includes(query);
        const emailMatch = q.email?.toLowerCase().includes(query);
        const descMatch = q.description?.toLowerCase().includes(query);
        return nameMatch || prnMatch || emailMatch || descMatch;
      }
      return true;
    });
  }, [queries, statusFilter, searchQuery]);

  const handleToggleStatus = async (queryItem) => {
    const nextStatus = queryItem.status === "pending" ? "resolved" : "pending";
    try {
      setUpdatingId(queryItem.id);
      await updateContactQueryStatus(queryItem.id, nextStatus);
      toast.success(`Query marked as ${nextStatus}!`);
      loadQueries();
    } catch (err) {
      toast.error("Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this query?")) return;
    try {
      await deleteContactQuery(id);
      toast.success("Query deleted.");
      if (selectedQuery?.id === id) setSelectedQuery(null);
      loadQueries();
    } catch (err) {
      toast.error("Failed to delete query.");
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
            <h1 className="text-lg font-extrabold text-slate-900">Student Contact Queries</h1>
          </div>
          <Link to="/" className="btn-secondary !px-4 !py-2">
            <FaHome /> <span className="hidden sm:inline">Portal</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 animate-fade-up">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="mt-1 text-sm text-slate-500">
                View, manage, and resolve student queries submitted via the Contact Us form.
              </p>
            </div>
            
            {/* Stat Badges */}
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <FaClock className="text-amber-600" /> Pending: {stats.pending}
              </div>
              <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                Total Queries: {stats.total}
              </div>
            </div>
          </header>

          {/* Controls Bar: Search + Status Filter Pills */}
          <div className="card p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <FaSearch className="text-xs" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, PRN, email..."
                className="input-field !py-2 pl-9 text-xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  statusFilter === "all"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({queries.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${
                  statusFilter === "pending"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <FaClock className="text-[10px]" /> Pending ({queries.filter(q => q.status === "pending").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("resolved")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1 ${
                  statusFilter === "resolved"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <FaCheckCircle className="text-[10px]" /> Resolved ({queries.filter(q => q.status === "resolved").length})
              </button>
            </div>
          </div>

          {/* Queries Table */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <Spinner label="Loading contact queries..." />
              </div>
            ) : filteredQueries.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FaCommentDots className="mx-auto text-4xl text-slate-300 mb-3" />
                <p className="font-semibold text-slate-700">No contact queries found.</p>
                <p className="text-xs text-slate-400 mt-1">Queries submitted by students will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Student Info</th>
                      <th className="px-4 py-3 font-semibold">Query Description</th>
                      <th className="px-4 py-3 font-semibold">Submitted Date</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQueries.map((q) => {
                      const isPending = q.status === "pending";
                      return (
                        <tr key={q.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-slate-900">{q.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{q.prn}</p>
                            <p className="text-xs text-primary-600 mt-0.5">{q.email}</p>
                          </td>
                          <td className="px-4 py-3.5 max-w-sm">
                            <p className="line-clamp-2 text-xs text-slate-700 leading-relaxed">
                              {q.description}
                            </p>
                            <button
                              type="button"
                              onClick={() => setSelectedQuery(q)}
                              className="text-[11px] font-bold text-primary-600 hover:underline mt-1 inline-block"
                            >
                              Read Full Query →
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                            {q.created_at ? new Date(q.created_at).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                <FaClock className="text-[10px]" /> Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                <FaCheckCircle className="text-[10px]" /> Resolved
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(q)}
                                disabled={updatingId === q.id}
                                className={`btn-secondary !px-2.5 !py-1 text-xs font-bold ${
                                  isPending
                                    ? "!bg-emerald-50 !text-emerald-700 !border-emerald-200 hover:!bg-emerald-100"
                                    : "!bg-amber-50 !text-amber-800 !border-amber-200 hover:!bg-amber-100"
                                }`}
                              >
                                {isPending ? "Mark Resolved" : "Mark Pending"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(q.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Delete Query"
                              >
                                <FaTrash className="text-xs" />
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
        </main>
      </div>

      {/* Query Details Modal */}
      {selectedQuery && (
        <Modal
          open={!!selectedQuery}
          onClose={() => setSelectedQuery(null)}
          title={`Query from ${selectedQuery.name}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
              <div>
                <p className="text-slate-400 font-semibold uppercase">PRN</p>
                <p className="font-bold text-slate-800 font-mono">{selectedQuery.prn}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Email</p>
                <p className="font-bold text-primary-600">{selectedQuery.email}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Status</p>
                <p className={`font-bold ${selectedQuery.status === "pending" ? "text-amber-600" : "text-emerald-600"}`}>
                  {selectedQuery.status.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Submitted</p>
                <p className="font-medium text-slate-700">
                  {selectedQuery.created_at ? new Date(selectedQuery.created_at).toLocaleString() : "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description / Message</p>
              <div className="bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedQuery.description}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  handleToggleStatus(selectedQuery);
                  setSelectedQuery((prev) => prev ? { ...prev, status: prev.status === "pending" ? "resolved" : "pending" } : null);
                }}
                className={`btn-primary !py-2 !px-4 text-xs ${
                  selectedQuery.status === "pending" ? "!bg-emerald-600 hover:!bg-emerald-700" : "!bg-amber-600 hover:!bg-amber-700"
                }`}
              >
                {selectedQuery.status === "pending" ? "Mark as Resolved" : "Mark as Pending"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
