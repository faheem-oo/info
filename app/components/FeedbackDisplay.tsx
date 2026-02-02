'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchFeedbackEntries, deleteFeedback } from '../actions/formActions';

interface FeedbackItem {
  timestamp: string;
  feedback: string;
  recordId?: string;
}

interface FeedbackDisplayProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function FeedbackDisplay({ isVisible, onClose }: FeedbackDisplayProps) {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [showDeleteMessage, setShowDeleteMessage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [source, setSource] = useState<"airtable" | "google-sheets">("google-sheets");
  const previousCountRef = useRef<number>(0);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const result = await fetchFeedbackEntries();
        if (result.success) {
          const currentCount = result.items.length;
          const previousCount = previousCountRef.current;

          // If items decreased, show delete message
          if (previousCount > 0 && currentCount < previousCount) {
            setShowDeleteMessage(true);
          }

          setFeedbackItems(result.items.map((item: any, idx: number) => ({
            ...item,
            recordId: result.source === "airtable" ? item.recordId : (idx + 1).toString(),
          })));
          setSource(result.source as "airtable" | "google-sheets");
          previousCountRef.current = currentCount;
        }
      } catch (error) {
        console.error('Error loading feedback:', error);
      }
    };

    if (isVisible) {
      loadFeedback();
    } else {
      // Reset delete message when modal closes
      setShowDeleteMessage(false);
    }

    // Poll for changes every 5 seconds
    const interval = setInterval(loadFeedback, 5000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const handleDelete = async (recordId: string | undefined, idx: number) => {
    if (!recordId) {
      console.error('Record ID is missing');
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteFeedback(recordId, source);
      if (result.success) {
        setFeedbackItems(feedbackItems.filter((_, i) => i !== idx));
        setShowDeleteMessage(true);
      } else {
        alert(result.message || 'Failed to delete feedback');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('An error occurred while deleting feedback');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-3xl bg-black/70 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Submitted Feedback</h3>
          <button
            onClick={onClose}
            className="text-sm text-white/70 hover:text-white"
          >
            Close
          </button>
        </div>

        {showDeleteMessage && (
          <div className="p-2 bg-yellow-900/60 border border-yellow-700/80 rounded-lg">
            <p className="text-yellow-300 font-medium flex items-center gap-2 text-sm">
              <span className="text-base">⚠</span>
              Data deleted from the sheet.
            </p>
          </div>
        )}

        {feedbackItems.length === 0 && !showDeleteMessage && (
          <p className="text-white/70 text-sm">No feedback yet.</p>
        )}

        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
          {feedbackItems.map((item, idx) => (
            <div key={`${item.timestamp}-${idx}`} className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="text-xs text-white/50 mb-1">{new Date(item.timestamp).toLocaleString()}</div>
                  <div className="text-sm text-white/90 whitespace-pre-wrap break-words">{item.feedback}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
