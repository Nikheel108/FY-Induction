import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import StudentForm from "../components/StudentForm";
import { useToast } from "../context/ToastContext";
import { registerStudent } from "../services/studentService";

/**
 * Public registration page. Submits the full form to POST /api/register and
 * navigates to the Success page on success.
 */
export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await registerStudent(data);
      toast.success(result.message || "Registration successful!");
      // Persist the response so the Success page survives a refresh.
      sessionStorage.setItem("last_registration", JSON.stringify(result));
      navigate("/success");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 md:text-3xl">
            First Year Induction Registration
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            Fill in your details below. Fields marked with <span className="text-red-500">*</span> are
            mandatory. A confirmation email will be sent to you and your parents.
          </p>
        </div>

        <div className="card p-4 sm:p-10">
          <StudentForm
            onSubmit={handleSubmit}
            submitLabel="Submit Registration"
            loading={loading}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
