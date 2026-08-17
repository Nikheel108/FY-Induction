import { useEffect, useState } from 'react';
import { FaFileExcel, FaDownload } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Spinner from '../components/Spinner';
import { fetchAttendance, adminMarkAttendance, adminDemarkAttendance } from '../services/attendanceService';
import { fetchEventSessions } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { FaTrash, FaCheck } from 'react-icons/fa';

export default function AdminAttendance() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sessionsList, setSessionsList] = useState([]);
  const [filters, setFilters] = useState({ date: '', prn: '', student_name: '', event_session_id: '' });
  const [page, setPage] = useState(1);
  const [markingPrn, setMarkingPrn] = useState('');
  const [markingSessionId, setMarkingSessionId] = useState('');
  const [isMarking, setIsMarking] = useState(false);
  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { ...filters, page, per_page: 20 };
      const res = await fetchAttendance(params);
      setRecords(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
      
      if (sessionsList.length === 0) {
        const sesRes = await fetchEventSessions();
        if (sesRes.success) setSessionsList(sesRes.sessions);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [page, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  // Export function
  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.prn) params.append('prn', filters.prn);
      if (filters.student_name) params.append('student_name', filters.student_name);
      if (filters.event_session_id) params.append('event_session_id', filters.event_session_id);

      const baseURL = import.meta.env.VITE_API_URL || '/api';
      const url = `${baseURL}/admin/attendance/export/${format}?${params.toString()}`;
      const token = localStorage.getItem('admin_token');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `attendance_export.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('Export successful');
    } catch (err) {
      toast.error(err.message || 'Export failed');
    }
  };

  const handleManualMark = async (e) => {
    e.preventDefault();
    if (!markingPrn || !markingSessionId) {
      toast.error('Please enter a PRN and select a session');
      return;
    }
    
    setIsMarking(true);
    try {
      await adminMarkAttendance(markingPrn, markingSessionId);
      toast.success('Attendance marked successfully');
      setMarkingPrn('');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to mark attendance');
    } finally {
      setIsMarking(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to demark this attendance record?')) return;
    try {
      await adminDemarkAttendance(id);
      toast.success('Attendance demarked successfully');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to demark attendance');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3">
          <h1 className="text-lg font-extrabold text-slate-900">Attendance Management</h1>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          <div className="card p-4 sm:p-5">
            {/* Filters and Export buttons */}
            <div className="border-b border-slate-200 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <input
                  type="text"
                  name="student_name"
                  className="input-field w-full"
                  placeholder="Student name"
                  value={filters.student_name}
                  onChange={handleFilterChange}
                />
                <select
                  name="event_session_id"
                  className="input-field w-full"
                  value={filters.event_session_id}
                  onChange={handleFilterChange}
                >
                  <option value="">All Sessions</option>
                  {sessionsList.map(s => (
                    <option key={s.id} value={s.id}>{s.title} ({new Date(s.start_time).toLocaleDateString()})</option>
                  ))}
                </select>
                <input
                  type="date"
                  name="date"
                  className="input-field w-full"
                  value={filters.date}
                  onChange={handleFilterChange}
                />
                <input
                  type="text"
                  name="prn"
                  className="input-field w-full"
                  placeholder="PRN"
                  value={filters.prn}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <button
                  type="button"
                  className="btn-secondary !px-4 !py-2 w-full sm:w-auto justify-center"
                  onClick={() => {
                    setFilters({ date: '', prn: '', student_name: '', event_session_id: '' });
                    setPage(1);
                  }}
                >
                  Reset Filters
                </button>

                {/* Export buttons */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-2 text-emerald-700 w-full sm:w-auto justify-center"
                    onClick={() => handleExport('excel')}
                  >
                    <FaFileExcel /> Excel
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-2 w-full sm:w-auto justify-center"
                    onClick={() => handleExport('csv')}
                  >
                    <FaDownload /> CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Manual Marking Form */}
            <form onSubmit={handleManualMark} className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-end gap-4 mb-6">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-700 mb-1">Mark Attendance Manually</label>
                <select
                  className="input-field w-full"
                  value={markingSessionId}
                  onChange={(e) => setMarkingSessionId(e.target.value)}
                  required
                >
                  <option value="">Select Session...</option>
                  {sessionsList.map(s => (
                    <option key={s.id} value={s.id}>{s.title} ({new Date(s.start_time).toLocaleDateString()})</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="Enter Student PRN"
                  className="input-field w-full"
                  value={markingPrn}
                  onChange={(e) => setMarkingPrn(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isMarking}
                className="btn-primary !px-6 !py-2 w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <FaCheck /> {isMarking ? 'Marking...' : 'Mark Present'}
              </button>
            </form>

            {/* Table */}
            {loading ? (
              <Spinner label="Loading attendance..." />
            ) : records.length === 0 ? (
              <div className="py-16 text-center text-slate-500">No attendance records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">PRN</th>
                      <th className="px-3 py-2">Department</th>
                      <th className="px-3 py-2">Event Session</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">IP</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">User Agent</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(rec => (
                      <tr key={rec.id} className="border-b border-slate-100 group">
                        <td className="px-3 py-2 font-medium">{rec.student_name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{rec.prn}</td>
                        <td className="px-3 py-2">{rec.department}</td>
                        <td className="px-3 py-2 max-w-[150px] truncate" title={rec.event_session_title}>{rec.event_session_title}</td>
                        <td className="px-3 py-2">{rec.date}</td>
                        <td className="px-3 py-2 font-mono text-xs">{rec.session.ip}</td>
                        <td className="px-3 py-2">{rec.session.location || '—'}</td>
                        <td className="px-3 py-2 max-w-xs truncate text-xs text-slate-500">
                          {rec.session.user_agent || '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleDelete(rec.id)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Demark Attendance"
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

            {/* Pagination */}
            {!loading && pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-3 mt-3">
                <p className="text-xs text-slate-500">
                  Showing {records.length} of {total} records
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-1.5"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Prev
                  </button>
                  <span className="text-sm font-medium text-slate-600">
                    Page {page} / {pages}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-1.5"
                    disabled={page >= pages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}