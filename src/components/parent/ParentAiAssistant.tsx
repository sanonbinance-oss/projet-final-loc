import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  RefreshCw,
  Megaphone,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { AiInstruction } from '../../types';
import { SupabaseSyncService } from '../../services/supabaseClient';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  'Comment envoyer une demande de place ?',
  'Comment payer la scolarité par Mobile Money ?',
  'Quels sont les tarifs officiels 2027-2028 ?',
  'Y a-t-il de nouvelles annonces du secrétariat ?',
];

export const ParentAiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [announcements, setAnnouncements] = useState<AiInstruction[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Bonjour ! Je suis l'assistant EduPay Scolarité. Posez-moi vos questions sur le fonctionnement du site, les pièces à fournir, les tarifs ou les dernières consignes du secrétariat.",
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await SupabaseSyncService.listActiveAiAnnouncements();
      if (res.ok && res.instructions) {
        setAnnouncements(res.instructions);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isSending]);

  const handleAsk = async (rawQuestion: string) => {
    const q = rawQuestion.trim();
    if (!q || isSending) return;
    setError('');

    const userMsg: ChatMessage = {
      id: 'u_' + Date.now(),
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    const historyPayload = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    const res = await SupabaseSyncService.askAiAssistant(q, historyPayload);
    setIsSending(false);

    if (res.ok && res.answer) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'm_' + Date.now(),
          role: 'model',
          text: res.answer!,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else {
      setError(res.error || "L'assistant n'a pas pu répondre pour le moment.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleAsk(input);
  };

  const handleResetChat = () => {
    setError('');
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: "Bonjour ! Posez-moi une question sur l'utilisation du portail, vos paiements, les demandes d'admission ou les nouveautés publiées par l'établissement.",
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="no-print fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
      {isOpen ? (
        <div className="w-[calc(100vw-2rem)] sm:w-[400px] h-[78vh] max-h-[610px] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white px-4 py-3.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold tracking-tight truncate">
                  Assistant EduPay
                </h3>
                <p className="text-[11px] text-emerald-200 truncate">
                  Aide parents & infos secrétariat en direct
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Nouvelle conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Fermer l'assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Live announcements summary strip if secretary published any */}
          {announcements.length > 0 && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-3.5 py-2 text-[11px] text-emerald-950 shrink-0">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <Megaphone className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {announcements.length} note{announcements.length > 1 ? 's' : ''} du secrétariat active{announcements.length > 1 ? 's' : ''} :
                </span>
              </div>
              <p className="text-emerald-900 truncate mt-0.5">
                {announcements.slice(0, 2).map((a) => a.titre).join(' · ')}
              </p>
            </div>
          )}

          {/* Conversation Messages */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {isSending && (
              <div className="flex items-start">
                <div className="bg-white border border-slate-200 text-slate-600 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs inline-flex items-center gap-2 shadow-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                  <span>Recherche de la réponse...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick suggestion chips on initial conversation */}
            {messages.length <= 2 && !isSending && (
              <div className="pt-1 flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void handleAsk(q)}
                    className="text-left text-[11px] px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 transition-colors cursor-pointer font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question ici..."
              disabled={isSending}
              maxLength={1200}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white transition-colors cursor-pointer shrink-0"
              title="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-emerald-800 text-white shadow-xl border border-slate-700 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="text-left">
            <span className="text-xs font-extrabold block leading-tight">Aide & Assistant IA</span>
            <span className="text-[10px] text-emerald-300 block leading-tight">
              {announcements.length > 0
                ? `${announcements.length} info${announcements.length > 1 ? 's' : ''} du secrétariat`
                : 'Questions sur le site'}
            </span>
          </div>
        </button>
      )}
    </div>
  );
};
