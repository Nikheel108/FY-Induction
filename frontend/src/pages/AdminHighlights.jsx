import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaTrash, FaImage, FaDownload, FaMagic } from "react-icons/fa";
import Sidebar from "../components/Sidebar";
import { useToast } from "../context/ToastContext";
import { getHighlights, createHighlight, deleteHighlight, exportHighlightsPDF, generateHighlightDescription } from "../services/highlightService";
import { Link } from "react-router-dom";
import { FaHome } from "react-icons/fa";

export default function AdminHighlights() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_base64: "",
    resource_speaker: ""
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState("");

  const handleGenerateAIDescription = async () => {
    if (!formData.title) {
      toast.error("Please enter a Title first to generate AI description.");
      return;
    }
    setGeneratingAI(true);
    try {
      toast.info("Generating description via Gemini AI...");
      const res = await generateHighlightDescription({
        title: formData.title,
        resource_speaker: formData.resource_speaker,
        notes: formData.description,
      });
      if (res.success && res.description) {
        setFormData((prev) => ({ ...prev, description: res.description }));
        toast.success("AI description generated!");
      }
    } catch (err) {
      toast.error(err.message || "Failed to generate description.");
    } finally {
      setGeneratingAI(false);
    }
  };

  const uniqueSpeakers = useMemo(() => {
    const speakers = new Set();
    highlights.forEach(h => {
      if (h.resource_speaker && h.resource_speaker !== "-") {
        speakers.add(h.resource_speaker);
      }
    });
    return Array.from(speakers).sort();
  }, [highlights]);

  const loadHighlights = async () => {
    try {
      setLoading(true);
      const res = await getHighlights();
      setHighlights(res.highlights || []);
    } catch (err) {
      toast.error("Failed to load highlights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHighlights();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setFormData({ ...formData, image_base64: base64 });
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.image_base64) {
      toast.error("Please fill in all fields and select an image.");
      return;
    }

    try {
      setSubmitting(true);
      await createHighlight({
        ...formData,
        resource_speaker: formData.resource_speaker || "-"
      });
      toast.success("Highlight published!");
      setFormData({ title: "", description: "", image_base64: "", resource_speaker: "" });
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadHighlights();
    } catch (err) {
      toast.error(err.message || "Failed to publish highlight.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteHighlight(id);
      toast.success("Highlight deleted.");
      setHighlights(highlights.filter(h => h.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete.");
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Generating PDF, please wait...");
      const blob = await exportHighlightsPDF(selectedSpeaker);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Activities_Report${selectedSpeaker ? `_${selectedSpeaker}` : ''}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('Export successful');
    } catch (err) {
      toast.error(err.message || 'Export failed');
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
            <h1 className="text-lg font-extrabold text-slate-900">Manage Highlights</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <select 
                className="input-field !py-2 !text-sm"
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
              >
                <option value="">All Speakers</option>
                {uniqueSpeakers.map(sp => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleExportPDF}
              className="btn-primary !px-4 !py-2 bg-slate-800 hover:bg-slate-900 flex items-center gap-2"
            >
              <FaDownload /> <span className="hidden sm:inline">Export PDF</span>
            </button>
            <Link to="/" className="btn-secondary !px-4 !py-2">
              <FaHome /> <span className="hidden sm:inline">Portal</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 animate-fade-up">
          <header>
            <p className="mt-1 text-sm text-slate-500">
              Upload photos and descriptions to display on the public Highlights page.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Upload Form */}
            <div className="card p-5 lg:col-span-1 h-fit">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FaPlus className="text-primary-600" /> New Highlight
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Image Upload Area */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Photo</label>
                  <div 
                    className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 transition relative overflow-hidden group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-md" />
                    ) : (
                      <div className="py-6">
                        <FaImage className="mx-auto text-3xl text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500 font-medium">Click to upload photo</span>
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
                  <label className="block text-sm font-semibold text-slate-700">Resource Speaker (Optional)</label>
                  <input
                    type="text"
                    name="resource_speaker"
                    value={formData.resource_speaker}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Smith"
                    className="input-field mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. AI Guest Lecture"
                    className="input-field mt-1"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-semibold text-slate-700">Description</label>
                    <button
                      type="button"
                      onClick={handleGenerateAIDescription}
                      disabled={generatingAI}
                      className="text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1 transition"
                      title="Generate ~60-word description using Gemini AI"
                    >
                      <FaMagic className="text-[10px]" />
                      {generatingAI ? "Generating..." : "✨ AI Generate"}
                    </button>
                  </div>
                  <textarea
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter description or click ✨ AI Generate to auto-synthesize with Gemini..."
                    className="input-field mt-1 resize-y"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full justify-center"
                >
                  {submitting ? "Publishing..." : "Publish Highlight"}
                </button>
              </form>
            </div>

            {/* Gallery / List */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FaImage className="text-primary-600" /> Existing Highlights
              </h2>
              
              {loading ? (
                <p className="text-sm text-slate-500">Loading highlights...</p>
              ) : highlights.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-slate-500">No highlights published yet.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {highlights.map((h) => (
                    <div key={h.id} className="card overflow-hidden group">
                      <div className="h-48 relative overflow-hidden bg-slate-200">
                        <img 
                          src={h.image_base64} 
                          alt={h.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => {
                              if (deleteConfirmId === h.id) {
                                handleDelete(h.id);
                              } else {
                                setDeleteConfirmId(h.id);
                                setTimeout(() => setDeleteConfirmId(null), 3000);
                              }
                            }}
                            className={`${deleteConfirmId === h.id ? 'bg-red-700 px-4' : 'bg-red-500 hover:bg-red-600 p-3'} text-white rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all flex items-center justify-center gap-2`}
                            title="Delete"
                          >
                            <FaTrash />
                            {deleteConfirmId === h.id && <span className="font-bold text-sm">Confirm?</span>}
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-900 line-clamp-1">{h.title}</h3>
                        {h.resource_speaker && h.resource_speaker !== "-" && (
                          <p className="text-xs font-semibold text-primary-600 mt-1 flex items-center gap-1">
                            👤 {h.resource_speaker}
                          </p>
                        )}
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{h.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
