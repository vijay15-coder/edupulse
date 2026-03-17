
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, User as UserIcon, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User } from '../types';

interface AIChatbotProps {
  user: User;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: `Hi ${user.name}! I'm your EduPulse AI assistant. How can I help you manage your ${user.role.toLowerCase()} duties today?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      // Fix: Follow strict initialization guidelines for @google/genai
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        // Fix: Use gemini-3-pro-preview for complex text tasks like academic assistance
        model: 'gemini-3-pro-preview',
        contents: userMsg,
        config: {
          systemInstruction: `You are the EduPulse SaaS Academic Assistant. 
          The current user is ${user.name}, a ${user.role} in the ${user.department || 'Administration'} department.
          Help them with college management queries, academic advice, or system navigation. 
          Keep responses professional, concise, and helpful.`,
          temperature: 0.7,
        },
      });

      // Fix: Access response.text property directly as per guidelines (not a method call)
      setMessages(prev => [...prev, { role: 'ai', text: response.text || "I'm sorry, I couldn't process that request." }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Service temporarily unavailable. Please check your connection." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
      {isOpen ? (
        <div className="bg-white w-[calc(100vw-2rem)] md:w-96 h-[500px] md:h-[600px] max-h-[80vh] rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
          {/* Header */}
          <div className="bg-indigo-600 p-4 md:p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <div className="bg-white p-1 rounded-lg">
                  <Bot className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm">EduPulse AI</h3>
                <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  Active Assistant
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 md:p-4 rounded-2xl text-sm ${
                  msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-100' 
                  : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span className="text-xs text-slate-500 font-medium italic">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 text-white p-3 md:p-4 rounded-full shadow-2xl shadow-indigo-200 hover:scale-110 active:scale-95 transition-all group"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6 md:w-7 md:h-7" />
            <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-amber-300 animate-bounce" />
          </div>
        </button>
      )}
    </div>
  );
};

export default AIChatbot;
