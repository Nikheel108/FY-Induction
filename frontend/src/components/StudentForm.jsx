import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { FaCamera, FaUpload, FaTimes } from "react-icons/fa";

import { DEPARTMENTS } from "../constants";
import { Field, SelectInput, TextInput } from "./fields";

// Shared validation rules for the registration form.
const PHONE_RULES = {
  required: "Phone number is required",
  pattern: {
    value: /^(?:\+91[\s-]?|0)?[6-9]\d{9}$/,
    message: "Enter a valid 10-digit mobile number",
  },
};

const EMAIL_RULES = (required = true) => ({
  required: required ? "Email is required" : false,
  pattern: { value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, message: "Enter a valid email address" },
});

/**
 * Reusable registration form.
 *
 * Used on the public Register page and inside the admin "Edit Student" modal.
 * Handles client-side validation via react-hook-form; the backend re-validates
 * everything server-side.
 */
export default function StudentForm({ defaultValues = {}, onSubmit, submitLabel = "Submit", loading = false, readOnlyPrn = false }) {
  const [photoPreview, setPhotoPreview] = useState(defaultValues.photo_base64 || null);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      full_name: defaultValues.full_name || "",
      prn: defaultValues.prn || "",
      department: defaultValues.department || DEPARTMENTS[0],
      student_email: defaultValues.student_email || "",
      student_phone: defaultValues.student_phone || "",
      parent_name: defaultValues.parent_name || "",
      parent_email: defaultValues.parent_email || "",
      parent_phone: defaultValues.parent_phone || "",
      photo_base64: defaultValues.photo_base64 || "",
    },
  });

  useEffect(() => {
    if (defaultValues && defaultValues.prn) {
      reset({
        full_name: defaultValues.full_name || "",
        prn: defaultValues.prn || "",
        department: defaultValues.department || DEPARTMENTS[0],
        student_email: defaultValues.student_email || "",
        student_phone: defaultValues.student_phone || "",
        parent_name: defaultValues.parent_name || "",
        parent_email: defaultValues.parent_email || "",
        parent_phone: defaultValues.parent_phone || "",
        photo_base64: defaultValues.photo_base64 || "",
      });
    }
  }, [defaultValues, reset]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // We only accept images
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize down to max 300x300 to save bandwidth & db space
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to highly compressed JPEG
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        setPhotoPreview(dataUrl);
        setValue("photo_base64", dataUrl, { shouldDirty: true });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setValue("photo_base64", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      {/* ===================== Student Information ===================== */}
      <section>
        <h3 className="section-title mb-4 border-l-4 border-primary-700 pl-3">Student Information</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full Name" required error={errors.full_name?.message}>
            <TextInput
              {...register("full_name", { required: "Full name is required", minLength: { value: 3, message: "Name must be at least 3 characters" } })}
              error={errors.full_name}
              placeholder="e.g. Aarav Sharma"
            />
          </Field>

          <Field label="PRN" required error={errors.prn?.message}>
            <TextInput
              {...register("prn", { required: "PRN is required" })}
              error={errors.prn}
              placeholder="e.g. PRN260101"
              disabled={readOnlyPrn}
              className={readOnlyPrn ? "bg-slate-100 cursor-not-allowed" : ""}
            />
          </Field>

          <Field label="Department" required error={errors.department?.message}>
            <SelectInput {...register("department", { required: "Department is required" })} error={errors.department}>
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Student Email" required error={errors.student_email?.message}>
            <TextInput
              type="email"
              {...register("student_email", EMAIL_RULES())}
              error={errors.student_email}
              placeholder="student@gmail.com"
            />
          </Field>

          <Field label="Mobile Number" required error={errors.student_phone?.message}>
            <TextInput
              type="tel"
              {...register("student_phone", PHONE_RULES)}
              error={errors.student_phone}
              placeholder="10-digit mobile number"
            />
          </Field>
          
          <div className="sm:col-span-2 lg:col-span-3 mt-4">
            <Field label="Student Photo (Optional for Receipt)">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {photoPreview ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs text-white hover:bg-red-600 transition"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
                    <FaCamera className="text-2xl" />
                    <span className="mt-1 text-[10px] font-medium">No Photo</span>
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handlePhotoChange}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-secondary !px-4 !py-2 !text-sm flex-1 sm:flex-none justify-center"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FaCamera /> Capture
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !px-4 !py-2 !text-sm flex-1 sm:flex-none justify-center"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.removeAttribute("capture");
                          fileInputRef.current.click();
                          fileInputRef.current.setAttribute("capture", "user"); // restore it afterwards
                        }
                      }}
                    >
                      <FaUpload /> Upload
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Take a selfie or upload a passport-size photo. This will be printed on your receipt.
                  </p>
                </div>
              </div>
            </Field>
          </div>
        </div>
      </section>

      {/* ===================== Parent Information ===================== */}
      <section>
        <h3 className="section-title mb-4 border-l-4 border-primary-700 pl-3">Parent Information</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Parent Name" required error={errors.parent_name?.message}>
            <TextInput {...register("parent_name", { required: "Parent name is required" })} error={errors.parent_name} />
          </Field>
          <Field label="Parent Email" required error={errors.parent_email?.message}>
            <TextInput type="email" {...register("parent_email", EMAIL_RULES())} error={errors.parent_email} />
          </Field>
          <Field label="Parent Mobile" required error={errors.parent_phone?.message}>
            <TextInput type="tel" {...register("parent_phone", PHONE_RULES)} error={errors.parent_phone} />
          </Field>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading}>
          {loading ? "Please wait..." : submitLabel}
        </button>
      </div>
    </form>
  );
}