import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaClock,
  FaPaperPlane,
  FaUser,
  FaIdCard,
  FaCommentDots,
  FaCheckCircle,
  FaHeadset
} from "react-icons/fa";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useToast } from "../context/ToastContext";
import { submitContactQuery } from "../services/studentService";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    prn: "",
    email: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Auto-fill form if student profile exists in localStorage
    const profileStr = localStorage.getItem("student_profile");
    if (profileStr) {
      try {
        const parsed = JSON.parse(profileStr);
        setFormData((prev) => ({
          ...prev,
          name: parsed.full_name || "",
          prn: parsed.prn || "",
          email: parsed.student_email || "",
        }));
      } catch (e) {
        // ignore JSON parse error
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.prn.trim() || !formData.email.trim() || !formData.description.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await submitContactQuery(formData);
      toast.success(res.message || "Query submitted successfully!");
      setSubmitted(true);
      setFormData((prev) => ({ ...prev, description: "" }));
    } catch (err) {
      toast.error(err.message || "Failed to submit message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 animate-fade-up">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary-100 text-primary-700 shadow-inner">
            <FaHeadset className="text-2xl" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Contact & Support</h1>
          <p className="mt-3 text-base text-slate-600">
            Have questions regarding the induction program, schedule, or reporting? Get in touch with our support committee below.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left Column: Contact Information (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl"></div>
              
              <h2 className="text-xl font-bold mb-6 text-white border-b border-slate-700 pb-3 flex items-center gap-2">
                <FaMapMarkerAlt className="text-primary-400" /> Institution Details
              </h2>

              <ul className="space-y-5 text-slate-300 text-sm">
                <li className="flex items-start gap-3.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-primary-400 mt-0.5">
                    <FaMapMarkerAlt />
                  </span>
                  <div>
                    <strong className="block text-white font-semibold mb-0.5">Campus Address</strong>
                    MIT Academy of Engineering, Dehu Phata, Alandi, Pune - 412105, Maharashtra, India.
                  </div>
                </li>

                <li className="flex items-start gap-3.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-primary-400 mt-0.5">
                    <FaPhoneAlt />
                  </span>
                  <div>
                    <strong className="block text-white font-semibold mb-0.5">Induction Helpline</strong>
                    <p>+91-82178-59747</p>
                    <p>+91-87932-18900</p>
                  </div>
                </li>

                <li className="flex items-start gap-3.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-primary-400 mt-0.5">
                    <FaEnvelope />
                  </span>
                  <div>
                    <strong className="block text-white font-semibold mb-0.5">Official Email</strong>
                    fyinduction2627@gmail.com
                  </div>
                </li>

                <li className="flex items-start gap-3.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-primary-400 mt-0.5">
                    <FaClock />
                  </span>
                  <div>
                    <strong className="block text-white font-semibold mb-0.5">Office Hours</strong>
                    Monday – Friday: 9:00 AM – 5:00 PM
                  </div>
                </li>
              </ul>
            </div>

            {/* Information Pill */}
            <div className="card p-5 bg-primary-50 border-primary-100 text-primary-900 text-sm">
              <h3 className="font-bold mb-1 flex items-center gap-1.5 text-primary-950">
                💡 Need Quick Information?
              </h3>
              <p className="text-primary-800 text-xs leading-relaxed">
                Log in to your <Link to="/student-login" className="underline font-bold hover:text-primary-600">Student Dashboard</Link> to download your registration receipt, view event schedules, or mark active attendance.
              </p>
            </div>
          </div>

          {/* Right Column: Contact Query Form (3 cols) */}
          <div className="lg:col-span-3">
            <div className="card p-6 sm:p-8 shadow-xl border-t-4 border-t-primary-600">
              <div className="mb-6">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <FaCommentDots className="text-primary-600" /> Send Us a Message
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Fill out the form below. Our induction committee will review your query and get back to your email.
                </p>
              </div>

              {submitted ? (
                <div className="py-10 text-center space-y-4 animate-fade-in">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                    <FaCheckCircle className="text-4xl" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Message Received!</h3>
                  <p className="text-slate-600 text-sm max-w-md mx-auto">
                    Thank you for reaching out. Your query has been successfully submitted to the admin committee.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="btn-primary !py-2 !px-6 text-sm"
                  >
                    Submit Another Query
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <FaUser className="text-xs" />
                      </span>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className="input-field pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        PRN Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <FaIdCard className="text-xs" />
                        </span>
                        <input
                          type="text"
                          name="prn"
                          value={formData.prn}
                          onChange={handleChange}
                          placeholder="e.g. PRN260101"
                          className="input-field pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <FaEnvelope className="text-xs" />
                        </span>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="student@example.com"
                          className="input-field pl-9"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Query Description / Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      rows="5"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Please describe your query or problem in detail..."
                      className="input-field resize-y"
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full justify-center !py-3 text-base"
                  >
                    {loading ? (
                      "Submitting..."
                    ) : (
                      <>
                        <FaPaperPlane className="mr-2 text-sm" /> Submit Query
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
