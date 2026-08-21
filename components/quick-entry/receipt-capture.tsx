"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { MAX_RECEIPT_BYTES, type OcrResult } from "@/lib/ocr";
import { Button } from "@/components/ui/button";

export function ReceiptCapture({
  onResult,
}: {
  onResult: (result: OcrResult, receiptPath: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later.
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_RECEIPT_BYTES) {
      toast.error("That image is over 8MB. Try a smaller photo.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // 1. Upload to the private receipts bucket, namespaced by user id (FR-7).
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      // 2. Send the image to OCR (FR-8). This route never hard-fails.
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/ocr", { method: "POST", body });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        throw new Error(error || "OCR failed");
      }
      const result = (await res.json()) as OcrResult;

      // 3. Prefill the form; store the receipt path for save (FR-9/FR-10).
      onResult(result, path);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Couldn't scan receipt: ${err.message}. Enter it manually.`
          : "Couldn't scan receipt. Enter it manually.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 w-full text-base"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {loading ? "Scanning receipt…" : "Scan a receipt"}
      </Button>
    </>
  );
}
