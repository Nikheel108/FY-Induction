import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaDownload,
  FaEdit,
  FaEnvelope,
  FaMailBulk,
  FaTrash,
} from "react-icons/fa";

import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import Sidebar from "../components/Sidebar";
import Spinner from "../components/Spinner";
import StudentForm from "../components/StudentForm";
import { useToast } from "../context/ToastContext";
import {
  deleteStudent,
  downloadReceipt,
  getMailLogs,
  getStudent,
  resendEmail,
  updateStudent,
} from "../services/studentService";

/**
 * Detailed view of a single student with all recorded information, mail logs
 * and management actions (edit / delete / resend / download receipt).
 */
export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [student, setStudent] = useState(null);
  const [mailLogs, setMailLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resending, setResending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getStudent(id);
      setStudent(res.student);
      try {
        const logs = await getMailLogs(id);
        setMailLogs(logs.mail_logs);
      } catch {
        setMailLogs([]);
      }
    } catch (error) {
      toast.error(error.message);
      navigate("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEditSave = async (data) => {
    setEditSaving(true);
    try {
      await updateStudent(id, data);
      toast.success("Student updated successfully.");
      setEditing(false);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteStudent(id);
      toast.success("Student deleted successfully.");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error(error.message);
      setDeleting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const result = await resendEmail(id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResending(false);
    }
  };

  const handleReceipt = async () => {
    try {
      const blob = await downloadReceipt(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `receipt_${student.registration_id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Receipt downloaded.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center">
          <Spinner label="Loading student details..." />
        </div>
      </div>
    );
  }

  if (!student) return null;

  const Info = ({ label, value }) => (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">{value || "—"}</p>
    </div>
  );

  const section = (title, children) => (
    <div className="card p-4 sm:p-6">
      <h2 className="section-title mb-5">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 border-b border-slate-200 bg-white px-4 py-3">
          <Link to="/admin/dashboard" className="btn-secondary w-full sm:w-auto !px-4 !py-2 justify-center">
            <FaArrowLeft /> Back to Dashboard
          </Link>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary flex-1 sm:flex-none justify-center !px-3 !py-2" onClick={handleReceipt}>
              <FaDownload /> Receipt
            </button>
            <button type="button" className="btn-secondary flex-1 sm:flex-none justify-center !px-3 !py-2" onClick={() => setEditing(true)}>
              <FaEdit /> Edit
            </button>
            <button type="button" className="btn-secondary flex-1 sm:flex-none justify-center !px-3 !py-2 text-blue-700" onClick={handleResend} disabled={resending}>
              <FaMailBulk /> {resending ? "Sending..." : "Resend Email"}
            </button>
            <button type="button" className="btn-danger flex-1 sm:flex-none justify-center !px-3 !py-2" onClick={() => setConfirmDelete(true)}>
              <FaTrash /> Delete
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 sm:p-6">
          {/* Identity banner */}
          <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
            {student.photo_base64 ? (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200">
                <img src={student.photo_base64} alt="Student" className="h-full w-full object-cover" />
              </div>
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-700 text-2xl font-extrabold text-white">
                {student.full_name?.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold text-slate-900">{student.full_name}</h1>
              <p className="text-sm text-slate-500">
                {student.prn} · {student.department}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                {student.registration_id}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 px-4 py-2">
                <p className="text-lg font-extrabold text-slate-800">{student.student_phone}</p>
                <p className="text-xs text-slate-400">Mobile</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-2">
                <p className="text-lg font-extrabold text-slate-800">{student.parent_name}</p>
                <p className="text-xs text-slate-400">Parent</p>
              </div>
            </div>
          </div>

          {section("Student Information", (
            <>
              <Info label="Full Name" value={student.full_name} />
              <Info label="PRN" value={student.prn} />
              <Info label="Department" value={student.department} />
              <Info label="Student Email" value={student.student_email} />
              <Info label="Mobile" value={student.student_phone} />
              <Info label="Registered On" value={student.created_at ? new Date(student.created_at).toLocaleString() : "—"} />
            </>
          ))}

          {section("Parent Information", (
            <>
              <Info label="Parent Name" value={student.parent_name} />
              <Info label="Parent Email" value={student.parent_email} />
              <Info label="Parent Mobile" value={student.parent_phone} />
            </>
          ))}

          {/* Mail logs */}
          <div className="card p-4 sm:p-6">
            <h2 className="section-title mb-5">Email Logs</h2>
            {mailLogs.length === 0 ? (
              <p className="text-sm text-slate-400">No emails recorded for this student yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Sent At</th>
                      <th className="px-3 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mailLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium capitalize text-slate-700">{log.mail_type}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${log.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            <FaEnvelope /> {log.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          {log.sent_time ? new Date(log.sent_time).toLocaleString() : "—"}
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 text-xs text-slate-500">{log.error_message || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${student.full_name}`} wide>
        <StudentForm
          key={student.id}
          defaultValues={student}
          onSubmit={handleEditSave}
          submitLabel="Save Changes"
          loading={editSaving}
        />
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Student"
        message={`Are you sure you want to delete ${student.full_name}? All related email logs will also be removed.`}
      />
    </div>
  );
}
