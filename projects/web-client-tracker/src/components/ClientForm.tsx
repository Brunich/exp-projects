"use client";

import { useState, type FormEvent } from "react";
import type { Client, ClientStatus } from "@/lib/types";
import {
  isValidClientForm,
  validateClientForm,
  type ClientFormErrors,
  type ClientFormInput,
} from "@/lib/client-validation";

const STATUS_OPTIONS: Array<{ value: ClientStatus; label: string }> = [
  { value: "lead", label: "Lead" },
  { value: "active", label: "Active" },
  { value: "negotiating", label: "Negotiating" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
];

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

interface ClientFormProps {
  mode: "create" | "edit";
  initialValues?: Client;
  onSubmit: (input: ClientFormInput) => void;
  onCancel: () => void;
}

function toFormInput(client?: Client): ClientFormInput {
  return {
    name: client?.name ?? "",
    company: client?.company ?? "",
    email: client?.email ?? "",
    status: client?.status ?? "lead",
    nextFollowUp: client?.nextFollowUp ?? "",
    notes: client?.notes ?? "",
  };
}

export function ClientForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
}: ClientFormProps) {
  const [values, setValues] = useState<ClientFormInput>(
    toFormInput(initialValues),
  );
  const [errors, setErrors] = useState<ClientFormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange<K extends keyof ClientFormInput>(
    field: K,
    value: ClientFormInput[K],
  ) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (submitted) {
      setErrors(validateClientForm(nextValues));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const nextErrors = validateClientForm(values);
    setErrors(nextErrors);
    if (!isValidClientForm(values)) return;

    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3
          id="client-form-title"
          className="text-lg font-semibold text-zinc-900"
        >
          {mode === "create" ? "Add client" : "Edit client"}
        </h3>
        <p className="mt-1 text-sm text-zinc-600">
          {mode === "create"
            ? "Create a new pipeline entry with a follow-up date."
            : "Update client details and follow-up schedule."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="client-name"
          label="Name"
          error={errors.name}
          value={values.name}
          onChange={(value) => handleChange("name", value)}
        />
        <Field
          id="client-company"
          label="Company"
          error={errors.company}
          value={values.company}
          onChange={(value) => handleChange("company", value)}
        />
      </div>

      <Field
        id="client-email"
        label="Email"
        type="email"
        error={errors.email}
        value={values.email}
        onChange={(value) => handleChange("email", value)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="client-status"
            className="text-sm font-medium text-zinc-700"
          >
            Status
          </label>
          <select
            id="client-status"
            value={values.status}
            onChange={(event) =>
              handleChange("status", event.target.value as ClientStatus)
            }
            className={inputClassName}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.status ? (
            <p className="text-xs text-rose-600">{errors.status}</p>
          ) : null}
        </div>

        <Field
          id="client-follow-up"
          label="Next follow-up"
          type="date"
          error={errors.nextFollowUp}
          value={values.nextFollowUp}
          onChange={(value) => handleChange("nextFollowUp", value)}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="client-notes" className="text-sm font-medium text-zinc-700">
          Notes
        </label>
        <textarea
          id="client-notes"
          rows={3}
          value={values.notes ?? ""}
          onChange={(event) => handleChange("notes", event.target.value)}
          className={inputClassName}
          placeholder="Context for your next touchpoint"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          {mode === "create" ? "Add client" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  type?: string;
  onChange: (value: string) => void;
}

function Field({ id, label, value, error, type = "text", onChange }: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
