import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarAlt,
  FaEnvelope,
  FaGraduationCap,
  FaMapMarkedAlt,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getStatistics } from "../services/studentService";

const FEATURES = [
  {
    icon: FaCalendarAlt,
    title: "Day-wise Schedule",
    text: "A complete itinerary of orientation sessions, workshops and campus tours.",
  },
  {
    icon: FaMapMarkedAlt,
    title: "Campus Map",
    text: "Never get lost. Navigate labs, hostels, auditorium and the cafeteria easily.",
  },
  {
    icon: FaEnvelope,
    title: "Email Confirmations",
    text: "Automatic welcome emails are sent to you and your parents instantly.",
  },
  {
    icon: FaUserCheck,
    title: "Simple Registration",
    text: "Fill one form and your induction registration is done in under 3 minutes.",
  },
];

/**
 * Landing page for the induction program portal.
 */
export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStatistics()
      .then((res) => setStats(res.statistics))
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-slate-900 to-slate-950" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-300">
            Academic Year 2026-27
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold text-white sm:text-5xl">
            Welcome to the First Year Induction Program
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            MIT Academy of Engineering welcomes its newest batch. Register for the
            induction program to receive your schedule, campus map and handbook —
            delivered straight to your inbox.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="btn-primary !px-8 !py-3 !text-base">
              Register for Induction
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center justify-center rounded-lg border border-slate-500 px-8 py-3 text-base font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Admin Dashboard
            </Link>
          </div>

          {stats && (
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-white/5 p-4 backdrop-blur">
                <p className="text-3xl font-extrabold text-white">{stats.total}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">Registrations</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 backdrop-blur">
                <p className="text-3xl font-extrabold text-white">{stats.by_department?.length ?? 0}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">Departments</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 backdrop-blur">
                <p className="text-3xl font-extrabold text-white">{stats.hostel_count}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">Hostellers</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4 backdrop-blur">
                <p className="text-3xl font-extrabold text-white">{stats.day_scholar_count}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">Day Scholars</p>
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
              <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
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
          <Link to="/register" className="btn-primary !bg-white !text-primary-700 hover:!bg-primary-50">
            <FaGraduationCap /> Register Now
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
