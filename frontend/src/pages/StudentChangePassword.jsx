import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaLock, FaCheckCircle } from "react-icons/fa";
import { useToast } from "../context/ToastContext";
import { studentChangePassword, studentMe } from "../services/studentAuthService";

export default function StudentChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Basic guard: if no token, redirect to login
    if (!localStorage.getItem("student_token")) {
      navigate("/student-login");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      await studentChangePassword(newPassword);
      toast.success("Password updated successfully!");
      
      // Fetch fresh profile
      const res = await studentMe();
      localStorage.setItem("student_profile", JSON.stringify(res.student));
      
      if (!res.student.is_registered) {
        navigate("/student/register");
      } else {
        navigate("/student/dashboard");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center animate-fade-up">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-inner">
            <FaLock className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Set Your Password
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            For security, please set a new password before continuing.
          </p>
        </div>

        <div className="card p-6 shadow-xl ring-1 ring-slate-200 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="input-field"
                minLength="6"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Type it again"
                className="input-field"
                minLength="6"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center !py-2.5 text-base mt-2"
            >
              <FaCheckCircle className="mr-2 opacity-70" />
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
