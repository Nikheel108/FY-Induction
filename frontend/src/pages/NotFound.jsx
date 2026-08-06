import { Link } from "react-router-dom";
import { FaCompass } from "react-icons/fa";

/**
 * Friendly 404 page.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <p className="text-8xl font-extrabold text-primary-700">404</p>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link to="/" className="btn-primary mt-6">
          <FaCompass /> Back to Home
        </Link>
      </div>
    </div>
  );
}
