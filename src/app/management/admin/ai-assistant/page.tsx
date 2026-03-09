'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, Bot, User, Loader2, Sparkles, RefreshCw } from 'lucide-react';

type MessageData = {
  type: string;
  summary?: Record<string, unknown>;
  items?: Record<string, unknown>[];
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  data?: MessageData;
};

const SUGGESTED = [
  { label: 'New requests today', query: 'Show me all new service requests' },
  { label: 'Revenue summary', query: 'What is the revenue for last 30 days?' },
  { label: 'Recent orders', query: 'Show me recent orders and their status' },
  { label: 'Low stock products', query: 'Which products have low stock?' },
  { label: 'New customers', query: 'Who are the most recently registered customers?' },
  { label: 'Page analytics', query: 'Show me page views and product analytics this week' },
];

function StatusDot({ status }: { status: string }) {
  const cls =
    status === 'New' ? 'bg-amber-400' :
    status === 'In Progress' ? 'bg-cyan-400' :
    status === 'Resolved' ? 'bg-emerald-400' :
    status === 'completed' || status === 'delivered' ? 'bg-emerald-400' :
    status === 'cancelled' ? 'bg-red-400' :
    'bg-slate-400';
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function DataTable({ data }: { data: MessageData }) {
  if (!data?.items?.length) return null;

  if (data.type === 'requests_report') {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Service Requests {data.summary?.newCount ? ` ${String(data.summary.newCount)} New` : ''}
        </div>
        <div className="divide-y divide-white/5">
          {data.items.slice(0, 8).map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <div>
                <p className="font-semibold text-white">{String(item.name || '—')}</p>
                <p className="text-xs text-slate-500">{String(item.subject || 'General')}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot status={String(item.status || '')} />
                <span className="text-[11px] text-slate-400">{String(item.status || '—')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'orders_report') {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Recent Orders
        </div>
        <div className="divide-y divide-white/5">
          {data.items.slice(0, 6).map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <span className="font-mono text-xs text-slate-400">{String(item.id || '').slice(0, 8)}</span>
              <span className="font-semibold text-white">₹{Number(item.total || 0).toLocaleString('en-IN')}</span>
              <div className="flex items-center gap-1.5">
                <StatusDot status={String(item.status || '')} />
                <span className="text-[11px] text-slate-400">{String(item.status || '—')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'customers_report') {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Recent Customers
        </div>
        <div className="divide-y divide-white/5">
          {data.items.slice(0, 6).map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <div>
                <p className="font-semibold text-white">{String(item.name || item.email || '—')}</p>
                <p className="text-xs text-slate-500">{String(item.email || '')}</p>
              </div>
              <span className="text-[11px] text-slate-500">{item.created_at ? new Date(String(item.created_at)).toLocaleDateString() : ''}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'products_report') {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Products
        </div>
        <div className="divide-y divide-white/5">
          {data.items.slice(0, 6).map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <span className="text-white">{String(item.title || '—')}</span>
              {item.stock_quantity !== undefined && (
                <span className={`text-xs font-bold ${Number(item.stock_quantity) < 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {String(item.stock_quantity)} in stock
                </span>
              )}
              {item.view_count !== undefined && (
                <span className="text-xs text-slate-400">{String(item.view_count)} views</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'related_products') {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Matched Products
        </div>
        <div className="divide-y divide-white/5">
          {data.items.slice(0, 6).map((item, i) => (
            <div key={i} className="px-3 py-2.5">
              <p className="text-sm font-semibold text-white">{String(item.title || '—')}</p>
              <p className="text-xs text-slate-500">{String(item.category || item.product_type || '')}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export default function AIAssistantPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm the TecBunny AI assistant. Ask me about service requests, orders, customers, products, or analytics.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'Done.', data: data.data }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="flex h-[calc(100dvh-80px)] flex-col gap-0 bg-[#030712]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">AI Assistant</h2>
            <p className="text-xs text-slate-500">Powered by Gemini  Admin only</p>
          </div>
        </div>
        <button
          onClick={() => setMessages([{ role: 'assistant', content: "Hello! I'm the TecBunny AI assistant. Ask me about service requests, orders, customers, products, or analytics." }])}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
        >
          <RefreshCw className="h-3 w-3" /> New chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${msg.role === 'user' ? 'bg-gradient-to-br from-cyan-500 to-violet-600' : 'bg-white/[0.06] border border-white/10'}`}>
                {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-slate-300" />}
              </div>
              <div className={`flex max-w-[80%] flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white' : 'border border-white/[0.07] bg-white/[0.04] text-slate-200'}`}>
                  {msg.content}
                </div>
                {msg.data && <DataTable data={msg.data} />}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                <Bot className="h-4 w-4 text-slate-300" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-sm text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking
              </div>
            </div>
          )}
          {messages.length === 1 && !loading && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SUGGESTED.map(s => (
                <button key={s.label} onClick={() => send(s.query)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-xs font-semibold text-slate-400 transition hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white">
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] bg-[#030712] px-4 py-4">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} disabled={loading}
            placeholder="Ask about requests, orders, products, customers, analytics"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-violet-500/50 focus:outline-none transition" />
          <button type="submit" disabled={loading || !input.trim()}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
