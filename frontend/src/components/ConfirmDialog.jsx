import { FaExclamationTriangle } from "react-icons/fa";

import Modal from "./Modal";

/**
 * Confirmation dialog for destructive actions (e.g. deleting a student).
 */
export default function ConfirmDialog({ open, onClose, onConfirm, title, message, loading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
          <FaExclamationTriangle className="text-xl" />
        </span>
        <p className="text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </Modal>
  );
}
