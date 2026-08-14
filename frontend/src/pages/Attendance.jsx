import { useState, useEffect } from 'react';
import { FaClock, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

import { useToast } from '../context/ToastContext';
import { submitAttendance, getActiveSession } from '../services/attendanceService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Attendance() {
  const [prn, setPrn] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  
  const toast = useToast();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await getActiveSession();
        if (res.active_session) {
          setActiveSession(res.active_session);
        } else {
          setActiveSession(null);
          setIsExpired(true);
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      } finally {
        setSessionLoading(false);
      }
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (!activeSession) return;

    // Calculate end time: start_time + duration + 5 mins grace period
    const startTime = new Date(activeSession.start_time + 'Z').getTime();
    const endTime = startTime + (activeSession.duration_minutes + 5) * 60000;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeRemaining("00:00");
        setIsExpired(true);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prn.trim()) {
      toast.error('Please enter your PRN.');
      return;
    }
    setLoading(true);
    try {
      const res = await submitAttendance(prn.trim());
      toast.success(res.message);
      setPrn('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:py-12 flex flex-col justify-center">
        
        {sessionLoading ? (
          <div className="text-center p-8">Loading attendance session...</div>
        ) : !activeSession || isExpired ? (
          <div className="card p-8 text-center animate-fade-up">
             <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
               <FaExclamationTriangle className="text-3xl" />
             </div>
             <h2 className="text-xl font-bold text-slate-800">No Active Session</h2>
             <p className="mt-2 text-slate-500">
               There is currently no active attendance session, or the time limit has expired. Please wait for the admin to start a new session.
             </p>
          </div>
        ) : (
          <div className="card overflow-hidden animate-fade-up border-primary-200">
            {/* Header banner */}
            <div className="bg-primary-50 px-6 py-4 border-b border-primary-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold text-primary-900">{activeSession.title}</h1>
                <p className="text-xs font-medium text-primary-700 mt-1 flex items-center gap-1">
                   <FaCheckCircle /> Attendance is Open
                </p>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-primary-100">
                <FaClock className="text-amber-500 animate-pulse" />
                <span className="font-mono font-bold text-slate-800">{timeRemaining || "--:--"}</span>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 sm:p-8">
              <p className="text-sm text-slate-500 mb-6">
                Enter your PRN below to mark your attendance for this session. 
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Permanent Registration Number (PRN)</label>
                  <input
                    type="text"
                    className="input-field mt-1 text-lg py-3"
                    value={prn}
                    onChange={(e) => setPrn(e.target.value)}
                    placeholder="e.g. PRN260101"
                    disabled={loading || isExpired}
                    autoFocus
                  />
                </div>
                
                <button
                  type="submit"
                  className="btn-primary w-full py-3 text-base"
                  disabled={loading || isExpired}
                >
                  {loading ? 'Submitting...' : 'Mark Present'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}