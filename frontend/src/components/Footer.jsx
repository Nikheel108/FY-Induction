import { Link } from "react-router-dom";
import { FaGraduationCap, FaEnvelope, FaMapMarkerAlt, FaPhone } from "react-icons/fa";

/**
 * Site footer shown on the public pages.
 */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="MITAOE Logo"
              className="h-8 w-auto object-contain flex-shrink-0"
            />
            <span className="font-bold text-slate-900">MIT Academy of Engineering</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Empowering the engineers of tomorrow. Official registration portal
            for the First Year Induction Program.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900">Quick Links</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link to="/" className="transition hover:text-primary-700">Home</Link></li>
            <li><Link to="/register" className="transition hover:text-primary-700">Student Registration</Link></li>
            <li><Link to="/admin/login" className="transition hover:text-primary-700">Admin Login</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li className="flex items-center gap-2"><FaMapMarkerAlt /> Alandi, Pune, Maharashtra</li>
            <li className="flex items-center gap-2"><FaPhone /> +91-82178-59747</li>
            <li className="flex items-center gap-2"><FaEnvelope /> induction@mitaoe.ac.in</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} MIT Academy of Engineering. All rights reserved.
      </div>
    </footer>
  );
}
