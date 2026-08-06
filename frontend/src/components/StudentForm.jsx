import { useForm } from "react-hook-form";

import { BLOOD_GROUPS, DEPARTMENTS, DIVISIONS, GENDERS, HOSTEL_STATUSES, STATES } from "../constants";
import { Field, SelectInput, TextArea, TextInput } from "./fields";

// Shared validation rules for the student + parent form sections.
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

const PINCODE_RULES = {
  required: "PIN code is required",
  pattern: { value: /^\d{6}$/, message: "PIN code must be exactly 6 digits" },
};

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
  } = useForm({ defaultValues });

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

          <Field label="Roll Number" error={errors.roll_number?.message}>
            <TextInput {...register("roll_number")} error={errors.roll_number} placeholder="Optional" />
          </Field>

          <Field label="Department" required error={errors.department?.message}>
            <SelectInput {...register("department", { required: "Department is required" })} error={errors.department}>
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Division" required error={errors.division?.message}>
            <SelectInput {...register("division", { required: "Division is required" })} error={errors.division}>
              <option value="">Select division</option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Gender" required error={errors.gender?.message}>
            <SelectInput {...register("gender", { required: "Gender is required" })} error={errors.gender}>
              <option value="">Select gender</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Date of Birth" required error={errors.dob?.message}>
            <TextInput
              type="date"
              {...register("dob", { required: "Date of birth is required" })}
              error={errors.dob}
            />
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

          <Field label="WhatsApp Number" error={errors.whatsapp?.message}>
            <TextInput
              type="tel"
              {...register("whatsapp", { pattern: { value: /^(?:\+91[\s-]?|0)?[6-9]\d{9}$/, message: "Enter a valid 10-digit mobile number" } })}
              error={errors.whatsapp}
              placeholder="Optional"
            />
          </Field>

          <Field label="Address" required error={errors.address?.message}>
            <TextArea {...register("address", { required: "Address is required" })} error={errors.address} />
          </Field>

          <Field label="City" required error={errors.city?.message}>
            <TextInput {...register("city", { required: "City is required" })} error={errors.city} placeholder="e.g. Pune" />
          </Field>

          <Field label="State" required error={errors.state?.message}>
            <SelectInput {...register("state", { required: "State is required" })} error={errors.state}>
              <option value="">Select state</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>

          <Field label="PIN Code" required error={errors.pincode?.message}>
            <TextInput {...register("pincode", PINCODE_RULES)} error={errors.pincode} placeholder="e.g. 411001" />
          </Field>

          <Field label="Blood Group" required error={errors.blood_group?.message}>
            <SelectInput {...register("blood_group", { required: "Blood group is required" })} error={errors.blood_group}>
              <option value="">Select blood group</option>
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Hostel / Day Scholar" required error={errors.hostel_status?.message}>
            <SelectInput {...register("hostel_status", { required: "Please select hostel status" })} error={errors.hostel_status}>
              <option value="">Select status</option>
              {HOSTEL_STATUSES.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Emergency Contact Number" required error={errors.emergency_contact?.message}>
            <TextInput type="tel" {...register("emergency_contact", PHONE_RULES)} error={errors.emergency_contact} placeholder="10-digit number" />
          </Field>
        </div>
      </section>

      {/* ===================== Parent Information ===================== */}
      <section>
        <h3 className="section-title mb-4 border-l-4 border-primary-700 pl-3">Parent / Guardian Information</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Father Name" required error={errors.father_name?.message}>
            <TextInput {...register("father_name", { required: "Father name is required" })} error={errors.father_name} />
          </Field>
          <Field label="Father Email" required error={errors.father_email?.message}>
            <TextInput type="email" {...register("father_email", EMAIL_RULES())} error={errors.father_email} />
          </Field>
          <Field label="Father Mobile" required error={errors.father_phone?.message}>
            <TextInput type="tel" {...register("father_phone", PHONE_RULES)} error={errors.father_phone} />
          </Field>

          <Field label="Mother Name" required error={errors.mother_name?.message}>
            <TextInput {...register("mother_name", { required: "Mother name is required" })} error={errors.mother_name} />
          </Field>
          <Field label="Mother Email" required error={errors.mother_email?.message}>
            <TextInput type="email" {...register("mother_email", EMAIL_RULES())} error={errors.mother_email} />
          </Field>
          <Field label="Mother Mobile" required error={errors.mother_phone?.message}>
            <TextInput type="tel" {...register("mother_phone", PHONE_RULES)} error={errors.mother_phone} />
          </Field>

          <Field label="Guardian Name" hint="Optional" error={errors.guardian_name?.message}>
            <TextInput {...register("guardian_name")} error={errors.guardian_name} />
          </Field>
          <Field label="Guardian Email" error={errors.guardian_email?.message}>
            <TextInput
              type="email"
              {...register("guardian_email", EMAIL_RULES(false))}
              error={errors.guardian_email}
            />
          </Field>
          <Field label="Guardian Mobile" error={errors.guardian_phone?.message}>
            <TextInput
              type="tel"
              {...register("guardian_phone", { pattern: { value: /^(?:\+91[\s-]?|0)?[6-9]\d{9}$/, message: "Enter a valid 10-digit mobile number" } })}
              error={errors.guardian_phone}
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Please wait..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
