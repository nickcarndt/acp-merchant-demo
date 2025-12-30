'use client';

import { JsonDisplay } from './JsonDisplay';
import { AcpRequestsLog } from './AcpRequestsLog';

interface AcpRequest {
  id: string;
  method: string;
  endpoint: string;
  request: any;
  response: any;
  timestamp: Date;
}

interface BusinessPanelProps {
  checkoutState: any;
  acpRequests: AcpRequest[];
}

export function BusinessPanel({ checkoutState, acpRequests }: BusinessPanelProps) {
  return (
    <div className="bg-[#1F2529] rounded-2xl overflow-hidden min-h-[600px] flex flex-col">
      {/* Label */}
      <div className="p-6 pb-0 flex items-center gap-3">
        <div className="inline-block px-3 py-1 border-2 border-white/30 rounded-sm font-mono text-xs text-white/80">
          Business
        </div>
        {checkoutState && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            Live API
          </div>
        )}
      </div>

      {/* JSON Display Area */}
      <div className="flex-1 px-6 pb-4 overflow-auto">
        {checkoutState ? (
          <JsonDisplay data={checkoutState} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Select a product to load settings and start the ACP flow.
          </div>
        )}
      </div>

      {/* ACP Requests Log */}
      <AcpRequestsLog requests={acpRequests} />
    </div>
  );
}
