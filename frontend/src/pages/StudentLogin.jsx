import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserGraduate, FaLock, FaHome, FaKey, FaArrowRight, FaUserPlus } from "react-icons/fa";
import { useToast } from "../context/ToastContext";
import { studentLogin, checkPrn } from "../services/studentAuthService";

export default function StudentLogin() {
  const [activeTab, setActiveTab] = useState("register"); // 'register' or 'login'
  const [prn, setPrn] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!prn.trim()) {
      toast.error("Please enter your PRN.");
      return;
    }

    setChecking(true);
    try {
      const res = await checkPrn(prn.trim());
      if (!res.is_valid) {
        toast.error(res.message || `PRN '${prn}' is not authorized for registration.`);
        return;
      }

      if (res.is_registered) {
        toast.info(res.message || "This PRN is already registered. Please log in with your password.");
        setActiveTab("login");
      } else {
        toast.success(res.message || "PRN verified!");
        navigate("/student/register", {
          state: {
            prn: res.prn || prn.trim(),
            expected_name: res.expected_name,
            expected_department: res.expected_department,
          },
        });
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "PRN is not authorized for registration."
      );
    } finally {
      setChecking(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!prn.trim() || !password.trim()) {
      toast.error("Please enter both User ID (PRN) and Password.");
      return;
    }

    setLoading(true);
    try {
      const res = await studentLogin(prn.trim(), password.trim());
      localStorage.setItem("student_token", res.token);
      localStorage.setItem("student_profile", JSON.stringify(res.student));
      
      toast.success("Login successful! Welcome to your dashboard.");
      navigate("/student/dashboard");
    } catch (err) {
      if (err.response?.data?.needs_registration) {
        toast.info("PRN not registered yet. Please complete registration.");
        setActiveTab("register");
      } else {
        toast.error(err.response?.data?.message || err.message || "Invalid credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-up">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 shadow-inner">
            <FaUserGraduate className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Student Portal Access
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            {activeTab === "register"
              ? "New student? Enter your PRN to complete your registration."
              : "Already registered? Log in with your PRN and password."}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "register"
                ? "bg-white text-primary-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FaUserPlus className="text-sm" /> 1. Registration
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "login"
                ? "bg-white text-primary-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FaLock className="text-sm" /> 2. Log In
          </button>
        </div>

        {/* Form Container */}
        <div className="card p-6 sm:p-8 shadow-xl ring-1 ring-slate-200 border-t-4 border-t-primary-600">
          {activeTab === "register" ? (
            /* Registration Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Enter Your PRN <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <FaUserGraduate className="text-xs" />
                  </span>
                  <input
                    type="text"
                    value={prn}
                    onChange={(e) => setPrn(e.target.value)}
                    placeholder="e.g. PRN260101"
                    className="input-field pl-9"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  First-time students must register before logging in.
                </p>
              </div>

              <button
                type="submit"
                disabled={checking}
                className="btn-primary w-full justify-center !py-3 text-base shadow-md flex items-center gap-2"
              >
                {checking ? (
                  "Verifying PRN..."
                ) : (
                  <>
                    Proceed to Register <FaArrowRight />
                  </>
                )}
              </button>

              <div className="text-center pt-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className="text-xs font-bold text-primary-600 hover:underline"
                >
                  Already completed registration? Click here to Log In
                </button>
              </div>
            </form>
          ) : (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  User ID (PRN) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <FaUserGraduate className="text-xs" />
                  </span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={prn}
                    onChange={(e) => setPrn(e.target.value)}
                    placeholder="e.g. PRN260101"
                    className="input-field pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <FaKey className="text-xs" />
                  </span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="input-field pl-9"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center !py-3 text-base shadow-md"
              >
                <FaLock className="mr-2 opacity-70" />
                {loading ? "Logging in..." : "Login to Student Portal"}
              </button>

              <div className="text-center pt-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="text-xs font-bold text-primary-600 hover:underline"
                >
                  Need to register first? Click here to Register
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500">
          <Link to="/" className="inline-flex items-center hover:text-primary-600 hover:underline font-medium">
            <FaHome className="mr-1.5" /> Back to Home
          </Link>
        </p>
      </div>
    </main>
  );
}
