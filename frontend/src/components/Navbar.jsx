import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBars, FaTimes, FaUserCircle } from "react-icons/fa";

/**
 * Public site navigation bar shown on non-admin pages.
 * Displays logged-in student's name if authenticated, otherwise "Register Now" / "Login".
 */
export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [student, setStudent] = useState(null);
  const location = useLocation();
  const isRegisterPage = location.pathname === "/register" || location.pathname === "/student/register";

  useEffect(() => {
    const token = localStorage.getItem("student_token");
    const profileStr = localStorage.getItem("student_profile");
    if (token && profileStr) {
      try {
        setStudent(JSON.parse(profileStr));
      } catch (e) {
        setStudent(null);
      }
    } else {
      setStudent(null);
    }
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 sm:gap-3">
          <img
            src="/logo.png"
            alt="MITAOE Logo"
            className="h-8 sm:h-10 w-auto object-contain flex-shrink-0"
          />
          <span className="leading-tight">
            <span className="block text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[150px] sm:max-w-none">
              MIT Academy of Engineering
            </span>
            <span className="block text-[10px] sm:text-xs text-slate-500 truncate max-w-[150px] sm:max-w-none">
              First Year Induction Program
            </span>
          </span>
        </Link>

        {/* Desktop Nav */}
        {!isRegisterPage && (
          <nav className="hidden sm:flex items-center gap-4">
            <Link to="/attendance" className="text-sm font-semibold text-slate-600 hover:text-primary-600 transition-colors">
              Attendance
            </Link>
            <Link to="/contact" className="text-sm font-semibold text-slate-600 hover:text-primary-600 transition-colors">
              Contact Us
            </Link>
            {student ? (
              <Link
                to="/student/dashboard"
                className="btn-primary !px-4 !py-2 !text-sm whitespace-nowrap ml-2 flex items-center gap-2"
                title={student.full_name || student.prn}
              >
                <FaUserCircle className="text-base shrink-0" />
                <span className="truncate max-w-[140px]">
                  {student.full_name ? student.full_name.split(' ')[0] : student.prn}
                </span>
              </Link>
            ) : (
              <>
                <Link to="/student-login" className="text-sm font-semibold text-slate-600 hover:text-primary-600 transition-colors">
                  Login
                </Link>
                <Link to="/student-login" className="btn-primary !px-5 !py-2.5 !text-sm whitespace-nowrap ml-2">
                  Register Now
                </Link>
              </>
            )}
          </nav>
        )}

        {/* Mobile Hamburger */}
        {!isRegisterPage && (
          <button
            className="sm:hidden text-slate-600 hover:text-primary-600 p-2 text-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        )}
      </div>

      {/* Mobile Nav */}
      {!isRegisterPage && mobileMenuOpen && (
        <nav className="sm:hidden bg-white border-t border-slate-100 shadow-lg absolute w-full left-0 top-full flex flex-col p-4 gap-4 animate-fade-up">
          <Link 
            to="/attendance" 
            className="text-base font-semibold text-slate-700 hover:text-primary-600"
            onClick={() => setMobileMenuOpen(false)}
          >
            Attendance
          </Link>
          <Link 
            to="/contact" 
            className="text-base font-semibold text-slate-700 hover:text-primary-600"
            onClick={() => setMobileMenuOpen(false)}
          >
            Contact Us
          </Link>
          {student ? (
            <Link 
              to="/student/dashboard" 
              className="btn-primary w-full justify-center !py-3 flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaUserCircle className="text-lg" />
              <span>{student.full_name || student.prn}</span>
            </Link>
          ) : (
            <Link 
              to="/student-login" 
              className="btn-primary w-full justify-center !py-3"
              onClick={() => setMobileMenuOpen(false)}
            >
              Register Now
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}