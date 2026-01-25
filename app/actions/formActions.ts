'use server';

export async function submitEarlyAccess(formData: FormData) {
  const feedback = formData.get('feedback') as string;

  if (!feedback || feedback.trim().length === 0) {
    return { success: false, message: 'Please enter your feedback.' };
  }

  try {
    // Persist submissions to a local store. Prefer SQLite (better-sqlite3) but
    // fall back to a simple CSV file if the native module isn't available.
    const fs = await import('fs');
    const path = await import('path');

    const projectRoot = process.cwd();
    const dataDir = path.join(projectRoot, 'data');
    const dbPath = path.join(dataDir, 'submissions.db');
    const csvPath = path.join(dataDir, 'feedback.csv');

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();

    // Try SQLite first. If import or runtime fails (native build missing), fall back to CSV.
    let used = 'csv';
    try {
      // @ts-ignore-next-line - dynamic native import may not have types available
      const BetterSqlite3 = await import('better-sqlite3');
      const Database: any = (BetterSqlite3 && (BetterSqlite3 as any).default) ? (BetterSqlite3 as any).default : BetterSqlite3;
      const db = new Database(dbPath);

      db.prepare(
        `CREATE TABLE IF NOT EXISTS feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT,
          feedback TEXT
        )`
      ).run();

      db.prepare(
        `INSERT INTO feedback (timestamp, feedback) VALUES (?, ?)`
      ).run(timestamp, feedback);

      db.close();
      used = 'sqlite';
      console.log('Feedback submitted and saved to DB', dbPath, { feedback });
    } catch (sqliteErr) {
      // Fallback: append to CSV (safe, simple, no native deps)
      try {
        const header = 'timestamp,feedback\n';
        const row = `${timestamp},"${(feedback ?? '').replace(/"/g, '""')}"\n`;
        if (!fs.existsSync(csvPath)) {
          fs.writeFileSync(csvPath, header + row, { encoding: 'utf8' });
        } else {
          fs.appendFileSync(csvPath, row, { encoding: 'utf8' });
        }
        console.log('Feedback submitted and appended to CSV', csvPath, { feedback });
      } catch (csvErr) {
        console.error('Failed to persist submission to CSV as fallback:', (csvErr as any)?.message ?? csvErr);
        throw csvErr;
      }
    }

    return {
      success: true,
      message: "Thank you for your feedback! We appreciate your input."
    };
  } catch (error: any) {
    // Log full error for debugging
    console.error('Error submitting form:', error?.message ?? error, error?.stack ?? 'no-stack');
    return {
      success: false,
      // Return the error message to aid debugging locally. Remove or sanitize in production.
      message: error?.message ? `Error: ${error.message}` : 'Something went wrong. Please try again.'
    };
  }
}

// Fetch stored feedback entries (prefers SQLite, falls back to CSV)
export async function fetchFeedbackEntries() {
  try {
    const fs = await import('fs');
    const path = await import('path');

    const projectRoot = process.cwd();
    const dataDir = path.join(projectRoot, 'data');
    const dbPath = path.join(dataDir, 'submissions.db');
    const csvPath = path.join(dataDir, 'feedback.csv');

    const rows: { timestamp: string; feedback: string }[] = [];
    let source: 'sqlite' | 'csv' | 'none' = 'none';

    // Try SQLite if it exists
    try {
      if (fs.existsSync(dbPath)) {
        // @ts-ignore-next-line - dynamic native import may not have types available
        const BetterSqlite3 = await import('better-sqlite3');
        const Database: any = (BetterSqlite3 && (BetterSqlite3 as any).default)
          ? (BetterSqlite3 as any).default
          : BetterSqlite3;
        const db = new Database(dbPath, { readonly: true });
        const stmt = db.prepare('SELECT timestamp, feedback FROM feedback ORDER BY id DESC LIMIT 200');
        rows.push(...stmt.all());
        db.close();
        source = 'sqlite';
      }
    } catch (sqliteErr) {
      console.warn('SQLite fetch failed, falling back to CSV:', (sqliteErr as any)?.message ?? sqliteErr);
    }

    // Fallback: read CSV
    if (rows.length === 0 && fs.existsSync(csvPath)) {
      try {
        const file = fs.readFileSync(csvPath, 'utf8');
        const lines = file.split(/\r?\n/).filter(Boolean);
        // Skip header if present
        for (const line of lines.slice(1)) {
          const [timestamp, feedback] = line.split(/,(.+)/); // split once to keep commas in feedback
          if (timestamp && feedback !== undefined) {
            rows.push({ timestamp, feedback: feedback.replace(/^"|"$/g, '').replace(/""/g, '"') });
          }
        }
        source = 'csv';
      } catch (csvErr) {
        console.error('Error reading CSV feedback:', (csvErr as any)?.message ?? csvErr);
      }
    }

    return {
      success: true,
      source,
      items: rows
    };
  } catch (error: any) {
    console.error('Error fetching feedback:', error?.message ?? error);
    return {
      success: false,
      items: [],
      message: error?.message ?? 'Failed to load feedback.'
    };
  }
}