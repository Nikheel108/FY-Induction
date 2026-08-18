import { useEffect, useState } from "react";
import { FaUpload, FaFileCsv, FaFileExcel, FaUsers, FaTrash, FaEdit, FaCheckCircle, FaTimesCircle, FaHome, FaSave, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";

import { useToast } from "../context/ToastContext";
import { getValidPrns, uploadPrnFile, deleteValidPrn, editValidPrn, uploadPrns } from "../services/adminService";
import Sidebar from "../components/Sidebar";
import Spinner from "../components/Spinner";

export default function AdminUploadStudents() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prns, setPrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [textInput, setTextInput] = useState("");
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ prn: "", expected_name: "", expected_department: "" });

  const toast = useToast();

  const loadPrns = async () => {
    try {
      setLoading(true);
      const res = await getValidPrns();
      setPrns(res.valid_prns || []);
    } catch (err) {
      toast.error("Failed to load PRNs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrns();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file first.");
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      setUploading(true);
      const res = await uploadPrnFile(formData);
      toast.success(res.message);
      setFile(null);
      document.getElementById('file-upload').value = '';
      loadPrns();
    } catch (err) {
      toast.error(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleTextUpload = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    try {
      setUploading(true);
      const prnsArray = textInput.split(/[\n,]+/).map(p => p.trim()).filter(p => p);
      const res = await uploadPrns(prnsArray);
      toast.success(res.message);
      setTextInput("");
      loadPrns();
    } catch (error) {
      toast.error(error.message || "Failed to upload PRNs");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this PRN from the whitelist?")) return;
    try {
      await deleteValidPrn(id);
      toast.success("PRN deleted successfully!");
      loadPrns();
    } catch (err) {
      toast.error(err.message || "Failed to delete PRN.");
    }
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setEditForm({
      prn: p.prn,
      expected_name: p.expected_name || "",
      expected_department: p.expected_department || ""
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      await editValidPrn(id, editForm);
      toast.success("PRN updated successfully!");
      setEditingId(null);
      loadPrns();
    } catch (err) {
      toast.error(err.message || "Failed to update PRN.");
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
            <h1 className="text-lg font-extrabold text-slate-900">Upload Students</h1>
          </div>
          <Link to="/" className="btn-secondary !px-4 !py-2">
            <FaHome /> <span className="hidden sm:inline">Portal</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 animate-fade-up">
          <header>
            <p className="mt-1 text-sm text-slate-500">
              Upload student PRNs using Excel, CSV, or raw text. You can also specify the Expected Name and Department in the files to show them here.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* File Upload Card */}
            <div className="card p-5 border-t-4 border-t-primary-500">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FaUpload className="text-primary-600" /> Upload File
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Upload a CSV or Excel (.xlsx) file. The system will look for columns named <strong>PRN</strong>, <strong>Name</strong>, and <strong>Department</strong>.
              </p>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary-50 file:text-primary-700
                      hover:file:bg-primary-100 cursor-pointer"
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="btn-primary w-full justify-center"
                >
                  {uploading ? "Uploading..." : "Upload File"}
                </button>
              </form>
            </div>

            {/* Text Upload Card */}
            <div className="card p-5">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FaUsers className="text-primary-600" /> Upload Raw PRNs
              </h2>
              <form onSubmit={handleTextUpload} className="space-y-4">
                <textarea
                  className="input-field w-full h-24 font-mono text-sm"
                  placeholder="PRN1&#10;PRN2&#10;PRN3"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-secondary w-full justify-center"
                >
                  {uploading ? "Uploading..." : "Upload PRNs text"}
                </button>
              </form>
            </div>
          </div>

          {/* List Card */}
          <div className="card p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FaUsers className="text-primary-600" /> Registered & Expected Students
              </h2>
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md font-bold">Total: {prns.length}</span>
            </div>
            
            {loading ? (
              <Spinner label="Loading PRNs..." />
            ) : prns.length === 0 ? (
              <p className="text-sm text-slate-500">No students uploaded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold rounded-tl-lg">PRN</th>
                      <th className="px-4 py-3 font-semibold">Expected Details</th>
                      <th className="px-4 py-3 font-semibold text-center">Status</th>
                      <th className="px-4 py-3 font-semibold text-center rounded-tr-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prns.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-mono font-medium text-slate-800">
                          {editingId === p.id ? (
                            <input 
                              type="text" 
                              className="input-field !py-1 !px-2 text-sm w-32" 
                              value={editForm.prn} 
                              onChange={e => setEditForm({...editForm, prn: e.target.value})} 
                            />
                          ) : (
                            p.prn
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingId === p.id ? (
                            <div className="flex flex-col gap-1">
                              <input 
                                type="text" 
                                placeholder="Name"
                                className="input-field !py-1 !px-2 text-xs" 
                                value={editForm.expected_name} 
                                onChange={e => setEditForm({...editForm, expected_name: e.target.value})} 
                              />
                              <input 
                                type="text" 
                                placeholder="Department"
                                className="input-field !py-1 !px-2 text-xs" 
                                value={editForm.expected_department} 
                                onChange={e => setEditForm({...editForm, expected_department: e.target.value})} 
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              {p.expected_name ? (
                                <span className="font-semibold text-slate-800">{p.expected_name}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                              {p.expected_department && <span className="text-xs text-slate-500">{p.expected_department}</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.registered ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold">
                                <FaCheckCircle /> Registered
                              </span>
                              <span className="text-[10px] text-slate-500 max-w-[120px] truncate" title={p.student_name}>as {p.student_name}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-xs font-bold">
                              <FaTimesCircle /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingId === p.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleSaveEdit(p.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Save">
                                <FaSave />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition" title="Cancel">
                                <FaTimes />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleEdit(p)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition" title="Edit PRN">
                                <FaEdit />
                              </button>
                              <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete PRN">
                                <FaTrash />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
