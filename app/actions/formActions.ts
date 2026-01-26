"use server";
import fs from "node:fs/promises";
import path from "node:path";

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";
const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || "";
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || "Feedback";

type FeedbackRow = { timestamp: string; feedback: string };

function csvPath() {
  return path.join(process.cwd(), "data", "feedback.csv");
}

async function appendFeedbackCsv(feedback: string) {
  const file = csvPath();
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
  const ts = new Date().toISOString();
  const escaped = '"' + feedback.replace(/"/g, '""') + '"';
  const line = `${ts},${escaped}\n`;
  await fs.appendFile(file, line, "utf8");
}

async function appendFeedbackAirtable(feedback: string) {
  const ts = new Date().toISOString();
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
    AIRTABLE_TABLE_NAME
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [
        {
          fields: {
            timestamp: ts,
            feedback,
          },
        },
      ],
      typecast: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable insert failed: ${res.status} ${text}`);
  }
}

async function readFeedbackCsv(): Promise<FeedbackRow[]> {
  try {
    const file = csvPath();
    const content = await fs.readFile(file, "utf8");
    const lines = content.split(/\r?\n/).filter(Boolean);
    const items = lines
      .map((line) => {
        const commaIdx = line.indexOf(',');
        if (commaIdx === -1) return null;
        const ts = line.slice(0, commaIdx);
        let fb = line.slice(commaIdx + 1);
        if (fb.startsWith('"') && fb.endsWith('"')) {
          fb = fb.slice(1, -1).replace(/""/g, '"');
        }
        return { timestamp: ts, feedback: fb };
      })
      .filter(Boolean) as FeedbackRow[];
    return items.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1)).slice(0, 200);
  } catch (_) {
    return [];
  }
}

async function readFeedbackAirtable(): Promise<FeedbackRow[]> {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_API_TOKEN) return [];
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
    AIRTABLE_TABLE_NAME
  )}?pageSize=100&sort%5B0%5D%5Bfield%5D=timestamp&sort%5B0%5D%5Bdirection%5D=desc`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    records: Array<{ fields: any; createdTime: string }>;
  };
  return data.records
    .map((r) => {
      const ts = (r.fields?.timestamp as string) || r.createdTime;
      const fb = (r.fields?.feedback as string) || "";
      return { timestamp: ts, feedback: fb } as FeedbackRow;
    })
    .filter((x) => x.feedback)
    .slice(0, 200);
}

export async function submitEarlyAccess(formData: FormData) {
  const feedback = (formData.get('feedback') as string) ?? '';

  if (!feedback || feedback.trim().length === 0) {
    return { success: false, message: 'Please enter your feedback.' };
  }

  // Prefer Airtable, fall back to local CSV
  if (AIRTABLE_BASE_ID && AIRTABLE_API_TOKEN) {
    try {
      await appendFeedbackAirtable(feedback);
      return {
        success: true,
        message: "Thank you! Your feedback is saved to Airtable.",
      };
    } catch (error: any) {
      console.error("Airtable error:", error?.message ?? error);
    }
  }

  try {
    await appendFeedbackCsv(feedback);
    return {
      success: true,
      message: "Thank you! Saved locally (CSV fallback).",
    };
  } catch (error: any) {
    console.error("CSV save error:", error?.message ?? error);
    return {
      success: false,
      message: "Failed to save feedback. Please try again.",
    };
  }
}

// Fetch stored feedback entries from Vercel Postgres or local CSV fallback
export async function fetchFeedbackEntries() {
  // Prefer Airtable, fall back to CSV
  const airtableItems = await readFeedbackAirtable();
  if (airtableItems.length > 0) {
    return { success: true, source: "airtable", items: airtableItems };
  }
  const csvItems = await readFeedbackCsv();
  return { success: true, source: "csv", items: csvItems };
}