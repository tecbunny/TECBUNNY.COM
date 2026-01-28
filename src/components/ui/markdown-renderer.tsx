import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Split by newlines to process blocks
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let listBuffer: React.ReactNode[] = [];
  let inList = false;

  const flushList = (keyPrefix: string) => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-list`} className="list-disc pl-6 my-4 space-y-3">
          {listBuffer}
        </ul>
      );
      listBuffer = [];
      inList = false;
    }
  };

  const processInline = (text: string) => {
    // Simple bold parser: **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white shadow-cyan-500/10 drop-shadow-sm">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const key = `line-${index}`;
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList(key);
      elements.push(
        <h3 key={key} className="text-xl font-semibold text-cyan-50 mt-8 mb-4 border-b border-white/10 pb-2">
          {processInline(trimmed.slice(4))}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList(key);
      elements.push(
        <h2 key={key} className="text-2xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">
          {processInline(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList(key);
      elements.push(
        <h1 key={key} className="text-3xl font-bold text-white mt-10 mb-6 border-b border-white/10 pb-4">
          {processInline(trimmed.slice(2))}
        </h1>
      );
    }
    // List Items
    else if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      inList = true;
      listBuffer.push(
        <li key={key} className="text-slate-300 leading-7">
          {processInline(trimmed.slice(2))}
        </li>
      );
    }
    // Numbered Lists (1., 1), etc)
    else if (/^\d+\)\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
       flushList(key); // Close previous bullet list if any
       const match = trimmed.match(/^(\d+[\.\)])\s(.*)/);
       if (match) {
         elements.push(
            <div key={key} className="flex gap-3 mt-4 items-start">
                <span className="font-bold text-cyan-400 min-w-[1.5rem] text-right">{match[1]}</span>
                <span className="text-slate-200 leading-7">{processInline(match[2])}</span>
            </div>
         );
       } else {
         elements.push(<p key={key} className="mb-4 text-slate-300 leading-7">{processInline(trimmed)}</p>);
       }
    }
    // Regular Paragraphs
    else if (trimmed.length > 0) {
      flushList(key);
      elements.push(
        <p key={key} className="mb-4 text-slate-300 leading-7 text-base">
          {processInline(trimmed)}
        </p>
      );
    } 
    // Empty lines
    else {
      flushList(key);
      elements.push(<div key={key} className="h-2" />);
    }
  });

  flushList('final');

  return <div>{elements}</div>;
}
