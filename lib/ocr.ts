import {
  EXPENSE_CATEGORIES,
  isValidCategory,
  UNORGANIZED_CATEGORY,
} from "@/lib/categories";

/** Shape returned by /api/ocr to the client. */
export type OcrResult = {
  merchant: string | null;
  amount: number | null;
  date: string | null; // YYYY-MM-DD
  category: string; // always a valid category; Unorganized when uncertain
  items: string[];
  /** True when the model was unsure or a required field is missing (FR-11). */
  needsReview: boolean;
};

export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024; // 8MB (NFR / plan section 9)

/** The instruction sent to Gemini. Requests structured JSON only. */
export function buildOcrPrompt(): string {
  return [
    "You are a receipt parser. Extract structured data from the receipt image.",
    "Return ONLY a JSON object (no markdown, no prose) with exactly these keys:",
    '  "merchant": string | null   (store/vendor name)',
    '  "amount": number | null      (the FINAL total paid, numeric, no currency symbol)',
    '  "date": string | null        (ISO format YYYY-MM-DD)',
    '  "category": string           (best guess from the allowed list below)',
    '  "items": string[]            (line-item descriptions if legible, else [])',
    '  "confident": boolean         (false if the image is unclear or you are guessing the total/category)',
    "",
    `Allowed categories: ${EXPENSE_CATEGORIES.join(", ")}.`,
    `If you cannot confidently pick one, use "${UNORGANIZED_CATEGORY}".`,
    "If a field is unreadable, use null (or [] for items). Never invent a total.",
  ].join("\n");
}

/**
 * Validate + coerce the model's raw text into a safe OcrResult.
 * Rejects non-numeric amounts, clamps category to the fixed list, and flags
 * `needsReview` whenever a required field is missing or the model was unsure.
 */
export function sanitizeOcrResponse(raw: string): OcrResult {
  let parsed: Record<string, unknown> | null = null;

  // Models sometimes wrap JSON in ```json fences; strip them.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    // Try to salvage the first {...} block.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      merchant: null,
      amount: null,
      date: null,
      category: UNORGANIZED_CATEGORY,
      items: [],
      needsReview: true,
    };
  }

  const merchant =
    typeof parsed.merchant === "string" && parsed.merchant.trim()
      ? parsed.merchant.trim().slice(0, 100)
      : null;

  let amount: number | null = null;
  if (typeof parsed.amount === "number" && Number.isFinite(parsed.amount)) {
    amount = Math.round(Math.abs(parsed.amount) * 100) / 100;
  } else if (typeof parsed.amount === "string") {
    const n = Number(parsed.amount.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n > 0) amount = Math.round(n * 100) / 100;
  }

  let date: string | null = null;
  if (typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    date = parsed.date;
  }

  const rawCategory =
    typeof parsed.category === "string" ? parsed.category.trim() : "";
  const category = isValidCategory(rawCategory)
    ? rawCategory
    : UNORGANIZED_CATEGORY;

  const items = Array.isArray(parsed.items)
    ? parsed.items
        .filter((i): i is string => typeof i === "string")
        .map((i) => i.trim())
        .filter(Boolean)
        .slice(0, 50)
    : [];

  const confident = parsed.confident !== false; // default optimistic
  const needsReview =
    !confident || amount == null || category === UNORGANIZED_CATEGORY;

  return { merchant, amount, date, category, items, needsReview };
}
