'use client';

import { useState } from 'react';

interface AcpRequest {
  id: string;
  method: string;
  endpoint: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  timestamp: Date;
}

interface AcpRequestsLogProps {
  requests: AcpRequest[];
}

export function AcpRequestsLog({ requests }: AcpRequestsLogProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (requests.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between rounded-md border border-white/10 bg-black/80 text-white hover:bg-black/90 transition-colors"
      >
        <span className="inline-flex items-center rounded-sm border border-white/20 px-3 py-1 text-xs font-medium tracking-[0.08em] uppercase">
          ACP requests ({requests.length})
        </span>
        <svg
          className={`w-4 h-4 text-white/60 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 max-h-60 overflow-auto">
          {requests.map((req) => (
            <div key={req.id} className="text-xs font-mono">
              <div className="text-blue-400 font-semibold mb-1">
                {req.method} {req.endpoint}
              </div>
              <pre className="text-gray-400 whitespace-pre-wrap break-all">
                {JSON.stringify(req.request, null, 2)}
              </pre>
              <div className="text-gray-500 my-1">&gt;&gt;&gt;</div>
              <pre className="text-gray-400 whitespace-pre-wrap break-all">
                {JSON.stringify(req.response, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

