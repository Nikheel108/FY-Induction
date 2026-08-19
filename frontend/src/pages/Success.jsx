import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaDownload, FaEnvelope, FaHome, FaLock, FaKey, FaUserGraduate } from "react-icons/fa";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Spinner from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import { downloadReceipt } from "../services/studentService";
import { studentLogin } from "../services/studentAuthService";

/**
 * Success page shown after a completed registration.
 * Displays the registration ID, receipt download, and prompts the student
 * for User ID (PRN) and 6-character password to log in.
 */
export default function Success() {
  const [registration, setRegistration] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [loginPrn, setLoginPrn] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("last_registration");
      if (raw) {
        const parsed = JSON.parse(raw);
        setRegistration(parsed);
        if (parsed?.student?.prn) {
          setLoginPrn(parsed.student.prn);
        }
      }
    } catch {
      setRegistration(null);
    }
  }, []);

  const handleDownloadReceipt = useCallback(async () => {
    if (!registration?.student?.id) return;
    setDownloading(true);
    try {
      const blob = await downloadReceipt(registration.student.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `receipt_${registration.student.registration_id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Receipt downloaded.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDownloading(false);
    }
  }, [registration, toast]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginPrn.trim() || !loginPassword.trim()) {
      toast.error("Please enter both User ID (PRN) and Password.");
      return;
    }

    setLoggingIn(true);
    try {
      const res = await studentLogin(loginPrn.trim(), loginPassword.trim());
      localStorage.setItem("student_token", res.token);
      localStorage.setItem("student_profile", JSON.stringify(res.student));

      toast.success("Login successful! Welcome to your dashboard.");
      navigate("/student/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Invalid credentials.");
    } finally {
      setLoggingIn(false);
    }
  };

  const student = registration?.student;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Navbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-8 sm:py-12">
        <div className="card w-full p-6 text-center sm:p-10 shadow-xl">
          <span className="animate-pop mx-auto grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <FaCheckCircle className="text-4xl sm:text-5xl" />
          </span>

          <h1 className="animate-fade-up mt-6 text-xl font-extrabold text-slate-900 sm:text-3xl">
            Registration Successful!
          </h1>
          <p className="animate-fade-up mt-2 text-sm text-slate-500">
            Your registration is complete. Please log in using the credentials sent to your email.
          </p>

          {student ? (
            <div className="animate-fade-up mt-8 space-y-6 text-left">
              {/* Registration ID Badge */}
              <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">
                    Your Registration ID
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-primary-800 font-mono">
                    {student.registration_id}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary !py-2 !px-3 text-xs"
                  onClick={handleDownloadReceipt}
                  disabled={downloading}
                >
                  {downloading ? <Spinner className="!py-0 !text-primary-700" label="" /> : <FaDownload />}
                  {downloading ? "Generating..." : "Download Receipt"}
                </button>
              </div>

              {/* Student Summary */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/60">
                  <p className="text-xs text-slate-400">Student Name</p>
                  <p className="font-semibold text-slate-800">{student.full_name}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/60">
                  <p className="text-xs text-slate-400">Department</p>
                  <p className="font-semibold text-slate-800">{student.department}</p>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 mb-1">
                  <FaEnvelope className="text-amber-600" /> Portal Login Credentials Notice
                </p>
                <p className="leading-relaxed">
                  Your login credentials have been included in your <strong>Registration Receipt</strong> (download above) and will also be delivered to <strong>{student.student_email}</strong> in your Welcome Email.
                  <br /><br />
                  <span className="font-semibold">Note:</span> If the email is not visible in your inbox, please check your spam or junk folder.
                </p>
              </div>

              {/* Prominent Login Form */}
              <div className="rounded-xl border-2 border-primary-200 bg-white p-5 sm:p-6 shadow-lg space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <FaLock className="text-primary-600" /> Log In to Access Portal
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your User ID (PRN) and password to view your schedule and mark attendance.
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      User ID (PRN) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <FaUserGraduate className="text-xs" />
                      </span>
                      <input
                        type="text"
                        value={loginPrn}
                        onChange={(e) => setLoginPrn(e.target.value)}
                        placeholder="Enter your PRN"
                        className="input-field pl-9 !py-2 text-sm font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <FaKey className="text-xs" />
                      </span>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="input-field pl-9 !py-2 text-sm font-medium"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="btn-primary w-full justify-center !py-3 text-base font-bold shadow-md"
                  >
                    {loggingIn ? "Logging in..." : "Login to Student Portal"}
                  </button>
                </form>
              </div>

              <div className="text-center pt-2">
                <Link to="/" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-primary-600">
                  <FaHome className="mr-1.5" /> Back to Home
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-8 text-sm text-slate-500">
              No recent registration found.{" "}
              <Link to="/register" className="font-semibold text-primary-700 underline">
                Register here
              </Link>
              .
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
