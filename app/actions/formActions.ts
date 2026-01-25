'use server';

import { sql } from '@vercel/postgres';

export async function submitEarlyAccess(formData: FormData) {
  const feedback = formData.get('feedback') as string;

  if (!feedback || feedback.trim().length === 0) {
    return { success: false, message: 'Please enter your feedback.' };
  }

  try {
    const result = await sql`
      INSERT INTO feedback (feedback, created_at)
      VALUES (${feedback}, NOW())
      RETURNING id, feedback, created_at;
    `;

    console.log('Feedback submitted to Vercel Postgres:', result.rows[0]);
    return {
      success: true,
      message: "Thank you for your feedback! We appreciate your input."
    };
  } catch (error: any) {
    console.error('Error submitting feedback:', error?.message ?? error);
    return {
      success: false,
      message: error?.message ? `Error: ${error.message}` : 'Something went wrong. Please try again.'
    };
  }
}

// Fetch stored feedback entries from Vercel Postgres
export async function fetchFeedbackEntries() {
  try {
    const result = await sql`
      SELECT created_at, feedback
      FROM feedback
      ORDER BY created_at DESC
      LIMIT 200;
    `;

    const items = (result.rows || []).map((item: any) => ({
      timestamp: item.created_at,
      feedback: item.feedback,
    }));

    return {
      success: true,
      source: 'vercel-postgres',
      items,
    };
  } catch (error: any) {
    console.error('Error fetching feedback:', error?.message ?? error);
    return {
      success: false,
      items: [],
      message: error?.message ?? 'Failed to load feedback.',
    };
  }
}