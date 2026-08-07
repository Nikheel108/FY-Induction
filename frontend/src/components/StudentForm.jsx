import { useForm } from "react-hook-form";

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
export default function StudentForm({ defaultValues = {}, onSubmit, submitLabel = "Submit", loading = false }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      full_name: "",
      prn: "",
      department: DEPARTMENTS[0],  // pre-select the only available department
      student_email: "",
      student_phone: "",
      parent_name: "",
      parent_email: "",
      parent_phone: "",
      ...defaultValues, // override with provided defaults (e.g., when editing)
    },
  });

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