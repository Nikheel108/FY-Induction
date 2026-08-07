import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaLock, FaUserShield, FaUser } from "react-icons/fa";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { adminLogin } from "../services/adminService";

/**
 * Admin login page. Exchanges username/password for a signed token.
 */
export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Please enter both username and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await adminLogin(username.trim(), password);
      login(result.token, result.username);
      toast.success("Welcome back!");
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-700 text-white">
              <FaUserShield className="text-3xl" />
            </span>
            <h1 className="mt-4 text-xl font-extrabold text-slate-900">Admin Login</h1>
            <p className="mt-1 text-sm text-slate-500">
              MIT Academy of Engineering · Induction Portal
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Username</label>
              <div className="relative">
                <FaUser className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  className="input-field !pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <FaLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className="input-field !pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full !py-3" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Default credentials: <code className="rounded bg-slate-100 px-1.5 py-0.5">admin</code> /{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">admin@123</code> (change in backend/.env)
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-slate-400">
          <Link to="/" className="font-medium text-slate-200 underline-offset-2 hover:underline">
            ← Back to registration portal
          </Link>
        </p>
      </div>
    </div>
  );
}
