'use client';

import { DemoContainer } from '@/components/demo/DemoContainer';

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#1a365d] p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-white/10 text-white text-sm font-medium rounded-md">
            Live demo
          </span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      </div>

      {/* Demo Container */}
      <DemoContainer />
    </main>
  );
}

