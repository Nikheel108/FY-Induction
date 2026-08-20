import { useEffect, useState } from "react";
import { getHighlights } from "../services/highlightService";
import { Link } from "react-router-dom";
import { FaHome, FaImages } from "react-icons/fa";

export default function Highlights() {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const res = await getHighlights();
        setHighlights(res.highlights || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHighlights();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-100 text-primary-700">
              <FaImages />
            </span>
            <span className="text-lg font-bold text-slate-900 hidden sm:block">Event Highlights</span>
          </div>
          <Link to="/" className="btn-secondary !py-2 !px-4 text-sm font-medium flex items-center gap-2">
            <FaHome /> Back to Portal
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-fade-up">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Induction Highlights</h1>
          <p className="mt-4 text-lg text-slate-600">
            Catch a glimpse of the events, sessions, and memories from the First Year Induction Program.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600"></div>
          </div>
        ) : highlights.length === 0 ? (
          <div className="text-center py-20">
            <FaImages className="mx-auto text-5xl text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No highlights yet</h3>
            <p className="text-slate-500 mt-1">Check back later for photos and updates!</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {highlights.map((h) => (
              <div key={h.id} className="break-inside-avoid card overflow-hidden group">
                <div className="relative overflow-hidden bg-slate-200">
                  <img
                    src={h.image_base64}
                    alt={h.title}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{h.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                    {h.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-4">
                    {new Date(h.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
