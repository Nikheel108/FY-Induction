import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import StudentForm from "../components/StudentForm";
import { useToast } from "../context/ToastContext";
import { studentRegister } from "../services/studentAuthService";

/**
 * Public registration page. Submits the full form to POST /api/register and
 * navigates to the Success page on success.
 */
export default function Register() {
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem("student_token");
    const profile = localStorage.getItem("student_profile");
    
    if (!token || !profile) {
      navigate("/student-login");
      return;
    }
    
    try {
      const parsed = JSON.parse(profile);
      if (parsed.registration_id) {
        navigate("/student/dashboard");
        return;
      }
      setStudent(parsed);
    } catch (e) {
      navigate("/student-login");
    }
  }, [navigate]);

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await studentRegister(data);
      toast.success(result.message || "Registration successful!");
      
      // Update local storage profile to reflect registration
      localStorage.setItem("student_profile", JSON.stringify(result.student));
      
      // Persist the response so the Success page survives a refresh.
      sessionStorage.setItem("last_registration", JSON.stringify(result));
      navigate("/success");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

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
            mandatory.
          </p>
        </div>

        <div className="card p-4 sm:p-10">
          <StudentForm
            onSubmit={handleSubmit}
            submitLabel="Submit Registration"
            loading={loading}
            defaultValues={student}
            readOnlyPrn={true}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
