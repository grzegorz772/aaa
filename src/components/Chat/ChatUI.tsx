import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Plus, Terminal } from 'lucide-react';
import { ChatMessage, ChatSession } from '../../types';
import { localAgent } from '../../services/localAI/agent';
import { storage } from '../../storage/indexedDB';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function ChatUI() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState('');
  const [agentStatus, setAgentStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, agentStatus]);

  async function loadSessions() {
    const s = await storage.getChats();
    setSessions(s);
    if (s.length > 0 && !session) {
      setSession(s[0]);
    } else if (s.length === 0) {
      handleNewChat();
    }
  }

  function handleNewChat() {
    const newSess: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    };
    setSession(newSess);
    setSessions(prev => [newSess, ...prev]);
    storage.saveChat(newSess);
  }

  async function handleSend() {
    if (!input.trim() || !session || isProcessing) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    
    const updatedMessages = [...session.messages, userMsg];
    let updatedSession = { ...session, messages: updatedMessages };
    
    // Auto title
    if (updatedSession.messages.length === 1) {
       updatedSession.title = input.slice(0, 30) + (input.length > 30 ? '...' : '');
    }

    setSession(updatedSession);
    setInput('');
    setIsProcessing(true);
    setAgentStatus('Starting agent...');

    try {
      await localAgent.run({
        messages: updatedSession.messages,
        onUpdate: (msgs) => {
          updatedSession = { ...updatedSession, messages: msgs };
          setSession(updatedSession);
          storage.saveChat(updatedSession);
        },
        onStatusChange: (status) => {
          setAgentStatus(status);
        }
      });
    } catch (e: any) {
       setAgentStatus(`Error: ${e.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setAgentStatus(''), 2000);
      storage.saveChat(updatedSession);
      loadSessions(); // refresh list to ensure title/ordering
    }
  }

  return (
    <div className="flex h-full bg-[#151619]">
      {/* Sessions list */}
      <div className="w-64 border-r border-[#2A2B2F] flex flex-col bg-[#1A1B1E]">
        <div className="p-3">
          <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 bg-[#202124] hover:bg-[#2A2B2F] border border-[#3A3B3F] text-white py-2 px-4 rounded-md transition-colors text-sm font-medium">
            <Plus size={16} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setSession(s)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors",
                session?.id === s.id ? "bg-[#2A2B2F] text-white" : "text-[#8E9299] hover:bg-[#202124]"
              )}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {session?.messages.map((msg, idx) => {
            if (msg.role === 'system') return null;
            if (msg.role === 'tool') {
               return (
                 <div key={idx} className="flex gap-4 opacity-50 pl-12 text-sm text-[#8E9299]">
                    <Terminal size={14} className="mt-1" />
                    <div className="flex-1 bg-[#202124] rounded p-2 overflow-x-auto">
                      <pre className="text-xs">{msg.content.substring(0, 1000) + (msg.content.length > 1000 ? '...\n[Truncated]' : '')}</pre>
                    </div>
                 </div>
               )
            }
            if (msg.role === 'assistant' && msg.tool_calls) {
               return (
                  <div key={idx} className="flex gap-4">
                     <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg text-white">
                       <span className="text-xs font-bold">AI</span>
                     </div>
                     <div className="flex-1 text-[#B0B0B0] text-sm">
                       {msg.content && <div className="mb-2 bg-[#1A1B1E] p-4 rounded-xl border border-[#2A2B2F] shadow-sm">{msg.content}</div>}
                       {msg.tool_calls.map((t, i) => (
                         <div key={i} className="flex items-center gap-2 text-[11px] text-indigo-400 font-mono mb-1">
                           <Loader2 size={12} className="animate-spin" />
                           Calling {t.function.name}(...)
                         </div>
                       ))}
                     </div>
                  </div>
               )
            }

            return (
              <div key={idx} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "")}>
                <div className={cn(
                  "w-8 h-8 rounded flex items-center justify-center shrink-0 font-bold text-xs",
                  msg.role === 'user' ? "bg-[#2A2B2F] text-[#E0E0E0]" : "bg-indigo-600 text-white shadow-lg"
                )}>
                  <span>{msg.role === 'user' ? 'U' : 'AI'}</span>
                </div>
                <div className={cn(
                  "flex-1 prose prose-invert max-w-4xl",
                  msg.role === 'user' ? "text-right" : ""
                )}>
                  {msg.content ? (
                    <div className={cn(
                      "markdown-body text-sm",
                      msg.role === 'user' ? "text-[#E0E0E0]" : "text-[#B0B0B0] bg-[#1A1B1E] p-4 rounded-xl border border-[#2A2B2F] shadow-sm"
                    )}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="italic text-[#8E9299]">No output</span>
                  )}
                </div>
              </div>
            );
          })}
          
          {agentStatus && (
            <div className="flex gap-4 pl-12 text-[11px] text-indigo-400 font-mono items-center">
              <Loader2 size={14} className="animate-spin" />
              {agentStatus}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        
        <div className="p-6 bg-[#1A1B1E] border-t border-[#2A2B2F]">
          <div className="max-w-4xl mx-auto relative flex items-center">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask anything..."
              className="w-full bg-[#151619] border border-[#2A2B2F] rounded-xl px-4 py-3 pr-12 text-[#E0E0E0] text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
              rows={2}
              disabled={isProcessing}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              className="absolute right-3 bottom-3 p-1.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
