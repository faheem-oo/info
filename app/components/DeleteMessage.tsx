'use client';

interface DeleteMessageProps {
  message: string;
  onClose: () => void;
  isVisible: boolean;
}

export default function DeleteMessage({ message, onClose, isVisible }: DeleteMessageProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-950 rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            Submitted Feedback
          </h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors text-base font-semibold"
          >
            Close
          </button>
        </div>
        
        <div className="mb-6 p-4 bg-yellow-900/60 border border-yellow-700/80 rounded-lg">
          <p className="text-yellow-300 font-medium flex items-center gap-3">
            <span className="text-lg">⚠</span>
            {message}
          </p>
        </div>
        
        <p className="text-gray-400">
          No feedback yet.
        </p>
      </div>
    </div>
  );
}
