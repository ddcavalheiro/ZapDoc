"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { upload } from "@vercel/blob/client";
import { reimbursementBaseSchema, type AttachmentInput } from "@/lib/validators";
import { createReimbursement } from "@/actions/reimbursements";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type FormIn = z.input<typeof reimbursementBaseSchema>;
type FormOut = z.output<typeof reimbursementBaseSchema>;

type Option = { id: number; name: string };

type PendingFile = {
  file: File;
  uploaded?: AttachmentInput;
};

export function PublicReimbursementForm({
  departments,
  expenseTypes,
}: {
  departments: Option[];
  expenseTypes: Option[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [filesError, setFilesError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(reimbursementBaseSchema),
    defaultValues: {
      requesterName: "",
      expenseDate: "",
      description: "",
      supplierName: "",
      fiscalDocNumber: "",
      payeeName: "",
      paymentDetails: "",
    },
  });

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setFilesError(undefined);
    setFiles((prev) => [...prev, ...picked.map((file) => ({ file }))]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: FormOut) {
    setSubmitError(undefined);
    if (files.length === 0) {
      setFilesError("Envie ao menos uma foto da nota fiscal.");
      return;
    }

    try {
      // Faz upload das fotos ainda não enviadas ao Vercel Blob.
      const attachments: AttachmentInput[] = [];
      for (const item of files) {
        if (item.uploaded) {
          attachments.push(item.uploaded);
          continue;
        }
        const blob = await upload(item.file.name, item.file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        attachments.push({
          url: blob.url,
          pathname: blob.pathname,
          contentType: item.file.type,
          size: item.file.size,
        });
      }

      const result = await createReimbursement({ ...values, attachments });
      if (result.ok) {
        router.push(`/enviado?protocolo=${result.id}`);
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
          label="Nome do fornecedor"
          error={errors.supplierName?.message}
          required
        >
          <Input {...register("supplierName")} placeholder="Quem emitiu a nota" />
        </Field>
        <Field
          label="Número do documento fiscal"
          error={errors.fiscalDocNumber?.message}
          required
        >
          <Input {...register("fiscalDocNumber")} placeholder="Nº da nota / cupom" />
        </Field>
        <Field label="Valor (R$)" error={errors.amount?.message} required>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register("amount")}
            placeholder="0,00"
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

      <div>
        <p className="mb-1 block text-sm font-medium text-slate-700">
          Fotos das notas / cupons / recibos
          <span className="text-rose-600"> *</span>
        </p>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 hover:bg-slate-100">
          <span className="font-medium text-slate-700">
            Toque para escolher ou tirar foto
          </span>
          <span className="text-xs">JPG, PNG, HEIC ou PDF (até 10 MB cada)</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />
        </label>
        {filesError && (
          <p className="mt-1 text-sm text-rose-600">{filesError}</p>
        )}
        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="truncate text-slate-700">{f.file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-3 text-rose-600 hover:underline"
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {submitError && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {submitError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Enviando…" : "Enviar solicitação"}
      </Button>
      <p className="text-xs text-slate-400">
        Ao enviar, sua solicitação entra como <strong>pendente</strong> para
        conferência do tesoureiro.
      </p>
    </form>
  );
}
