'use server';
import fs from 'node:fs/promises';
import path from 'node:path';

type FeedbackRow = { timestamp: string; feedback: string };

function csvPath() {
  return path.join(process.cwd(), 'data', 'feedback.csv');
}

async function appendFeedbackCsv(feedback: string) {
  const file = csvPath();
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
  const ts = new Date().toISOString();
  const escaped = '"' + feedback.replace(/"/g, '""') + '"';
  const line = `${ts},${escaped}\n`;
  await fs.appendFile(file, line, 'utf8');
}

async function readFeedbackCsv(): Promise<FeedbackRow[]> {
  try {
    const file = csvPath();
    const content = await fs.readFile(file, 'utf8');
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

export async function submitEarlyAccess(formData: FormData) {
  const feedback = (formData.get('feedback') as string) ?? '';

  if (!feedback || feedback.trim().length === 0) {
    return { success: false, message: 'Please enter your feedback.' };
  }

  try {
    await appendFeedbackCsv(feedback);
    console.log('Feedback appended to CSV:', csvPath());
    return {
      success: true,
      message: 'Thank you for your feedback! (saved locally)'
    };
  } catch (error: any) {
    console.error('Error saving feedback locally:', error?.message ?? error);
    return {
      success: false,
      message: 'Failed to save feedback locally. Please try again.',
    };
  }
}

// Fetch stored feedback entries from Vercel Postgres or local CSV fallback
export async function fetchFeedbackEntries() {
  const items = await readFeedbackCsv();
  return {
    success: true,
    source: 'csv',
    items,
  };
}