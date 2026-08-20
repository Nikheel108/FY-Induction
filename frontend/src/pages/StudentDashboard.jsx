import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUserCircle,
  FaFileDownload,
  FaSignOutAlt,
  FaIdCard,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaUserTie,
  FaFilter,
  FaEnvelope,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaBullhorn,
  FaInfoCircle,
  FaCheckDouble,
  FaExclamationTriangle,
  FaGraduationCap,
  FaHome,
  FaPhoneAlt,
  FaPaperPlane,
  FaUser,
  FaHeadset,
  FaBars,
  FaTimes
} from "react-icons/fa";
import { useToast } from "../context/ToastContext";
import { getSchedule } from "../services/studentAuthService";
import { submitAttendance } from "../services/attendanceService";
import { downloadReceipt, submitContactQuery } from "../services/studentService";

// Asset images
import mitLogo from "../assets/logo.png";
import campusImg1 from "../assets/mit-academy-of-engineering-pune-363211.png";
import campusImg2 from "../assets/mit-academy-of-engineering-pune-363213.png";
import campusImg3 from "../assets/595daf32-dda6-4630-8acf-3b202d71bc02.png";

const CAROUSEL_SLIDES = [
  {
    id: 1,
    image: campusImg1,
    title: "Welcome to MIT Academy of Engineering",
    subtitle: "First-Year Student Induction Program 2026-27",
    tagline: "Department of Computer Science & Engineering (AI & ML)",
    location: "Alandi, Pune",
  },
  {
    id: 2,
    image: campusImg2,
    title: "Empowering Next-Gen Innovators",
    subtitle: "Explore Campus Facilities, Resource Speakers & Hands-on Workshops",
    tagline: "Excellence in Technical Education & Research",
    location: "Auditorium & Innovation Labs",
  },
  {
    id: 3,
    image: campusImg3,
    title: "Interactive Sessions & Mentorship",
    subtitle: "Mark Attendance Live for Daily Induction Sessions",
    tagline: "Track Your Progress & Stay Updated",
    location: "MIT AOE Campus",
  },
];

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [activeView, setActiveView] = useState("home"); // 'home' | 'schedule' | 'contact' | 'profile'
  const [selectedScheduleDate, setSelectedScheduleDate] = useState("");
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Contact query form state
  const [contactForm, setContactForm] = useState({ name: "", prn: "", email: "", description: "" });
  const [submittingContact, setSubmittingContact] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const dropdownRef = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("student_token");
    const profile = localStorage.getItem("student_profile");

    if (!token || !profile) {
      navigate("/student-login");
      return;
    }

    try {
      const parsed = JSON.parse(profile);
      if (!parsed.is_registered) {
        navigate("/student/register");
        return;
      }
      setStudent(parsed);
      setContactForm({
        name: parsed.full_name || "",
        prn: parsed.prn || "",
        email: parsed.student_email || "",
        description: "",
      });
    } catch (e) {
      navigate("/student-login");
    }
  }, [navigate]);

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Auto slide carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const data = await getSchedule();
      if (data.success) {
        setSchedule(data.schedule || []);
      }
    } catch (error) {
      toast.error("Failed to load schedule.");
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Extract unique available dates (YYYY-MM-DD) from schedule
  const availableDates = useMemo(() => {
    const map = {};
    schedule.forEach((s) => {
      if (!s.start_time) return;
      const d = new Date(s.start_time);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      if (!map[key]) {
        map[key] = { key, label, count: 0 };
      }
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [schedule]);

  // Default selected date to today or first available date
  useEffect(() => {
    if (availableDates.length > 0 && !selectedScheduleDate) {
      const todayKey = new Date().toISOString().split('T')[0];
      const hasToday = availableDates.some((d) => d.key === todayKey);
      if (hasToday) {
        setSelectedScheduleDate(todayKey);
      } else {
        setSelectedScheduleDate(availableDates[0].key);
      }
    }
  }, [availableDates, selectedScheduleDate]);

  // Filter schedule for selected date
  const filteredSchedule = useMemo(() => {
    if (!selectedScheduleDate) return schedule;
    return schedule.filter((s) => {
      if (!s.start_time) return false;
      const d = new Date(s.start_time);
      if (isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return key === selectedScheduleDate;
    });
  }, [schedule, selectedScheduleDate]);

  // Find active session
  const activeSession = useMemo(() => {
    const now = new Date();
    return schedule.find((s) => {
      if (!s.start_time) return false;
      const start = new Date(s.start_time);
      const end = new Date(start.getTime() + (s.duration_minutes + 5) * 60000);
      return now >= start && now <= end;
    });
  }, [schedule]);

  const handleLogout = () => {
    localStorage.removeItem("student_token");
    localStorage.removeItem("student_profile");
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleDownloadReceipt = async () => {
    if (!student) return;
    setDownloadingReceipt(true);
    try {
      toast.info("Generating your receipt PDF...");
      const blob = await downloadReceipt(student.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Receipt_${student.registration_id || student.prn}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Receipt downloaded successfully.");
    } catch (error) {
      toast.error(error.message || "Failed to download receipt.");
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const handleMarkAttendance = async (session) => {
    if (!student) return;
    setMarkingAttendance(true);
    try {
      const res = await submitAttendance(student.prn);
      if (res.success) {
        toast.success(res.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setMarkingAttendance(false);
    }
  };

  const handleSubmitContactQuery = async (e) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.prn.trim() || !contactForm.email.trim() || !contactForm.description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmittingContact(true);
    try {
      const res = await submitContactQuery(contactForm);
      toast.success(res.message || "Query submitted successfully!");
      setContactSubmitted(true);
      setContactForm((prev) => ({ ...prev, description: "" }));
    } catch (err) {
      toast.error(err.message || "Failed to submit query.");
    } finally {
      setSubmittingContact(false);
    }
  };

  if (!student) return null;

  const isSessionActive = (session) => {
    const now = new Date();
    const start = new Date(session.start_time);
    const end = new Date(start.getTime() + (session.duration_minutes + 5) * 60000);
    return now >= start && now <= end;
  };

  const selectedDateObj = availableDates.find((d) => d.key === selectedScheduleDate);
  const slide = CAROUSEL_SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* BRAND HEADER & NAVBAR */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          {/* MIT AOE Logo & Full Name ALWAYS beside Logo */}
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0" onClick={() => setActiveView("home")}>
            <img
              src={mitLogo}
              alt="MIT AOE Logo"
              className="h-8 sm:h-10 w-auto object-contain shrink-0"
            />
            <div className="border-l border-slate-300 pl-2 sm:pl-3 min-w-0">
              <h1 className="text-xs sm:text-base font-black text-slate-900 leading-tight truncate">MIT Academy of Engineering</h1>
              <p className="text-[10px] sm:text-[11px] font-semibold text-primary-700 leading-none mt-0.5 truncate">Alandi, Pune | Induction 2026-27</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            <button
              onClick={() => setActiveView("home")}
              className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeView === "home"
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-700 hover:text-primary-700 hover:bg-slate-100"
              }`}
            >
              <FaHome className="text-primary-600" />
              <span>Home</span>
            </button>

            <button
              onClick={() => setActiveView("schedule")}
              className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeView === "schedule"
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-700 hover:text-primary-700 hover:bg-slate-100"
              }`}
            >
              <FaCalendarAlt className="text-primary-600" />
              <span>Schedule</span>
            </button>

            <button
              onClick={() => setActiveView("contact")}
              className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeView === "contact"
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-700 hover:text-primary-700 hover:bg-slate-100"
              }`}
            >
              <FaEnvelope className="text-primary-600" />
              <span>Contact Us</span>
            </button>

            <button
              onClick={handleDownloadReceipt}
              disabled={downloadingReceipt}
              className="text-xs sm:text-sm font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 transition shadow-sm"
              title="Download Registration Receipt"
            >
              <FaFileDownload className="text-amber-700" />
              <span>{downloadingReceipt ? "Downloading..." : "Receipt"}</span>
            </button>

            {/* PROFILE IMAGE AVATAR & DROPDOWN (Desktop) */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1 focus:outline-none p-0.5 rounded-full hover:bg-slate-100 transition border border-slate-300"
                aria-label="Profile Menu"
              >
                {student.photo_base64 ? (
                  <img
                    src={student.photo_base64}
                    alt={student.full_name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-primary-600 shadow-sm"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {student.full_name ? student.full_name.charAt(0).toUpperCase() : "S"}
                  </div>
                )}
                <FaChevronDown className="text-xs text-slate-500 mr-0.5" />
              </button>

              {/* DROPDOWN MENU */}
              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 px-4 z-50 space-y-3"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      {student.photo_base64 ? (
                        <img
                          src={student.photo_base64}
                          alt={student.full_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-primary-600 shadow-md"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary-700 text-white flex items-center justify-center font-bold text-lg shadow-md">
                          {student.full_name ? student.full_name.charAt(0).toUpperCase() : "S"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-slate-900 truncate">{student.full_name}</p>
                        <p className="text-xs text-slate-400 truncate">{student.student_email}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-500 font-semibold">Reg No:</span>
                        <span className="font-mono font-bold text-primary-700">{student.registration_id || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-500 font-semibold">PRN:</span>
                        <span className="font-mono font-bold text-slate-800">{student.prn}</span>
                      </div>
                      <div className="flex justify-between items-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-500 font-semibold whitespace-nowrap">Department:</span>
                        <span className="font-medium text-slate-800 text-right line-clamp-2">{student.department}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveView("profile");
                          setProfileDropdownOpen(false);
                        }}
                        className="text-xs text-primary-700 hover:underline font-bold"
                      >
                        View Full Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition"
                      >
                        <FaSignOutAlt /> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Right Controls: Avatar + Hamburger Menu */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setActiveView("profile")}
              className="p-0.5 rounded-full border border-slate-300 shrink-0"
              title="My Profile"
            >
              {student.photo_base64 ? (
                <img
                  src={student.photo_base64}
                  alt={student.full_name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-primary-600"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-700 text-white flex items-center justify-center font-bold text-xs">
                  {student.full_name ? student.full_name.charAt(0).toUpperCase() : "S"}
                </div>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-primary-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-lg transition"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* MOBILE NAVIGATION DRAWER */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden bg-white border-t border-slate-200 shadow-xl overflow-hidden px-4 py-3 space-y-2"
            >
              <button
                onClick={() => {
                  setActiveView("home");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeView === "home" ? "bg-primary-50 text-primary-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <FaHome className="text-primary-600 text-base" /> Home Dashboard
              </button>

              <button
                onClick={() => {
                  setActiveView("schedule");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeView === "schedule" ? "bg-primary-50 text-primary-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <FaCalendarAlt className="text-primary-600 text-base" /> Full Schedule
              </button>

              <button
                onClick={() => {
                  setActiveView("contact");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeView === "contact" ? "bg-primary-50 text-primary-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <FaEnvelope className="text-primary-600 text-base" /> Contact & Support
              </button>

              <button
                onClick={() => {
                  setActiveView("profile");
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition ${
                  activeView === "profile" ? "bg-primary-50 text-primary-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <FaUserCircle className="text-primary-600 text-base" /> My Profile
              </button>

              <button
                onClick={() => {
                  handleDownloadReceipt();
                  setMobileMenuOpen(false);
                }}
                disabled={downloadingReceipt}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-sm text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
              >
                <span className="flex items-center gap-3">
                  <FaFileDownload className="text-amber-700 text-base" /> Download Receipt
                </span>
                <span className="text-xs bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded">PDF</span>
              </button>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-sm text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 flex-1 w-full animate-fade-up">
        {/* ================= PAGE VIEW 1: HOME (Dashboard) ================= */}
        {activeView === "home" && (
          <div className="space-y-6 animate-fade-in">
            {/* SLIDING IMAGE CAROUSEL BANNER WITH STUDENT GREETING */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 group">
              <div className="relative h-64 sm:h-80 w-full overflow-hidden">
                {/* Carousel Image */}
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover transform scale-105 transition-all duration-1000 filter brightness-[0.4]"
                />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent p-6 sm:p-8 flex flex-col justify-between text-white">
                  {/* Top Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                      <FaGraduationCap className="text-sm" /> Student Induction 2026-27
                    </span>
                    <span className="text-xs text-slate-200 font-semibold bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                      📍 {slide.location}
                    </span>
                  </div>

                  {/* Center Student Greeting */}
                  <div>
                    <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-1 text-amber-300">
                      Welcome, {student.full_name ? student.full_name.split(' ')[0] : student.prn}! 👋
                    </h2>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white">{slide.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-200 max-w-2xl mt-1 font-medium line-clamp-2">
                      {slide.subtitle}
                    </p>
                  </div>

                  {/* Bottom Controls & Dots */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-amber-300/90 font-bold hidden sm:block">{slide.tagline}</p>
                    <div className="flex items-center gap-2 mx-auto sm:mx-0">
                      {CAROUSEL_SLIDES.map((s, idx) => (
                        <button
                          key={s.id}
                          onClick={() => setCurrentSlide(idx)}
                          className={`h-2.5 rounded-full transition-all ${
                            currentSlide === idx ? "w-8 bg-amber-400" : "w-2.5 bg-white/40 hover:bg-white/70"
                          }`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Carousel Navigation Arrows */}
                <button
                  onClick={() => setCurrentSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm transition opacity-0 group-hover:opacity-100"
                  aria-label="Previous Slide"
                >
                  <FaChevronLeft />
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm transition opacity-0 group-hover:opacity-100"
                  aria-label="Next Slide"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>

            {/* LIVE ATTENDANCE BANNER (High visibility when session is active now) */}
            {activeSession && (
              <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-2 border-emerald-400 animate-pulse-subtle">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-white animate-ping"></span>
                    <span className="text-xs uppercase tracking-widest font-black text-emerald-200">
                      Live Attendance Open Now
                    </span>
                  </div>
                  <h3 className="text-xl font-black">{activeSession.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100 font-medium">
                    {activeSession.resource_speaker !== '-' && (
                      <span>👤 Speaker: {activeSession.resource_speaker}</span>
                    )}
                    {activeSession.location !== '-' && (
                      <span>📍 Location: {activeSession.location}</span>
                    )}
                    <span>
                      ⏰ Window Ends: {new Date(new Date(activeSession.start_time).getTime() + (activeSession.duration_minutes + 5) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleMarkAttendance(activeSession)}
                  disabled={markingAttendance}
                  className="bg-white text-emerald-900 hover:bg-emerald-50 font-black py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 text-base transition transform hover:scale-105 active:scale-95"
                >
                  <FaCheckCircle className="text-emerald-600 text-xl" />
                  {markingAttendance ? "Recording..." : "Mark Present Now"}
                </button>
              </div>
            )}

            {/* SECTION 1: TODAY'S SESSION ANNOUNCEMENTS */}
            <div className="card p-6 space-y-4 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FaBullhorn className="text-primary-700" /> Today's Session Announcements
                </h2>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  {filteredSchedule.length} Session(s) Scheduled
                </span>
              </div>

              {loadingSchedule ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredSchedule.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-sm">
                  No session announcements for today. Click the <strong>Schedule</strong> tab above to view upcoming dates.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSchedule.map((session) => {
                    const active = isSessionActive(session);
                    const start = new Date(session.start_time);
                    const end = new Date(start.getTime() + session.duration_minutes * 60000);
                    const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                    return (
                      <div
                        key={session.id}
                        className={`bg-white border rounded-xl p-5 shadow-sm transition relative overflow-hidden ${
                          active
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {active && (
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-slate-900 text-lg">{session.title}</h3>
                          {active ? (
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Attendance Open
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                              Scheduled
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 mb-3">
                          <span className="flex items-center gap-1 text-slate-800 font-semibold">
                            <FaClock className="text-primary-600" /> {timeStr}
                          </span>
                          {session.resource_speaker !== '-' && (
                            <span className="flex items-center gap-1">
                              <FaUserTie className="text-primary-600" /> {session.resource_speaker}
                            </span>
                          )}
                          {session.location !== '-' && (
                            <span className="flex items-center gap-1">
                              <FaMapMarkerAlt className="text-primary-600" /> {session.location}
                            </span>
                          )}
                        </div>

                        {active && (
                          <button
                            onClick={() => handleMarkAttendance(session)}
                            disabled={markingAttendance}
                            className="w-full btn-primary !py-2.5 bg-emerald-600 hover:bg-emerald-700 justify-center font-bold text-white shadow-md"
                          >
                            {markingAttendance ? "Recording..." : <><FaCheckCircle className="mr-2" /> Mark Attendance Now</>}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: STUDENT INSTRUCTIONS & GUIDELINES (Stacked directly under Announcements!) */}
            <div className="card p-6 border-t-4 border-t-amber-500 space-y-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl font-bold shadow-sm">
                  <FaInfoCircle />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Student Induction Guidelines & Instructions</h2>
                  <p className="text-xs text-slate-500 font-semibold">MIT Academy of Engineering | Academic Session 2026-27</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Instruction 1 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <FaCheckDouble className="text-base" />
                    <span>1. Attendance Marking Policy</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Attendance marking is strictly <strong>time-bound</strong> for each session. Students must mark attendance during the live session window using their registered PRN. Device IP address and timestamp are audited.
                  </p>
                </div>

                {/* Instruction 2 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-primary-700 font-bold text-sm">
                    <FaIdCard className="text-base" />
                    <span>2. PRN & Registration ID Verification</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ensure your official Permanent Registration Number (PRN) matches your college identity document. Your Registration ID (e.g. <code>{student.registration_id}</code>) is required for campus entry verification.
                  </p>
                </div>

                {/* Instruction 3 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                    <FaFileDownload className="text-base" />
                    <span>3. Official Registration Receipt</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Download and save your official <strong>Registration Receipt PDF</strong> using the button in the top navigation bar. Keep a digital or printed copy during all induction sessions.
                  </p>
                </div>

                {/* Instruction 4 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                    <FaClock className="text-base" />
                    <span>4. Session Punctuality & Discipline</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Arrive at the Auditorium or designated venue <strong>10 minutes before</strong> the scheduled session start time. Mobile phones must be kept on silent mode during technical lectures.
                  </p>
                </div>
              </div>

              {/* Support Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-900">
                <FaExclamationTriangle className="text-blue-600 text-lg mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Need Help or Facing Technical Issues?</p>
                  <p className="text-blue-800">
                    If you face any issues marking attendance or updating details, click the <strong>Contact Us</strong> page above to submit a support query to the induction admin committee.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= PAGE VIEW 2: FULL SCHEDULE PAGE ================= */}
        {activeView === "schedule" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <FaCalendarAlt className="text-primary-700" /> Event Session Schedule
                </h2>
                <p className="text-xs text-slate-500 font-medium">Browse day-wise sessions and live attendance status</p>
              </div>
              <button
                onClick={() => setActiveView("home")}
                className="btn-secondary !px-3 !py-1.5 text-xs"
              >
                ← Back to Dashboard
              </button>
            </div>

            {/* Date Selector */}
            {availableDates.length > 0 && (
              <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-primary-600">
                <label htmlFor="schedule-date-select" className="flex items-center gap-2 text-slate-800 font-bold text-sm cursor-pointer">
                  <FaCalendarAlt className="text-primary-600" />
                  <span>Select Schedule Date:</span>
                </label>
                <div className="relative w-full sm:w-72">
                  <select
                    id="schedule-date-select"
                    value={selectedScheduleDate}
                    onChange={(e) => setSelectedScheduleDate(e.target.value)}
                    className="input-field font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-primary-500 w-full appearance-none shadow-sm cursor-pointer"
                  >
                    {availableDates.map((item) => (
                      <option key={item.key} value={item.key}>
                        📅 {item.label} ({item.count} {item.count === 1 ? 'session' : 'sessions'})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <FaFilter className="text-xs text-primary-600" />
                  </div>
                </div>
              </div>
            )}

            {loadingSchedule ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredSchedule.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <FaCalendarAlt className="mx-auto text-4xl text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No sessions scheduled for this date.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  Sessions for {selectedDateObj?.label || selectedScheduleDate}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSchedule.map((session) => {
                    const active = isSessionActive(session);
                    const start = new Date(session.start_time);
                    const end = new Date(start.getTime() + session.duration_minutes * 60000);
                    const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                    return (
                      <div
                        key={session.id}
                        className={`bg-white border rounded-xl p-5 shadow-sm transition relative overflow-hidden ${
                          active
                            ? 'border-emerald-500 ring-1 ring-emerald-500'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-slate-800 text-lg leading-tight pr-4">{session.title}</h4>
                          {active && (
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2 font-medium">
                          <FaClock className="text-slate-400" />
                          {timeStr}
                        </div>
                        {(session.resource_speaker !== "-" || session.location !== "-") && (
                          <div className="text-sm text-slate-600 mb-4 bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                            {session.resource_speaker !== "-" && (
                              <div className="flex items-start gap-2.5">
                                <FaUserTie className="text-primary-500 mt-0.5" />
                                <span className="font-medium text-slate-700">{session.resource_speaker}</span>
                              </div>
                            )}
                            {session.location !== "-" && (
                              <div className="flex items-start gap-2.5">
                                <FaMapMarkerAlt className="text-primary-500 mt-0.5" />
                                <span className="font-medium text-slate-700">{session.location}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {active && (
                          <button
                            onClick={() => handleMarkAttendance(session)}
                            disabled={markingAttendance}
                            className="w-full btn-primary !py-2.5 bg-emerald-600 hover:bg-emerald-700 justify-center font-bold"
                          >
                            {markingAttendance ? "Recording..." : <><FaCheckCircle className="mr-2" /> Mark Attendance</>}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= PAGE VIEW 3: CONTACT US PAGE ================= */}
        {activeView === "contact" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <FaHeadset className="text-primary-700" /> Contact & Support Desk
                </h2>
                <p className="text-xs text-slate-500 font-medium">Get in touch with MIT AOE Induction Support Committee</p>
              </div>
              <button
                onClick={() => setActiveView("home")}
                className="btn-secondary !px-3 !py-1.5 text-xs"
              >
                ← Back to Dashboard
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              {/* Left Column: Contact Information (2 cols) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="card p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl"></div>
                  
                  <h3 className="text-lg font-bold mb-5 text-white border-b border-slate-700 pb-3 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-primary-400" /> Institution Details
                  </h3>

                  <ul className="space-y-4 text-slate-300 text-xs">
                    <li className="flex items-start gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-primary-400 mt-0.5">
                        <FaMapMarkerAlt />
                      </span>
                      <div>
                        <strong className="block text-white font-semibold mb-0.5">Campus Address</strong>
                        MIT Academy of Engineering, Dehu Phata, Alandi, Pune - 412105, Maharashtra, India.
                      </div>
                    </li>

                    <li className="flex items-start gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-primary-400 mt-0.5">
                        <FaPhoneAlt />
                      </span>
                      <div>
                        <strong className="block text-white font-semibold mb-0.5">Induction Helpline</strong>
                        <p>+91-82178-59747</p>
                        <p>+91-87932-18900</p>
                      </div>
                    </li>

                    <li className="flex items-start gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-primary-400 mt-0.5">
                        <FaEnvelope />
                      </span>
                      <div>
                        <strong className="block text-white font-semibold mb-0.5">Official Email</strong>
                        fyinduction2627@gmail.com
                      </div>
                    </li>

                    <li className="flex items-start gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-primary-400 mt-0.5">
                        <FaClock />
                      </span>
                      <div>
                        <strong className="block text-white font-semibold mb-0.5">Office Hours</strong>
                        Monday – Friday: 9:00 AM – 5:00 PM
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Logged-in Student Status Pill */}
                <div className="card p-4 bg-emerald-50 border-emerald-200 text-emerald-900 text-xs flex items-center gap-3">
                  <FaCheckCircle className="text-emerald-600 text-lg shrink-0" />
                  <div>
                    <strong className="block text-emerald-950 font-bold">Verified Student Account</strong>
                    <p className="text-emerald-800 text-[11px]">
                      Logged in as <strong>{student.full_name}</strong> (PRN: <code>{student.prn}</code>). Your profile details are automatically attached to support tickets.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Query Form (3 cols) */}
              <div className="lg:col-span-3">
                <div className="card p-6 sm:p-8 shadow-md border-t-4 border-t-primary-600">
                  <div className="mb-5">
                    <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      <FaPaperPlane className="text-primary-600" /> Send Us a Message
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Fill out your query below. Our induction committee will review your message and respond to your email.
                    </p>
                  </div>

                  {contactSubmitted ? (
                    <div className="py-10 text-center space-y-4 animate-fade-in">
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                        <FaCheckCircle className="text-3xl" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">Query Received!</h4>
                      <p className="text-slate-600 text-xs max-w-sm mx-auto">
                        Thank you for reaching out. Your query has been successfully submitted to the induction admin committee.
                      </p>
                      <button
                        onClick={() => setContactSubmitted(false)}
                        className="btn-primary !py-2 !px-5 text-xs"
                      >
                        Submit Another Query
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitContactQuery} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name <span className="text-emerald-600 text-[10px] font-bold">(Auto-filled)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <FaUser className="text-xs" />
                          </span>
                          <input
                            type="text"
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            className="input-field text-xs pl-8 w-full bg-slate-50"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            PRN Number <span className="text-emerald-600 text-[10px] font-bold">(Verified)</span>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                              <FaIdCard className="text-xs" />
                            </span>
                            <input
                              type="text"
                              value={contactForm.prn}
                              onChange={(e) => setContactForm({ ...contactForm, prn: e.target.value })}
                              className="input-field text-xs pl-8 w-full font-mono bg-slate-50"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Email Address <span className="text-emerald-600 text-[10px] font-bold">(Auto-filled)</span>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                              <FaEnvelope className="text-xs" />
                            </span>
                            <input
                              type="email"
                              value={contactForm.email}
                              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                              className="input-field text-xs pl-8 w-full bg-slate-50"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Query Description / Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows="5"
                          value={contactForm.description}
                          onChange={(e) => setContactForm({ ...contactForm, description: e.target.value })}
                          className="input-field text-xs w-full resize-y"
                          placeholder="Please describe your query or problem in detail..."
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingContact}
                        className="btn-primary w-full justify-center text-sm !py-2.5 shadow-md"
                      >
                        {submittingContact ? (
                          "Submitting..."
                        ) : (
                          <>
                            <FaPaperPlane className="mr-2 text-xs" /> Submit Support Query
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= PAGE VIEW 4: MY PROFILE PAGE ================= */}
        {activeView === "profile" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <FaUserCircle className="text-primary-700" /> Student Profile Details
                </h2>
                <p className="text-xs text-slate-500 font-medium">Verified registration and enrollment records</p>
              </div>
              <button
                onClick={() => setActiveView("home")}
                className="btn-secondary !px-3 !py-1.5 text-xs"
              >
                ← Back to Dashboard
              </button>
            </div>

            <div className="card p-6 space-y-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                {student.photo_base64 ? (
                  <img
                    src={student.photo_base64}
                    alt={student.full_name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-primary-600 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary-700 text-white flex items-center justify-center font-bold text-3xl shadow-md">
                    {student.full_name ? student.full_name.charAt(0).toUpperCase() : "S"}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{student.full_name}</h3>
                  <p className="text-xs font-mono font-bold text-primary-700 mt-0.5">
                    Registration ID: {student.registration_id}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">{student.department}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">PRN</p>
                    <p className="font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-md inline-block">
                      {student.prn}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Student Email</p>
                    <p className="font-medium text-slate-800">{student.student_email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Student Phone</p>
                    <p className="font-medium text-slate-800">{student.student_phone}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Parent Name</p>
                    <p className="font-medium text-slate-800">{student.parent_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Parent Email</p>
                    <p className="font-medium text-slate-800">{student.parent_email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Parent Phone</p>
                    <p className="font-medium text-slate-800">{student.parent_phone || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
