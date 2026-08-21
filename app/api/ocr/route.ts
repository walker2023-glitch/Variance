import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { errorResponse, requireUser } from "@/lib/api";
import {
  buildOcrPrompt,
  MAX_RECEIPT_BYTES,
  sanitizeOcrResponse,
  type OcrResult,
} from "@/lib/ocr";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * POST /api/ocr
 * Accepts a multipart form with an `image` file. Sends it to Gemini for
 * structured extraction and returns a sanitized OcrResult. On any failure it
 * returns a safe empty result with needsReview=true and HTTP 200 so the client
 * can always fall back to a manual, editable form (FR-11).
 */
export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if ("response" in ctx) return ctx.response;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[ocr] GEMINI_API_KEY is not set");
    return NextResponse.json<OcrResult>(emptyResult(), { status: 200 });
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const value = formData.get("image");
    if (value instanceof File) file = value;
  } catch {
    return errorResponse("Expected multipart form data with an image", 400);
  }

  if (!file) {
    return errorResponse("No image provided", 400);
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return errorResponse("Image exceeds the 8MB limit", 413);
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return errorResponse("Unsupported image type", 415);
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent([
      { text: buildOcrPrompt() },
      { inlineData: { mimeType: file.type || "image/jpeg", data: base64 } },
    ]);

    const text = result.response.text();
    const sanitized = sanitizeOcrResponse(text);

    // Observability: log outcome only, never the raw model response (PII).
    console.info(
      `[ocr] user=${ctx.user.id} outcome=${
        sanitized.needsReview ? "needs_review" : "ok"
      } hasAmount=${sanitized.amount != null}`,
    );

    return NextResponse.json<OcrResult>(sanitized, { status: 200 });
  } catch (err) {
    console.error("[ocr] request failed:", err);
    // Never fail hard — return a manual-editable empty result.
    return NextResponse.json<OcrResult>(emptyResult(), { status: 200 });
  }
}

function emptyResult(): OcrResult {
  return {
    merchant: null,
    amount: null,
    date: null,
    category: "Unorganized",
    items: [],
    needsReview: true,
  };
}
