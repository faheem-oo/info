'use client';

interface SubmissionMessageProps {
  message: string;
  isSuccess: boolean;
  onClose: () => void;
  isVisible: boolean;
}

export default function SubmissionMessage({ message, isSuccess, onClose, isVisible }: SubmissionMessageProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl p-4 max-w-8x4 w-full text-center shadow-2xl animate-fadeIn mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-8">
          {isSuccess ? (
            <svg
              className="w-24 h-24 mx-auto text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg
              className="w-24 h-24 mx-auto text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        
        <h2 className="text-4xl font-bold mb-6 text-pink-700">
          {isSuccess ? 'Thank You!' : 'Oops!'}
        </h2>
        
        <p className="text-gray-700 text-xl mb-8 leading-relaxed">{message}</p>
        
        <button
          onClick={onClose}
          className="px-8 py-3 text-lg rounded-full bg-pink-600 text-white font-medium hover:bg-pink-700 transition-colors shadow-lg hover:shadow-xl"
        >
          Close
        </button>
      </div>
    </div>
  );
}