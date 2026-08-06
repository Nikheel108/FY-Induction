"""
Generate placeholder PDF documents for the ``backend/uploads`` folder.

The real schedule / campus map / handbook PDFs should be placed there later;
these placeholders let the app run and send emails out of the box. The script
uses pure Python (no third-party dependencies) to emit minimal valid PDFs.

Usage::

    python create_sample_docs.py
"""

import os

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

DOCUMENTS = [
    ("schedule.pdf", "Day-wise Schedule of the First Year Induction Program"),
    ("campus_map.pdf", "Campus Map - MIT Academy of Engineering"),
    ("student_handbook.pdf", "Student Handbook - MIT Academy of Engineering"),
    ("academic_calendar.pdf", "Academic Calendar 2026-27"),
]


def make_pdf(title):
    """
    Build a minimal but valid single-page PDF whose body is ``title``.

    The xref table offsets are computed programmatically so the file parses in
    any modern PDF viewer.
    """
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
         b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"),
        None,  # content stream, built below (depends on title length)
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    content = (
        b"BT /F1 20 Tf 72 720 Td <"
        + title.encode("latin-1", "replace").hex().encode()
        + b"> Tj ET"
    )
    objects[3] = (b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n"
                  + content + b"\nendstream")

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    body = b""
    offsets = []
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(header) + len(body))
        body += f"{index} 0 obj\n".encode() + obj + b"\nendobj\n"

    xref_pos = len(header) + len(body)
    xref = f"xref\n0 {len(objects) + 1}\n".encode()
    xref += b"0000000000 65535 f \n"
    for offset in offsets:
        xref += f"{offset:010d} 00000 n \n".encode()
    trailer = (f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
               f"startxref\n{xref_pos}\n%%EOF\n").encode()

    return header + body + xref + trailer


def main():
    """Create all placeholder documents inside the uploads directory."""
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    for filename, title in DOCUMENTS:
        path = os.path.join(UPLOADS_DIR, filename)
        with open(path, "wb") as fh:
            fh.write(make_pdf(title))
        print(f"Created {path}")


if __name__ == "__main__":
    main()
