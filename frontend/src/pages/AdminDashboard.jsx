import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBuilding,
  FaDownload,
  FaEdit,
  FaEye,
  FaFileExcel,
  FaFilter,
  FaHome,
  FaMailBulk,
  FaSearch,
  FaTrash,
  FaUsers,
} from "react-icons/fa";

import ConfirmDialog from "../components/ConfirmDialog";
import DepartmentChart from "../components/DepartmentChart";
import Modal from "../components/Modal";
import Sidebar from "../components/Sidebar";
import Spinner from "../components/Spinner";
import StatCard from "../components/StatCard";
import StudentForm from "../components/StudentForm";
import { useToast } from "../context/ToastContext";
import {
  deleteStudent,
  getStatistics,
  getStudents,
  resendEmail,
  updateStudent,
} from "../services/studentService";
import { DEPARTMENTS } from "../constants";
import { exportCSV, exportExcel } from "../utils/exporters";

const PER_PAGE = 10;

/**
 * Admin dashboard: stats, department chart, filters, searchable student table,
 * edit/delete/resend actions and CSV/Excel export.
 */
export default function AdminDashboard() {
  const toast = useToast();

  // --- Data state -----------------------------------------------------------
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // --- Filter state -----------------------------------------------------------
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);

  // --- UI state ---------------------------------------------------------------
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  const searchTimer = useRef(null);

  // Debounce the search box so we query only after the user stops typing.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // Load statistics once.
  useEffect(() => {
    getStatistics().then((res) => setStats(res.statistics)).catch(() => setStats(null));
  }, []);

  // Load the student table whenever filters / pagination change.
  useEffect(() => {
    setLoading(true);
    getStudents({
      page,
      per_page: PER_PAGE,
      search: debouncedSearch || undefined,
      department: department || undefined,
    })
      .then((res) => {
        setStudents(res.data.items);
        setTotal(res.data.total);
        setPages(Math.max(1, res.data.pages));
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, department, toast]);

  const allStudents = useMemo(
    () =>
      students.length < total
        ? null // not all rows loaded - export needs a full fetch
        : students,
    [students, total]
  );

  // --- Handlers ---------------------------------------------------------------

  const refresh = useCallback(() => {
    getStudents({ page, per_page: PER_PAGE, search: debouncedSearch || undefined })
      .then((res) => {
        setStudents(res.data.items);
        setTotal(res.data.total);
      })
      .catch(() => {});
  }, [page, debouncedSearch]);

  const handleResetFilters = () => {
    setSearch("");
    setDepartment("");
    setPage(1);
  };

  const handleEditSave = async (data) => {
    if (!editStudent) return;
    setEditSaving(true);
    try {
      await updateStudent(editStudent.id, data);
      toast.success("Student updated successfully.");
      setEditStudent(null);
      refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
      toast.success("Student deleted successfully.");
      setDeleteTarget(null);
      if (students.length === 1 && page > 1) setPage((p) => p - 1);
      else refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleResend = async (student) => {
    setResendingId(student.id);
    try {
      const result = await resendEmail(student.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResendingId(null);
    }
  };

  const handleExport = async (type) => {
    try {
      let rows = allStudents;
      if (!rows) {
        toast.info("Fetching all records for export...");
        const res = await getStudents({ per_page: 500, search: debouncedSearch || undefined, department: department || undefined });
        rows = res.data.items;
      }
      if (!rows.length) {
        toast.info("No records to export.");
        return;
      }
      if (type === "excel") exportExcel(rows);
      else exportCSV(rows);
      toast.success(`${type === "excel" ? "Excel" : "CSV"} exported successfully.`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // --- Render ------------------------------------------------------------------

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
            <h1 className="text-lg font-extrabold text-slate-900">Dashboard</h1>
          </div>
          <Link to="/" className="btn-secondary !px-4 !py-2">
            <FaHome /> <span className="hidden sm:inline">Portal</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6">
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={FaUsers} label="Total Registrations" value={stats?.total ?? "—"} accent="primary" />
            <StatCard icon={FaBuilding} label="Departments" value={stats?.by_department?.length ?? "—"} accent="violet" />
            <StatCard icon={FaUsers} label="Students" value={stats?.total ?? "—"} accent="green" />
            <StatCard icon={FaBuilding} label="Programs" value="1" accent="amber" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Department chart */}
            <div className="card p-5 lg:col-span-1">
              <h2 className="section-title mb-4">Department-wise Count</h2>
              <DepartmentChart data={stats?.by_department ?? []} />
            </div>

            {/* Filters + table */}
            <div className="card lg:col-span-2">
              <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-5">
                <div className="relative min-w-[200px] flex-1">
                  <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    className="input-field !pl-10"
                    placeholder="Search name, PRN, email or phone..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <FaFilter className="hidden text-slate-400 sm:block" />
                  <select className="input-field !w-auto" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
                    <option value="">All Departments</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {(search || department) && (
                    <button type="button" className="btn-secondary !px-3 !py-2" onClick={handleResetFilters}>
                      Reset
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button type="button" className="btn-secondary !px-3 !py-2 text-emerald-700" onClick={() => handleExport("excel")}>
                    <FaFileExcel /> <span className="hidden md:inline">Excel</span>
                  </button>
                  <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => handleExport("csv")}>
                    <FaDownload /> <span className="hidden md:inline">CSV</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto p-2">
                {loading ? (
                  <Spinner label="Loading students..." />
                ) : students.length === 0 ? (
                  <div className="py-16 text-center">
                    <FaUsers className="mx-auto text-4xl text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      {search || department
                        ? "No students match your filters."
                        : "No registrations yet."}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                         <th className="px-3 py-3">Registration ID</th>
                        <th className="px-3 py-3">Student</th>
                        <th className="px-3 py-3">Department</th>
                        <th className="px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                          <td className="px-3 py-3 font-mono text-xs text-primary-700">{student.registration_id}</td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-slate-800">{student.full_name}</p>
                            <p className="text-xs text-slate-400">{student.prn}</p>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {student.department}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/admin/student/${student.id}`}
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-primary-50 hover:text-primary-700"
                                title="View details"
                              >
                                <FaEye />
                              </Link>
                              <button
                                type="button"
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-600"
                                title="Edit"
                                onClick={() => setEditStudent(student)}
                              >
                                <FaEdit />
                              </button>
                              <button
                                type="button"
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                                title="Resend email"
                                disabled={resendingId === student.id}
                                onClick={() => handleResend(student)}
                              >
                                {resendingId === student.id ? <Spinner className="!py-0" label="" /> : <FaMailBulk />}
                              </button>
                              <button
                                type="button"
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                title="Delete"
                                onClick={() => setDeleteTarget(student)}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {!loading && pages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
                  <p className="text-xs text-slate-500">
                    Showing {students.length} of {total} students
                  </p>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-secondary !px-3 !py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Prev
                    </button>
                    <span className="text-sm font-medium text-slate-600">
                      Page {page} / {pages}
                    </span>
                    <button type="button" className="btn-secondary !px-3 !py-1.5" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Edit modal */}
      <Modal open={Boolean(editStudent)} onClose={() => setEditStudent(null)} title="Edit Student" wide>
        {editStudent && (
          <StudentForm
            key={editStudent.id}
            defaultValues={editStudent}
            onSubmit={handleEditSave}
            submitLabel="Save Changes"
            loading={editSaving}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Student"
        message={`Are you sure you want to delete ${deleteTarget?.full_name ?? "this student"}? This action cannot be undone.`}
      />
    </div>
  );
}
