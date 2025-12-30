'use client';

interface JsonDisplayProps {
  data: Record<string, unknown>;
  className?: string;
}

export function JsonDisplay({ data, className = '' }: JsonDisplayProps) {
  // Simple approach: just use JSON.stringify with formatting
  const jsonString = JSON.stringify(data, null, 2);
  const lines = jsonString.split('\n');

  return (
    <div className={`font-mono text-sm overflow-auto ${className}`}>
      {lines.map((line, index) => (
        <div key={index} className="flex">
          <span className="text-gray-600 w-8 text-right pr-4 select-none flex-shrink-0">
            {index + 1}
          </span>
          <pre className="text-gray-300 whitespace-pre">{line}</pre>
        </div>
      ))}
    </div>
  );
}

