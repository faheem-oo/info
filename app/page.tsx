import { Suspense } from 'react';
import HomeClient from './components/HomeClient';

// This is a Server Component - enables SSR
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <HomeClient />
    </Suspense>
  );
}

// Force dynamic rendering for fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;
