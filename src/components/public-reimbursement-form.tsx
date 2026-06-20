"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { upload } from "@vercel/blob/client";
import { reimbursementBaseSchema, type AttachmentInput } from "@/lib/validators";
import { createReimbursement } from "@/actions/reimbursements";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import { formatBRL } from "@/lib/utils";

type FormIn = z.input<typeof reimbursementBaseSchema>;
type FormOut = z.output<typeof reimbursementBaseSchema>;

type Option = { id: number; name: string };

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Converte o que o usuário digita (só dígitos = centavos) em reais. */
function digitsToReais(raw: string): number | undefined {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  return Number(digits) / 100;
}

type NoteErrors = {
  supplierName?: string;
  fiscalDocNumber?: string;
  amount?: string;
  files?: string;
};

type NoteDraft = {
  supplierName: string;
  fiscalDocNumber: string;
  amount?: number;
  files: File[];
  errors: NoteErrors;
};

const emptyNote = (): NoteDraft => ({
  supplierName: "",
  fiscalDocNumber: "",
  amount: undefined,
  files: [],
  errors: {},
});

export function PublicReimbursementForm({
  departments,
  expenseTypes,
}: {
  departments: Option[];
  expenseTypes: Option[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteDraft[]>([emptyNote()]);
  const [submitError, setSubmitError] = useState<string>();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(reimbursementBaseSchema),
    defaultValues: {
      requesterName: "",
      expenseDate: "",
      description: "",
      payeeName: "",
      paymentDetails: "",
    },
  });

  function patchNote(index: number, patch: Partial<NoteDraft>) {
    setNotes((prev) =>
      prev.map((n, i) => (i === index ? { ...n, ...patch } : n)),
    );
  }

  function addNoteRow() {
    setNotes((prev) => [...prev, emptyNote()]);
  }

  function removeNoteRow(index: number) {
    setNotes((prev) => prev.filter((_, i) => i !== index));
  }

  function onPickFiles(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setNotes((prev) =>
      prev.map((n, i) =>
        i === index
          ? { ...n, files: [...n.files, ...picked], errors: { ...n.errors, files: undefined } }
          : n,
      ),
    );
    e.target.value = "";
  }

  function removeFile(noteIndex: number, fileIndex: number) {
    setNotes((prev) =>
      prev.map((n, i) =>
        i === noteIndex
          ? { ...n, files: n.files.filter((_, fi) => fi !== fileIndex) }
          : n,
      ),
    );
  }

  /** Valida as notas no cliente; retorna true se tudo ok. */
  function validateNotes(): boolean {
    let ok = true;
    setNotes((prev) =>
      prev.map((n) => {
        const errs: NoteErrors = {};
        if (!n.supplierName.trim()) errs.supplierName = "Informe o fornecedor.";
        if (!n.fiscalDocNumber.trim())
          errs.fiscalDocNumber = "Informe o número da nota.";
        if (!n.amount || n.amount <= 0) errs.amount = "Informe o valor da nota.";
        if (n.files.length === 0) errs.files = "Envie ao menos uma foto.";
        if (Object.keys(errs).length) ok = false;
        return { ...n, errors: errs };
      }),
    );
    return ok;
  }

  async function onSubmit(values: FormOut) {
    setSubmitError(undefined);
    if (!validateNotes()) return;

    try {
      const notesPayload = [];
      for (const n of notes) {
        const attachments: AttachmentInput[] = [];
        for (const file of n.files) {
          const blob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/upload",
          });
          attachments.push({
            url: blob.url,
            pathname: blob.pathname,
            contentType: file.type,
            size: file.size,
          });
        }
        notesPayload.push({
          supplierName: n.supplierName,
          fiscalDocNumber: n.fiscalDocNumber,
          amount: n.amount as number,
          attachments,
        });
      }

      const result = await createReimbursement({ ...values, notes: notesPayload });
      if (result.ok) {
        const params = new URLSearchParams({
          protocolo: String(result.id),
          valor: String(values.amount),
          data: new Date().toISOString(),
        });
        router.push(`/enviado?${params.toString()}`);
        return;
      }
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof FormIn, { message });
        }
      }
      setSubmitError(result.error ?? "Verifique os campos e tente novamente.");
    } catch {
      setSubmitError(
        "Não foi possível enviar agora. Verifique as fotos e tente novamente.",
      );
    }
  }

  const notesTotal = notes.reduce((s, n) => s + (n.amount ?? 0), 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Nome" error={errors.requesterName?.message} required>
          <Input {...register("requesterName")} placeholder="Seu nome completo" />
        </Field>
        <Field
          label="Data da despesa"
          error={errors.expenseDate?.message}
          required
        >
          <Input type="date" {...register("expenseDate")} />
        </Field>
        <Field
          label="Departamento"
          error={errors.departmentId?.message}
          required
        >
          <Select defaultValue="" {...register("departmentId")}>
            <option value="" disabled>
              Selecione…
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Tipo de despesa"
          error={errors.expenseTypeId?.message}
          required
        >
          <Select defaultValue="" {...register("expenseTypeId")}>
            <option value="" disabled>
              Selecione…
            </option>
            {expenseTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Valor a reembolsar"
          error={errors.amount?.message}
          required
        >
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <Input
                inputMode="numeric"
                value={
                  field.value === undefined || field.value === ""
                    ? ""
                    : brlFormatter.format(Number(field.value))
                }
                onChange={(e) => field.onChange(digitsToReais(e.target.value))}
                onBlur={field.onBlur}
                placeholder="R$ 0,00"
              />
            )}
          />
        </Field>
      </div>

      <Field
        label="Descrição da despesa"
        error={errors.description?.message}
        required
      >
        <Textarea
          {...register("description")}
          placeholder="Descreva o que foi a despesa"
        />
      </Field>

      {/* Notas fiscais (1 ou mais) */}
      <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Notas fiscais
        </legend>

        {notes.map((note, i) => (
          <div
            key={i}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                Nota {i + 1}
              </span>
              {notes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeNoteRow(i)}
                  className="text-sm text-rose-600 hover:underline"
                >
                  remover nota
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Fornecedor" error={note.errors.supplierName} required>
                <Input
                  value={note.supplierName}
                  onChange={(e) =>
                    patchNote(i, {
                      supplierName: e.target.value,
                      errors: { ...note.errors, supplierName: undefined },
                    })
                  }
                  placeholder="Quem emitiu a nota"
                />
              </Field>
              <Field
                label="Número da nota"
                error={note.errors.fiscalDocNumber}
                required
              >
                <Input
                  value={note.fiscalDocNumber}
                  onChange={(e) =>
                    patchNote(i, {
                      fiscalDocNumber: e.target.value,
                      errors: { ...note.errors, fiscalDocNumber: undefined },
                    })
                  }
                  placeholder="Nº da nota / cupom"
                />
              </Field>
              <Field label="Valor da nota" error={note.errors.amount} required>
                <Input
                  inputMode="numeric"
                  value={
                    note.amount === undefined
                      ? ""
                      : brlFormatter.format(note.amount)
                  }
                  onChange={(e) =>
                    patchNote(i, {
                      amount: digitsToReais(e.target.value),
                      errors: { ...note.errors, amount: undefined },
                    })
                  }
                  placeholder="R$ 0,00"
                />
              </Field>
            </div>

            <div>
              <Label>
                Fotos da nota<span className="text-rose-600"> *</span>
              </Label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500 hover:bg-slate-100">
                <span className="font-medium text-slate-700">
                  Toque para escolher ou tirar foto
                </span>
                <span className="text-xs">
                  JPG, PNG, HEIC ou PDF (até 10 MB cada)
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickFiles(i, e)}
                />
              </label>
              {note.errors.files && (
                <p className="mt-1 text-sm text-rose-600">{note.errors.files}</p>
              )}
              {note.files.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {note.files.map((f, fi) => (
                    <li
                      key={fi}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <span className="truncate text-slate-700">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i, fi)}
                        className="ml-3 text-rose-600 hover:underline"
                      >
                        remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <Button type="button" size="sm" variant="outline" onClick={addNoteRow}>
            + Adicionar nota
          </Button>
          <span className="text-sm text-slate-500">
            Soma das notas: <strong>{formatBRL(notesTotal)}</strong>
          </span>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Dados para reembolso
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Nome do recebedor"
            error={errors.payeeName?.message}
            required
          >
            <Input {...register("payeeName")} placeholder="Nome de quem recebe" />
          </Field>
          <Field
            label="Dados bancários / PIX"
            error={errors.paymentDetails?.message}
            required
          >
            <Input
              {...register("paymentDetails")}
              placeholder="Chave PIX ou banco/agência/conta"
            />
          </Field>
        </div>
      </fieldset>

      {submitError && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {submitError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Enviando…" : "Enviar solicitação"}
      </Button>
      <p className="text-xs text-slate-400">
        Ao enviar, sua solicitação entra como <strong>novo</strong> para
        conferência do tesoureiro.
      </p>
    </form>
  );
}
