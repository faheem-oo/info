'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function submitEarlyAccess(formData: FormData) {
  const feedback = formData.get('feedback') as string;

  if (!feedback || feedback.trim().length === 0) {
    return { success: false, message: 'Please enter your feedback.' };
  }

  try {
    const { data, error } = await supabase
      .from('feedback')
      .insert([
        {
          feedback,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return {
        success: false,
        message: error.message || 'Failed to submit feedback.',
      };
    }

    console.log('Feedback submitted to Supabase:', data);
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

// Fetch stored feedback entries from Supabase
export async function fetchFeedbackEntries() {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('created_at, feedback')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Supabase fetch error:', error);
      return {
        success: false,
        items: [],
        message: error.message || 'Failed to load feedback.',
      };
    }

    const items = (data || []).map((item: any) => ({
      timestamp: item.created_at,
      feedback: item.feedback,
    }));

    return {
      success: true,
      source: 'supabase',
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