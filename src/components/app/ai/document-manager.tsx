"use client";

import { useRef, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Globe,
  StickyNote,
  Upload,
  Trash2,
  Plus,
  Loader2,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  ingestTextDocument,
  ingestUrlDocument,
  ingestUploadedDocument,
  deleteAiDocument,
} from "@/actions/ai";
import { aiDocumentsQueryOptions } from "@/lib/query/ai";
import { queryKeys } from "@/lib/query/keys";
import {
  MAX_DOCUMENT_BYTES,
  ALLOWED_DOC_EXTENSIONS,
  STORAGE_BUCKET,
} from "@/lib/constants/ai";
import type { AiDocument } from "@/types/ai.types";

const SOURCE_ICON = {
  upload: FileText,
  url: Globe,
  text: StickyNote,
} as const;

export function DocumentManager({
  urlIngestionEnabled,
}: {
  urlIngestionEnabled: boolean;
}) {
  const { data: documents } = useSuspenseQuery(aiDocumentsQueryOptions());
  const [addOpen, setAddOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AiDocument | null>(null);
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useSnackbar();

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.aiDocuments() });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const res = await deleteAiDocument(toDelete.id);
    if (res.error) showError(res.error);
    else {
      showSuccess("Document removed.");
      await refresh();
    }
    setToDelete(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 pb-3">
        <div>
          <h2 className="text-sm font-semibold">Knowledge base</h2>
          <p className="text-xs text-muted-foreground">
            {documents.length} {documents.length === 1 ? "source" : "sources"} • used to answer your questions
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto [scrollbar-width:thin]">
        {documents.length === 0 ? (
          <div className="surface border border-dashed bg-muted/20 p-6 text-center text-xs text-muted-foreground">
            No documents yet. Add a file, a website URL, or paste notes so the assistant can use them.
          </div>
        ) : (
          documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} onDelete={() => setToDelete(doc)} />
          ))
        )}
      </div>

      <AddDocumentSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        urlIngestionEnabled={urlIngestionEnabled}
        onAdded={refresh}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Remove this document?"
        description={`"${toDelete?.title}" and its indexed content will be deleted. This can't be undone.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function DocumentRow({ doc, onDelete }: { doc: AiDocument; onDelete: () => void }) {
  const Icon = SOURCE_ICON[doc.source_type] ?? FileText;
  return (
    <div className="flex items-center gap-3 surface border bg-background px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{doc.title}</p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <StatusBadge doc={doc} />
          {doc.status === "ready" && (
            <span>• {doc.chunk_count} {doc.chunk_count === 1 ? "chunk" : "chunks"}</span>
          )}
        </p>
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onDelete}
        aria-label={`Delete ${doc.title}`}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function StatusBadge({ doc }: { doc: AiDocument }) {
  if (doc.status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 text-primary">
        <CircleCheck className="h-3 w-3" /> Ready
      </span>
    );
  }
  if (doc.status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1 text-destructive"
        title={doc.error ?? undefined}
      >
        <CircleAlert className="h-3 w-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-warning">
      <Loader2 className="h-3 w-3 animate-spin" /> Processing
    </span>
  );
}

function AddDocumentSheet({
  open,
  onClose,
  urlIngestionEnabled,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  urlIngestionEnabled: boolean;
  onAdded: () => Promise<void>;
}) {
  const { user } = useUser();
  const { showError, showSuccess } = useSnackbar();
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");

  async function done(message: string) {
    showSuccess(message);
    await onAdded();
    setUrl("");
    setNoteTitle("");
    setNoteText("");
    if (fileRef.current) fileRef.current.value = "";
    setPending(false);
    onClose();
  }

  async function handleUpload(file: File) {
    if (!user) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      showError("That file is larger than 10 MB.");
      return;
    }
    const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ALLOWED_DOC_EXTENSIONS.includes(ext as (typeof ALLOWED_DOC_EXTENSIONS)[number])) {
      showError("Supported files: PDF, TXT, or Markdown.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const path = `${user.id}/${crypto.randomUUID()}${ext}`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (error) throw new Error(error.message);
      const res = await ingestUploadedDocument(path, file.name, file.type);
      if (res.error) throw new Error(res.error);
      await done("File added to your knowledge base.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Upload failed.");
      setPending(false);
    }
  }

  async function handleUrl() {
    if (!url.trim()) return;
    setPending(true);
    const res = await ingestUrlDocument(url.trim());
    if (res.error) {
      showError(res.error);
      setPending(false);
    } else {
      await done("Website added to your knowledge base.");
    }
  }

  async function handleText() {
    if (!noteText.trim()) return;
    setPending(true);
    const res = await ingestTextDocument(noteTitle, noteText);
    if (res.error) {
      showError(res.error);
      setPending(false);
    } else {
      await done("Note added to your knowledge base.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add to knowledge base</SheetTitle>
          <SheetDescription>
            Add sources the assistant can search when answering you.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="upload" className="mt-6">
          <TabsList className="gap-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="url">Website</TabsTrigger>
            <TabsTrigger value="text">Note</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="pt-4">
            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-2 surface border border-dashed bg-muted/20 px-4 py-10 text-center transition-colors hover:bg-muted/40",
                pending && "pointer-events-none opacity-60",
              )}
            >
              {pending ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {pending ? "Processing…" : "Click to choose a file"}
              </span>
              <span className="text-xs text-muted-foreground">PDF, TXT, or Markdown • up to 10 MB</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Reset so re-selecting the same file (e.g. after a rejection) still fires onChange.
                e.target.value = "";
                if (file) void handleUpload(file);
              }}
            />
          </TabsContent>

          <TabsContent value="url" className="space-y-3 pt-4">
            {urlIngestionEnabled ? (
              <>
                <Input
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={pending}
                />
                <Button onClick={handleUrl} disabled={pending || !url.trim()} className="w-full gap-1.5">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  {pending ? "Crawling…" : "Add website"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  We crawl the page into clean text and index it.
                </p>
              </>
            ) : (
              <div className="surface border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
                URL ingestion isn&apos;t enabled. Add a <code>FIRECRAWL_API_KEY</code> to turn it on.
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" className="space-y-3 pt-4">
            <Input
              placeholder="Title (optional)"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              disabled={pending}
            />
            <textarea
              placeholder="Paste or type any text you want the assistant to know…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              disabled={pending}
              rows={8}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button onClick={handleText} disabled={pending || !noteText.trim()} className="w-full gap-1.5">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />}
              {pending ? "Adding…" : "Add note"}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
