import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaCheckCircle, FaDownload, FaEnvelope, FaHome } from "react-icons/fa";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Spinner from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import { downloadReceipt } from "../services/studentService";

/**
 * Success page shown after a completed registration.
 * Displays the registration ID with an animation and offers the receipt PDF.
 */
export default function Success() {
  const [registration, setRegistration] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("last_registration");
      if (raw) setRegistration(JSON.parse(raw));
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

  const student = registration?.student;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Navbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-8 sm:py-12">
        <div className="card w-full p-6 text-center sm:p-12">
          <span className="animate-pop mx-auto grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <FaCheckCircle className="text-4xl sm:text-5xl" />
          </span>

          <h1 className="animate-fade-up mt-6 text-xl font-extrabold text-slate-900 sm:text-3xl">
            Registration Successful!
          </h1>
          <p className="animate-fade-up mt-2 text-sm text-slate-500">
            Please check your email for the welcome message and attachments.
          </p>

          {student ? (
            <div className="animate-fade-up mt-8 space-y-4 text-left">
              <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">
                  Your Registration ID
                </p>
                <p className="mt-1 text-2xl font-extrabold text-primary-800">
                  {student.registration_id}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Student Name</p>
                  <p className="font-semibold text-slate-800">{student.full_name}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">Department</p>
                  <p className="font-semibold text-slate-800">{student.department}</p>
                </div>
              </div>

              {registration?.emails && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="flex items-center gap-2 font-semibold"><FaEnvelope /> Email status</p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {Object.entries(registration.emails).map(([key, value]) => (
                      <li key={key} className={value.status === "sent" ? "text-emerald-700" : "text-red-600"}>
                        {key === "student" ? "Welcome email to student" : "Confirmation email to parent"}: {value.status}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-amber-700">
                    Note: if emails could not be sent, an administrator can resend them later.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  className="btn-primary w-full sm:w-auto"
                  onClick={handleDownloadReceipt}
                  disabled={downloading}
                >
                  {downloading ? <Spinner className="!py-0 !text-white" label="" /> : <FaDownload />}
                  {downloading ? "Generating..." : "Download Receipt (PDF)"}
                </button>
                <Link to="/" className="btn-secondary w-full sm:w-auto">
                  <FaHome /> Back to Home
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
