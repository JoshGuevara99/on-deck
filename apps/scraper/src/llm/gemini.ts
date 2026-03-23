/**
 * Isolated Gemini Flash Vision module.
 *
 * Swap this file out to change the underlying model (e.g. Claude Haiku)
 * without touching any pipeline logic.
 *
 * Exports a single function: callGeminiVision(imageBuffer, prompt) → raw text
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODEL = 'gemini-2.0-flash';

const EXTRACTION_PROMPT =
  'You are an event extraction assistant. Extract all upcoming events from this webpage screenshot. ' +
  'Return ONLY a valid JSON array. Each object must have: ' +
  'title (string), date (string), time (string or null), description (string or null). ' +
  'If no events are found, return an empty array []. ' +
  'Do not include any explanation, markdown, or text outside the JSON array.';

const RETRY_PROMPT =
  'You are an event extraction assistant. The image shows a venue events or calendar page. ' +
  'Your previous response could not be parsed as JSON. Try again. ' +
  'Return ONLY a raw JSON array — no markdown fences, no explanation, no text before or after. ' +
  'Each element: { "title": string, "date": string, "time": string|null, "description": string|null }. ' +
  'If no events visible, return exactly: []';

export interface GeminiEvent {
  title: string;
  date: string;
  time: string | null;
  description: string | null;
}

/**
 * Sends a screenshot buffer to Gemini Flash and returns extracted event objects.
 * Retries once with a more explicit prompt on parse failure.
 * Returns an empty array (never throws) if both attempts fail.
 */
export async function callGeminiVision(
  imageBuffer: Buffer,
  apiKey: string,
): Promise<{ events: GeminiEvent[]; fromRetry: boolean; error?: string }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0 },
  });

  const base64 = imageBuffer.toString('base64');
  const imagePart = { inlineData: { mimeType: 'image/png' as const, data: base64 } };

  // ── Attempt 1 ────────────────────────────────────────────────────────────────
  const attempt1 = await runGeminiCall(model, imagePart, EXTRACTION_PROMPT);
  if (attempt1.events) return { events: attempt1.events, fromRetry: false };

  // ── Attempt 2 (retry with explicit prompt) ───────────────────────────────────
  const attempt2 = await runGeminiCall(model, imagePart, RETRY_PROMPT);
  if (attempt2.events) return { events: attempt2.events, fromRetry: true };

  return { events: [], fromRetry: true, error: attempt2.error ?? attempt1.error };
}

async function runGeminiCall(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  imagePart: { inlineData: { mimeType: 'image/png'; data: string } },
  prompt: string,
): Promise<{ events: GeminiEvent[] | null; error?: string }> {
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [imagePart, { text: prompt }] }],
    });

    const text = result.response.text().trim();

    // Strip markdown fences if present (```json ... ```)
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return { events: null, error: 'Response was not an array' };

    // Coerce each item to GeminiEvent shape
    const events: GeminiEvent[] = parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        title:       typeof item['title']       === 'string' ? item['title']       : String(item['title'] ?? ''),
        date:        typeof item['date']        === 'string' ? item['date']        : String(item['date'] ?? ''),
        time:        typeof item['time']        === 'string' ? item['time']        : null,
        description: typeof item['description'] === 'string' ? item['description'] : null,
      }))
      .filter((e) => e.title && e.date);

    return { events };
  } catch (err) {
    return { events: null, error: err instanceof Error ? err.message : String(err) };
  }
}
