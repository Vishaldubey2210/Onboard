'use client';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

export default function ChatWidget({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: 'Hi there! I am your Onboarding Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const msg = text.trim();
    setInput('');
    setSuggestions([]);
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const res = await api.chatWithAI(leadId, msg);
      if (res.success) {
        setMessages(prev => [...prev, { role: 'ai', content: res.data.reply }]);
        setSuggestions(res.data.suggestions || []);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection issue. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!open && (
        <button 
          onClick={() => setOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl flex items-center justify-center transition-transform hover:scale-110 border-4 border-white"
        >
          <span className="text-2xl">🤖</span>
        </button>
      )}

      {open && (
        <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 flex flex-col border border-slate-200 overflow-hidden" style={{ height: '520px', maxHeight: '80vh' }}>
          <div className="bg-slate-900 p-4 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl bg-white/10 p-1.5 rounded-lg">🤖</span>
              <div>
                <h3 className="font-bold text-sm tracking-wide">OnboardAI</h3>
                <p className="text-white/60 text-xs">Simulating Driver perspective</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white p-2">✕</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm' : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-sm p-3 flex space-x-1.5 items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-white border-t border-slate-100">
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-full transition-colors border border-slate-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask your query..."
                className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-full px-4 py-2 text-sm outline-none transition-all shadow-sm"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || loading}
                className="bg-slate-900 text-white rounded-full w-10 h-10 flex flex-shrink-0 items-center justify-center disabled:opacity-50 transition-colors hover:bg-blue-600 shadow-md"
              >
                ↑
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
