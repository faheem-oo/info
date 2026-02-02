"use server";
import { google } from "googleapis";

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";
const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || "";
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || "Feedback";

const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID || "";
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Feedback";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");

type FeedbackRow = { timestamp: string; feedback: string };

async function appendFeedbackGoogleSheets(feedback: string) {
  if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("Google Sheets service account not configured");
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const ts = new Date().toISOString();

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEETS_ID,
    range: `${GOOGLE_SHEET_NAME}!A:B`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[ts, feedback]],
    },
  });

  if ((res.status || 200) >= 400) {
    throw new Error(`Google Sheets append failed: ${res.status} ${JSON.stringify(res.data)}`);
  }
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

async function readFeedbackGoogleSheets(): Promise<FeedbackRow[]> {
  try {
    if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      return [];
    }

    const auth = new google.auth.JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: `${GOOGLE_SHEET_NAME}!A:B`,
    });

    const rows = response.data.values || [];
    const items = rows
      .slice(1)
      .map((row) => ({ timestamp: row[0] || "", feedback: row[1] || "" }))
      .filter((item) => item.feedback)
      .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
      .slice(0, 200);

    return items;
  } catch (err: any) {
    console.error("Google Sheets read error:", err?.message ?? err);
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

  // Prefer Airtable, then Google Sheets
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
    await appendFeedbackGoogleSheets(feedback);
    return {
      success: true,
      message: "Thank you! Your feedback is saved.",
    };
  } catch (error: any) {
    console.error("Google Sheets save error:", error?.message ?? error);
    if (error?.message?.includes("not configured")) {
      return {
        success: false,
        message: "Google Sheets not configured. Please set service account env vars.",
      };
    }
    return {
      success: false,
      message: "Failed to save feedback. Please try again.",
    };
  }
}

// Fetch stored feedback entries from Airtable or Google Sheets
export async function fetchFeedbackEntries() {
  // Prefer Airtable, fall back to Google Sheets
  const airtableItems = await readFeedbackAirtable();
  if (airtableItems.length > 0) {
    return { success: true, source: "airtable", items: airtableItems };
  }
  const googleSheetsItems = await readFeedbackGoogleSheets();
  return { success: true, source: "google-sheets", items: googleSheetsItems };
}

// Delete a feedback entry from Google Sheets
async function deleteFeedbackGoogleSheets(rowIndex: number) {
  if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("Google Sheets service account not configured");
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // rowIndex is 1-based (header is row 1), so we add 1 to the display index
  const sheetId = 0; // First sheet
  const requests = [
    {
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: rowIndex,
          endIndex: rowIndex + 1,
        },
      },
    },
  ];

  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: GOOGLE_SHEETS_ID,
    requestBody: { requests },
  });

  if ((response.status || 200) >= 400) {
    throw new Error(`Google Sheets delete failed: ${response.status}`);
  }
}

// Delete a feedback entry from Airtable
async function deleteFeedbackAirtable(recordId: string) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
    AIRTABLE_TABLE_NAME
  )}/${recordId}`;
  
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
    },
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable delete failed: ${res.status} ${text}`);
  }
}

// Server action to delete feedback
export async function deleteFeedback(recordId: string, source: "airtable" | "google-sheets") {
  try {
    if (source === "airtable") {
      await deleteFeedbackAirtable(recordId);
    } else {
      // For Google Sheets, recordId should be the row index
      const rowIndex = parseInt(recordId, 10);
      await deleteFeedbackGoogleSheets(rowIndex);
    }
    
    return {
      success: true,
      message: "Data deleted from the sheet.",
    };
  } catch (error: any) {
    console.error("Delete feedback error:", error?.message ?? error);
    return {
      success: false,
      message: "Failed to delete feedback. Please try again.",
    };
  }
}