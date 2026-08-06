import * as XLSX from "xlsx";

/**
 * Client-side export helpers: plain CSV and real .xlsx via the SheetJS library.
 */

// Maps the API field names to human-friendly column headers used in exports.
const COLUMNS = [
  ["registration_id", "Registration ID"],
  ["full_name", "Full Name"],
  ["prn", "PRN"],
  ["department", "Department"],
  ["student_email", "Student Email"],
  ["student_phone", "Student Phone"],
  ["parent_name", "Parent Name"],
  ["parent_email", "Parent Email"],
  ["parent_phone", "Parent Phone"],
  ["created_at", "Registered On"],
];

function mapRows(students) {
  return students.map((student) => {
    const row = {};
    COLUMNS.forEach(([key, label]) => {
      row[label] = student[key] ?? "";
    });
    return row;
  });
}

function fileDate() {
  return new Date().toISOString().slice(0, 10);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Download the given students as a UTF-8 CSV file.
 */
export function exportCSV(students) {
  const rows = mapRows(students);
  const headers = COLUMNS.map(([, label]) => label);
  const lines = rows.map((row) =>
    headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [headers.map((h) => `"${h}"`).join(","), ...lines].join("\r\n");
  downloadBlob(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), `students_${fileDate()}.csv`);
}

/**
 * Download the given students as a real .xlsx Excel workbook.
 */
export function exportExcel(students) {
  const worksheet = XLSX.utils.json_to_sheet(mapRows(students));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
  XLSX.writeFile(workbook, `students_${fileDate()}.xlsx`);
}
