import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarAlt,
  FaEnvelope,
  FaGraduationCap,
  FaMapMarkedAlt,
  FaUserCheck,
  FaUsers,
  FaImages,
  FaClipboardCheck,
} from "react-icons/fa";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getStatistics } from "../services/studentService";

const FEATURES = [
  {
    icon: FaUserCheck,
    title: "Instant Registration",
    text: "Register in minutes and get your unique registration code instantly.",
  },
  {
    icon: FaClipboardCheck,
    title: "Live Attendance",
    text: "Mark your attendance securely during active event sessions.",
  },
  {
    icon: FaImages,
    title: "Event Highlights",
    text: "Explore photos and memories from past induction events and sessions.",
  },
  {
    icon: FaEnvelope,
    title: "Important Updates",
    text: "Receive official schedules, campus maps, and announcements.",
  },
];

/**
 * Landing page for the induction program portal.
 */
export default function Home() {
  const [stats, setStats] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  // Generate some random stars for the background
  const [stars] = useState(() => {
    return Array.from({ length: 50 }).map(() => ({
      id: Math.random(),
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDuration: `${2 + Math.random() * 3}s`,
      animationDelay: `${Math.random() * 2}s`,
      width: `${2 + Math.random() * 3}px`,
      height: `${2 + Math.random() * 3}px`,
    }));
  });

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    getStatistics()
      .then((res) => setStats(res.statistics))
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* 5-second Splash Screen */}
      {showSplash && (
        <div className="animate-splash-screen fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 overflow-hidden px-4">
          {/* Animated stars */}
          {stars.map((s) => (
            <div
              key={s.id}
              className="star"
              style={{
                left: s.left,
                top: s.top,
                width: s.width,
                height: s.height,
                animationDuration: s.animationDuration,
                animationDelay: s.animationDelay,
              }}
            />
          ))}
          
          <div className="animate-zoom-text z-10 text-center">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-emerald-300 to-primary-600 mb-4 drop-shadow-lg">
              Welcome FY Students!
            </h1>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-6 drop-shadow-md">
              To Our CSE AIML Department & Our College
            </h2>
            <p className="text-lg sm:text-xl text-primary-200 font-medium italic">
              "With full josh, let's make an impact in the upcoming generation!"
            </p>
          </div>
        </div>
      )}

      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-slate-900 to-slate-950" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-20 text-center">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary-300">
            Academic Year 2026-27
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold text-white sm:text-4xl md:text-5xl">
            Welcome to the First Year Induction Program
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            MIT Academy of Engineering welcomes its newest batch. Register for the
            induction program to receive your schedule, campus map and handbook —
            delivered straight to your inbox.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link to="/student-login" className="btn-primary !px-8 !py-3 !text-base w-full sm:w-auto">
              Register / Access Dashboard
            </Link>
          </div>

          {stats && (
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-white/10 p-4 sm:p-5 backdrop-blur shadow-lg border border-white/10 transition hover:-translate-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-white">{stats.total}</p>
                <p className="mt-1 text-sm font-medium text-slate-300">Registrations</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4 sm:p-5 backdrop-blur shadow-lg border border-white/10 transition hover:-translate-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-white">{stats.by_department?.length ?? 0}</p>
                <p className="mt-1 text-sm font-medium text-slate-300">Departments</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4 sm:p-5 backdrop-blur shadow-lg border border-white/10 transition hover:-translate-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-white">{stats.total}</p>
                <p className="mt-1 text-sm font-medium text-slate-300">Students</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4 sm:p-5 backdrop-blur shadow-lg border border-white/10 transition hover:-translate-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-white">1</p>
                <p className="mt-1 text-sm font-medium text-slate-300">Program</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Everything you need for a smooth start
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-500">
          Our induction program is designed to help you settle in, make friends
          and understand life at MITAOE.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-50 text-2xl text-primary-700">
                <Icon />
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-primary-700">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-12 sm:flex-row">
          <div className="flex items-center gap-4">
            <FaUsers className="text-4xl text-white/80" />
            <div>
              <h3 className="text-xl font-bold text-white">Ready to join the family?</h3>
              <p className="text-sm text-primary-100">
                Complete your registration and receive instant email confirmation.
              </p>
            </div>
          </div>
          <Link to="/student-login" className="btn-primary !bg-white !text-primary-700 hover:!bg-primary-50 w-full sm:w-auto mt-4 sm:mt-0">
            <FaGraduationCap /> Get Started
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
