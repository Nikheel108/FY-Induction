import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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

  const location = useLocation();

  useEffect(() => {
    // If they arrived from Student Access page, they have the PRN in state.
    const prn = location.state?.prn;
    if (!prn) {
      navigate("/student-login");
      return;
    }
    setStudent({ prn });
  }, [navigate, location.state]);

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await studentRegister(data);
      toast.success(result.message || "Registration successful!");
      
      // Auto-login doesn't happen during register since it doesn't return a token anymore, 
      // or does it? No, it just registers. Let's redirect them to login so they can access their dashboard.
      toast.info("Please login with your PRN to access your dashboard.");
      navigate("/student-login");
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
