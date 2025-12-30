'use client';

interface FlowConnectorProps {
  direction: 'none' | 'request' | 'response';
}

export function FlowConnector({ direction }: FlowConnectorProps) {
  return (
    <div className="hidden lg:flex absolute left-1/2 top-64 -translate-x-1/2 z-10 pointer-events-none">
      <div className="relative flex items-center">
        {/* Left arrow head */}
        <div className="w-2 h-2 border-b-2 border-l-2 border-white/30 transform rotate-45 -mr-1"></div>
        
        {/* Static dashed line */}
        <div className="w-16 border-t-2 border-dashed border-white/30"></div>
        
        {/* Right arrow head */}
        <div className="w-2 h-2 border-t-2 border-r-2 border-white/30 transform rotate-45 -ml-1"></div>
        
        {/* Animated dot - request (left to right) */}
        {direction === 'request' && (
          <div 
            className="absolute w-2.5 h-2.5 bg-amber-400 rounded-full"
            style={{
              boxShadow: '0 0 8px 2px rgba(245, 158, 11, 0.6)',
              animation: 'slideRight 0.4s ease-out forwards',
            }}
          />
        )}
        
        {/* Animated dot - response (right to left) */}
        {direction === 'response' && (
          <div 
            className="absolute w-2.5 h-2.5 bg-amber-400 rounded-full"
            style={{
              boxShadow: '0 0 8px 2px rgba(245, 158, 11, 0.6)',
              animation: 'slideLeft 0.4s ease-out forwards',
            }}
          />
        )}
      </div>
    </div>
  );
}
