'use client';

import { useEffect, useState } from 'react';
import Image from "next/image";
import DarkVeil from './DarkVeil';
import EarlyAccessForm from './EarlyAccessForm';
import FeedbackDisplay from './FeedbackDisplay';

export default function HomeClient() {
  const [viewerOpen, setViewerOpen] = useState(false);

  // Trigger the background animation after the form entrance animation finishes.
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new Event('darkveil-start'));
    }, 750); // match form animation (700ms in globals.css)
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start font-sans">
      {/* Background */}
      <div style={{ width: '100%', height: '100%', position: 'fixed', top: 0, left: 0, zIndex: -1 }}>
        <DarkVeil />
      </div>

      {/* Navigation Bar */}
      <nav className="w-full max-w-4xl flex items-center justify-between mt-4 px-4 py-2 rounded-full bg-black/20 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Image src="/imitate-logo.png" alt="Imitate Labs Logo" width={40} height={40} />
          <span className="text-lg font-bold text-white tracking-wide">IMITATE LABS</span>
        </div>
        <button
          onClick={() => setViewerOpen(true)}
          className="text-sm font-semibold text-white px-4 py-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition"
        >
          View Feedback
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center w-full px-4 py-4">
        <h3 className="mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-3xl font-extrabold text-white text-center leading-tight drop-shadow-lg">
          Feel Free to say your Problem here
        </h3>
       

        {/* Early Access Card */}
        <section className="mt-8 p-6 w-full max-w-sm flex flex-col items-center animate-formEnter glass-card inset-glow">
          <h2 className="text-lg font-semibold text-white text-center mb-2">
            Issue or Complain Box
          </h2>
          <EarlyAccessForm />

          <p className="mt-3 text-xs text-white/80 text-center">
            We assure you that your identity will not be recorded or stored.<br />All submissions are completely annonymous.
          </p>
        </section>
      </main>

      <FeedbackDisplay isVisible={viewerOpen} onClose={() => setViewerOpen(false)} />
    </div>
  );
}
