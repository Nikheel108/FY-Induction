import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserGraduate, FaLock, FaHome } from "react-icons/fa";
import { useToast } from "../context/ToastContext";
import { studentLogin } from "../services/studentAuthService";

export default function StudentLogin() {
  const [prn, setPrn] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await studentLogin(prn);
      localStorage.setItem("student_token", res.token);
      localStorage.setItem("student_profile", JSON.stringify(res.student));
      
      toast.success("Access granted!");
      navigate("/student/dashboard");
    } catch (err) {
      if (err.response?.data?.needs_registration) {
        // Navigate to registration page with PRN in state
        toast.info("PRN authorized. Please complete registration.");
        navigate("/student/register", { state: { prn } });
      } else {
        toast.error(err.response?.data?.message || err.message || "Invalid PRN.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 shadow-inner">
            <FaUserGraduate className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Student Access
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your PRN to access the portal
          </p>
        </div>

        <div className="card p-6 shadow-xl ring-1 ring-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">PRN</label>
              <input
                type="text"
                autoComplete="username"
                value={prn}
                onChange={(e) => setPrn(e.target.value)}
                placeholder="Enter your PRN"
                className="input-field"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center !py-2.5 text-base"
            >
              <FaLock className="mr-2 opacity-70" />
              {loading ? "Verifying..." : "Access Dashboard"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500">
          <Link to="/" className="inline-flex items-center hover:text-primary-600 hover:underline">
            <FaHome className="mr-1.5" /> Back to Home
          </Link>
        </p>
      </div>
    </main>
  );
}
