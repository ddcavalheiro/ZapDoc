"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  addNote,
  addNoteAttachments,
  deleteNote,
  deleteNoteAttachment,
  updateNote,
} from "@/actions/reimbursements";
import type { AttachmentInput } from "@/lib/validators";
import type { NoteWithAttachments } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/field";
import { formatBRL } from "@/lib/utils";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function digitsToReais(raw: string): number | undefined {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  return Number(digits) / 100;
}

async function uploadFiles(files: File[]): Promise<AttachmentInput[]> {
  const out: AttachmentInput[] = [];
  for (const file of files) {
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
    });
    out.push({
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
      size: file.size,
    });
  }
  return out;
}

function AttachmentThumb({
  url,
  contentType,
  onRemove,
}: {
  url: string;
  contentType: string | null;
  onRemove: () => void;
}) {
  const isImage = (contentType ?? "").startsWith("image/");
  return (
    <div className="group relative overflow-hidden rounded-md border border-slate-200">
      <a href={url} target="_blank" rel="noopener noreferrer">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Foto da nota"
            className="h-24 w-full object-cover"
          />
        ) : (
          <div className="flex h-24 items-center justify-center bg-slate-50 text-sm text-slate-500">
            📄 PDF
          </div>
        )}
      </a>
      <button
        type="button"
        onClick={onRemove}
        title="Remover foto"
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs text-white opacity-90 hover:bg-rose-500"
      >
        ×
      </button>
    </div>
  );
}

function NoteRow({
  note,
  reimbursementId,
}: {
  note: NoteWithAttachments;
  reimbursementId: number;
}) {
  const router = useRouter();
  const [supplierName, setSupplierName] = useState(note.supplierName);
  const [fiscalDocNumber, setFiscalDocNumber] = useState(note.fiscalDocNumber);
  const [amount, setAmount] = useState<number | undefined>(Number(note.amount));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const [error, setError] = useState<string>();

  async function onSave() {
    setBusy(true);
    setMsg(undefined);
    setError(undefined);
    const res = await updateNote(note.id, reimbursementId, {
      supplierName,
      fiscalDocNumber,
      amount,
    });
    setBusy(false);
    if (res.ok) {
      setMsg("Salvo.");
      router.refresh();
    } else {
      setError(res.error ?? "Não foi possível salvar a nota.");
    }
  }

  async function onDelete() {
    if (!confirm("Remover esta nota e suas fotos?")) return;
    setBusy(true);
    const res = await deleteNote(note.id, reimbursementId);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error ?? "Não foi possível remover.");
  }

  async function onAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError(undefined);
    try {
      const attachments = await uploadFiles(files);
      const res = await addNoteAttachments(note.id, reimbursementId, attachments);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Falha ao adicionar fotos.");
    } catch {
      setError("Falha no upload das fotos.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemovePhoto(attId: number) {
    setBusy(true);
    setError(undefined);
    const res = await deleteNoteAttachment(attId, note.id, reimbursementId);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error ?? "Não foi possível remover a foto.");
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Fornecedor">
          <Input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />
        </Field>
        <Field label="Número da nota">
          <Input
            value={fiscalDocNumber}
            onChange={(e) => setFiscalDocNumber(e.target.value)}
          />
        </Field>
        <Field label="Valor da nota">
          <Input
            inputMode="numeric"
            value={amount === undefined ? "" : brlFormatter.format(amount)}
            onChange={(e) => setAmount(digitsToReais(e.target.value))}
          />
        </Field>
      </div>

      <div>
        <Label>Fotos ({note.attachments.length})</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {note.attachments.map((a) => (
            <AttachmentThumb
              key={a.id}
              url={a.blobUrl}
              contentType={a.contentType}
              onRemove={() => onRemovePhoto(a.id)}
            />
          ))}
          <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-white text-center text-xs text-slate-500 hover:bg-slate-100">
            + fotos
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={onAddPhotos}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={onSave} disabled={busy}>
          {busy ? "…" : "Salvar nota"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={onDelete}
          disabled={busy}
        >
          Remover nota
        </Button>
        {msg && <span className="text-sm text-emerald-600">{msg}</span>}
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>
    </div>
  );
}

function AddNoteForm({ reimbursementId }: { reimbursementId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [fiscalDocNumber, setFiscalDocNumber] = useState("");
  const [amount, setAmount] = useState<number | undefined>();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  function reset() {
    setSupplierName("");
    setFiscalDocNumber("");
    setAmount(undefined);
    setFiles([]);
    setError(undefined);
  }

  async function onAdd() {
    setError(undefined);
    if (!supplierName.trim() || !fiscalDocNumber.trim() || !amount || files.length === 0) {
      setError("Preencha fornecedor, número, valor e ao menos uma foto.");
      return;
    }
    setBusy(true);
    try {
      const attachments = await uploadFiles(files);
      const res = await addNote(reimbursementId, {
        supplierName,
        fiscalDocNumber,
        amount,
        attachments,
      });
      if (res.ok) {
        reset();
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Não foi possível adicionar a nota.");
      }
    } catch {
      setError("Falha no upload das fotos.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        + Adicionar nota
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Fornecedor">
          <Input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
          />
        </Field>
        <Field label="Número da nota">
          <Input
            value={fiscalDocNumber}
            onChange={(e) => setFiscalDocNumber(e.target.value)}
          />
        </Field>
        <Field label="Valor da nota">
          <Input
            inputMode="numeric"
            value={amount === undefined ? "" : brlFormatter.format(amount)}
            onChange={(e) => setAmount(digitsToReais(e.target.value))}
            placeholder="R$ 0,00"
          />
        </Field>
      </div>
      <div>
        <Label>Fotos da nota</Label>
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-sm text-slate-600"
        />
        {files.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            {files.length} arquivo(s) selecionado(s)
          </p>
        )}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onAdd} disabled={busy}>
          {busy ? "Enviando…" : "Adicionar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={busy}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function NotesManager({
  reimbursementId,
  total,
  notes,
}: {
  reimbursementId: number;
  total: number | string;
  notes: NoteWithAttachments[];
}) {
  const notesTotal = notes.reduce((s, n) => s + Number(n.amount), 0);
  const totalNum = Number(total);
  const matches = Math.abs(notesTotal - totalNum) < 0.005;

  return (
    <div className="space-y-4">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-sm ${
          matches
            ? "bg-emerald-50 text-emerald-800"
            : "bg-amber-50 text-amber-800"
        }`}
      >
        <span>
          Soma das notas: <strong>{formatBRL(notesTotal)}</strong> · Total
          solicitado: <strong>{formatBRL(totalNum)}</strong>
        </span>
        <span className="font-medium">
          {matches ? "✓ valores conferem" : "⚠ valores divergentes"}
        </span>
      </div>

      {notes.length === 0 && (
        <p className="text-sm text-slate-400">Nenhuma nota cadastrada.</p>
      )}

      {notes.map((note) => (
        <NoteRow key={note.id} note={note} reimbursementId={reimbursementId} />
      ))}

      <AddNoteForm reimbursementId={reimbursementId} />
    </div>
  );
}
