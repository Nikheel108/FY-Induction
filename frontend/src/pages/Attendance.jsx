import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { submitAttendance } from '../services/attendanceService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Attendance() {
  const [prn, setPrn] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prn.trim()) {
      toast.error('Please enter your PRN.');
      return;
    }
    setLoading(true);
    try {
      const res = await submitAttendance(prn.trim(), date);
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Mark Attendance</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            Enter your PRN to mark attendance for today.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">PRN</label>
              <input
                type="text"
                className="input-field"
                value={prn}
                onChange={(e) => setPrn(e.target.value)}
                placeholder="e.g. PRN260101"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Date</label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-slate-400">Only today's date is accepted.</p>
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}