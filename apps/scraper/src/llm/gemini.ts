/**
 * Isolated Gemini Flash Vision module.
 *
 * Swap this file out to change the underlying model (e.g. Claude Haiku)
 * without touching any pipeline logic.
 *
 * Exports a single function: callGeminiVision(imageBuffer, prompt) → raw text
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const today = new Date().toISOString().split('T')[0];

const EXTRACTION_PROMPT =
  `Today is ${today}. You are an event extraction assistant. ` +
  'Extract all upcoming participatory performance events from this webpage screenshot — ' +
  'meaning events where members of the public can sign up to perform or take part. ' +
  'This includes but is not limited to: open mics, open stages, jam sessions, improv jams, blues/jazz/acoustic jams, ' +
  'songwriter circles, spoken word nights, poetry open mics, comedy open mics, signup shows, or any event ' +
  'where attendees can perform regardless of what it is called. ' +
  'IMPORTANT — dates must be real calendar dates in YYYY-MM-DD format. ' +
  'If an event recurs on a schedule (e.g. "every Monday", "every other Tuesday", "first Sunday of the month"), ' +
  `expand it into the next 4 upcoming occurrences starting from ${today}, each as a separate object with a real YYYY-MM-DD date. ` +
  'Never use phrases like "every Monday" or "recurring" as the date value — always compute the actual dates. ' +
  'Return ONLY a valid JSON array. Each object must have: ' +
  'title (string), ' +
  'date (string, YYYY-MM-DD), ' +
  'time (string in HH:MM 24-hour format, or null if unknown), ' +
  'description (string or null). ' +
  `Only include events on or after ${today}. ` +
  'If no qualifying events are found, return an empty array []. ' +
  'Do not include any explanation, markdown, or text outside the JSON array.';

const RETRY_PROMPT =
  `Today is ${today}. You are an event extraction assistant. The image shows a venue events or calendar page. ` +
  'Extract all upcoming participatory performance events — meaning events where members of the public ' +
  'can sign up to perform or take part, including but not limited to: open mics, open stages, jam sessions, ' +
  'improv jams, blues/jazz/acoustic jams, songwriter circles, spoken word nights, poetry open mics, ' +
  'comedy open mics, signup shows, or any similar event regardless of what it is called. ' +
  `Only include events on or after ${today}. ` +
  'CRITICAL — the "date" field must always be a real YYYY-MM-DD date. ' +
  'If an event recurs (e.g. "every Wednesday", "weekly on Sundays"), expand it into ' +
  `the next 4 upcoming occurrences from ${today}, one object per date. ` +
  'Never write "every Monday" or any recurrence phrase as a date value. ' +
  'Your previous response could not be parsed as valid JSON — it may have included markdown fences (```), ' +
  'explanatory text, or characters outside the array. ' +
  'Return ONLY a raw JSON array with zero text before or after it. ' +
  'Each element must match exactly: ' +
  '{ "title": string, "date": "YYYY-MM-DD", "time": "HH:MM in 24-hour format or null", "description": string or null }. ' +
  'If no qualifying events are visible, return exactly: []';

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
    console.log(`  [Gemini raw response] ${text.slice(0, 300)}`);

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
