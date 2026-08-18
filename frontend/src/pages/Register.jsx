import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FaSignInAlt } from "react-icons/fa";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import StudentForm from "../components/StudentForm";
import { useToast } from "../context/ToastContext";
import { studentRegister } from "../services/studentAuthService";

/**
 * Public registration page.
 * Allows students to fill their details and complete registration.
 * Includes a direct option to Log In if already registered.
 */
export default function Register() {
  const [loading, setLoading] = useState(false);
  const [defaultValues, setDefaultValues] = useState({});
  const [isPrnFixed, setIsPrnFixed] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();

  useEffect(() => {
    const prnFromState = location.state?.prn;
    if (prnFromState) {
      setDefaultValues({
        prn: prnFromState,
        full_name: location.state?.expected_name || "",
        department: location.state?.expected_department || "",
      });
      setIsPrnFixed(true);
    } else {
      setDefaultValues({});
      setIsPrnFixed(false);
    }
  }, [location.state]);

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await studentRegister(data);
      sessionStorage.setItem("last_registration", JSON.stringify(result));
      toast.success("Registration successful! Your login password will be sent to your email in 1 minute.");
      navigate("/success");
    } catch (error) {
      toast.error(error.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-10 animate-fade-up">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 md:text-3xl">
              First Year Induction Registration
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Fill in your details below to register for the induction program. Fields marked with <span className="text-red-500">*</span> are mandatory.
            </p>
          </div>

          <Link
            to="/student-login"
            className="btn-secondary !px-4 !py-2.5 text-xs font-bold whitespace-nowrap self-start sm:self-auto flex items-center gap-2 border-primary-200 text-primary-700 bg-white hover:bg-primary-50 shadow-sm"
          >
            <FaSignInAlt className="text-primary-600" /> Already Registered? Log In
          </Link>
        </div>

        <div className="card p-4 sm:p-10 shadow-xl border-t-4 border-t-primary-600">
          <StudentForm
            onSubmit={handleSubmit}
            submitLabel="Submit Registration"
            loading={loading}
            defaultValues={defaultValues}
            readOnlyPrn={isPrnFixed}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
