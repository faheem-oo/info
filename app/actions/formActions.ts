"use server";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";
const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || "";
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || "Feedback";

const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID || "";
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "Sheet1";

// Load service account from JSON file (more reliable than env vars for private keys)
let GOOGLE_SERVICE_ACCOUNT_EMAIL = "";
let GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = "";

try {
  const serviceAccountPath = path.join(process.cwd(), "polar-winter-485505-h9-90c5a84fb5d4.json");
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
    GOOGLE_SERVICE_ACCOUNT_EMAIL = serviceAccount.client_email;
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = serviceAccount.private_key;
    console.log("✓ Google Sheets credentials loaded from JSON file");
    console.log(`  - Email: ${GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
  } else {
    // Fallback to environment variables
    GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      console.error("✗ Google Sheets credentials NOT found!");
    } else {
      console.log("✓ Google Sheets credentials loaded from env");
    }
  }
} catch (error) {
  console.error("✗ Error loading Google Sheets credentials:", error);
}

type FeedbackRow = { timestamp: string; feedback: string };

// CSV fallback: save to local file
async function appendFeedbackCSV(feedback: string) {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filePath = path.join(dataDir, "feedback.csv");
    const ts = new Date().toISOString();
    
    // Escape CSV values
    const escapedFeedback = `"${feedback.replace(/"/g, '""')}"`;
    const csvLine = `${ts},${escapedFeedback}\n`;

    // Check if file exists, if not add header
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "timestamp,feedback\n");
    }

    fs.appendFileSync(filePath, csvLine);
    console.log("✅ Feedback saved to CSV file (local fallback)");
  } catch (error: any) {
    console.error("CSV save error:", error?.message);
    throw error;
  }
}

async function readFeedbackCSV(): Promise<FeedbackRow[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "feedback.csv");
    
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length <= 1) return []; // Only header or empty

    return lines
      .slice(1)
      .map((line) => {
        // Simple CSV parsing - assumes timestamp is ISO and feedback is quoted
        const match = line.match(/^([^,]+),"(.*)"\s*$/);
        if (!match) return null;
        return {
          timestamp: match[1],
          feedback: match[2].replace(/""/g, '"'),
        };
      })
      .filter((item): item is FeedbackRow => item !== null)
      .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
      .slice(0, 200);
  } catch (error: any) {
    console.error("CSV read error:", error?.message);
    return [];
  }
}

async function appendFeedbackGoogleSheets(feedback: string) {
  if (!GOOGLE_SHEETS_ID) {
    throw new Error("Google Sheets ID not configured");
  }

  try {
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      throw new Error("Google Sheets credentials not configured in environment variables");
    }

    console.log(`📝 Attempting to save feedback to sheet: "${GOOGLE_SHEET_NAME}"`);
    console.log(`🔑 Using service account: ${GOOGLE_SERVICE_ACCOUNT_EMAIL}`);

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

    console.log(`✅ Feedback saved successfully to Google Sheets`);

    if ((res.status || 200) < 200 || (res.status || 200) >= 400) {
      throw new Error(`Google Sheets append failed: ${res.status} ${JSON.stringify(res.data)}`);
    }
  } catch (error: any) {
    console.error("❌ Google Sheets save error:", {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      details: error?.errors?.[0]?.message,
    });
    throw error;
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
    if (!GOOGLE_SHEETS_ID) {
      return [];
    }

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
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

  // Prefer Airtable, then Google Sheets, then CSV fallback
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

  // Try Google Sheets
  try {
    await appendFeedbackGoogleSheets(feedback);
    return {
      success: true,
      message: "Thank you! Your feedback is saved.",
    };
  } catch (error: any) {
    console.error("Google Sheets save error:", error?.message ?? error);
  }

  // Fallback to CSV
  try {
    await appendFeedbackCSV(feedback);
    return {
      success: true,
      message: "Thank you! Your feedback is saved.",
    };
  } catch (error: any) {
    console.error("CSV save error:", error?.message ?? error);
    return {
      success: false,
      message: "Failed to save feedback. Please try again.",
    };
  }
}

// Fetch stored feedback entries from Airtable, Google Sheets, or CSV
export async function fetchFeedbackEntries() {
  // Prefer Airtable, fall back to Google Sheets, then CSV
  const airtableItems = await readFeedbackAirtable();
  if (airtableItems.length > 0) {
    return { success: true, source: "airtable", items: airtableItems };
  }
  
  const googleSheetsItems = await readFeedbackGoogleSheets();
  if (googleSheetsItems.length > 0) {
    return { success: true, source: "google-sheets", items: googleSheetsItems };
  }
  
  const csvItems = await readFeedbackCSV();
  return { success: true, source: "csv", items: csvItems };
}

// Delete a feedback entry from Google Sheets
async function deleteFeedbackGoogleSheets(rowIndex: number) {
  if (!GOOGLE_SHEETS_ID) {
    throw new Error("Google Sheets ID not configured");
  }

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("Google Sheets credentials not configured in environment variables");
  }

  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  
  const sheets = google.sheets({ version: "v4", auth });

  // rowIndex is 1-based from display, Google Sheets API needs 0-based startIndex
  // Header is row 0, so data row 1 has startIndex 1
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

  if ((response.status || 200) < 200 || (response.status || 200) >= 400) {
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