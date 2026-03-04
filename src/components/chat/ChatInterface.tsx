"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Settings, Mic, MicOff, Activity, CheckCircle, ChevronLeft, Menu, Trash2, Edit2, Check } from "lucide-react";
import { TraitConfig } from "@/lib/traitNormalizer";
import MixerModal from "./MixerModal";
import { useSpeech } from "@/hooks/useSpeech";
import { createClient } from "@/lib/supabase/client";

type Message = {
    id: string;
    role: "user" | "model";
    content: string;
};

type ChatSession = {
    id: string;
    title?: string;
    created_at: string;
};

export default function ChatInterface() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);

    const [showMixer, setShowMixer] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);

    const [traitConfig, setTraitConfig] = useState<TraitConfig>({
        professional: 50,
        rational: 50,
        polite: 50,
        funny: 50,
        sly: 50
    });

    const [chats, setChats] = useState<ChatSession[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [evaluatingMsgId, setEvaluatingMsgId] = useState<string | null>(null);

    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");

    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUser(data.user);
                fetchChats(data.user.id);
            }
        });
    }, []);

    const fetchChats = async (userId: string) => {
        const { data, error } = await supabase
            .from('chats')
            .select('id, created_at, title')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (data) {
            setChats(data);
            if (data.length > 0) {
                loadChat(data[0].id);
            } else {
                setCurrentChatId(null);
                setMessages([]);
            }
        }
    };

    const createNewChat = async (userId: string) => {
        const { data, error } = await supabase
            .from('chats')
            .insert({ user_id: userId, slider_config: traitConfig })
            .select()
            .single();
        if (data) {
            setChats([data, ...chats]);
            setCurrentChatId(data.id);
            setMessages([]);
        }
    };

    const loadChat = async (chatId: string) => {
        setCurrentChatId(chatId);
        const { data: chatData } = await supabase.from('chats').select('slider_config').eq('id', chatId).single();
        if (chatData) {
            setTraitConfig(chatData.slider_config as TraitConfig);
        }
        const { data: msgData } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
        if (msgData) {
            setMessages(msgData.map(m => ({ id: m.id, role: m.role as 'user' | 'model', content: m.content })));
        }
    };

    const deleteChat = async (chatId: string) => {
        await supabase.from('chats').delete().eq('id', chatId);
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (currentChatId === chatId) {
            setCurrentChatId(null);
            setMessages([]);
        }
    };

    const handleRenameChat = async (chatId: string) => {
        if (!editingTitle.trim()) {
            setEditingChatId(null);
            return;
        }

        const newTitle = editingTitle.trim();
        const { error } = await supabase.from('chats').update({ title: newTitle }).eq('id', chatId);

        if (error) {
            console.error("Error renaming chat:", error);
            // Optionally could add a toast or alert here
            alert("Failed to rename chat. Please try again or check console.");
        } else {
            setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle } : c));
        }

        setEditingChatId(null);
    };

    const scrollToBottom = () => endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [messages]);

    const handleSend = async (text: string = input) => {
        if (!text.trim()) return;
        const currentInput = text;
        setInput("");

        let targetChatId = currentChatId;

        if (!targetChatId) {
            if (!user) return;
            const { data } = await supabase.from('chats').insert({ user_id: user.id, slider_config: traitConfig }).select().single();
            if (data) {
                targetChatId = data.id;
                setCurrentChatId(data.id);
                setChats(prev => [data, ...prev]);
            } else {
                return;
            }
        }

        // 1. Optimistic UI update and DB insert for user message
        const tempUserId = crypto.randomUUID();
        const newMsg: Message = { id: tempUserId, role: "user", content: currentInput };
        setMessages(prev => [...prev, newMsg]);
        setIsTyping(true);

        const { data: dbUserMsg } = await supabase.from('messages').insert({
            chat_id: targetChatId,
            role: 'user',
            content: currentInput
        }).select().single();

        if (dbUserMsg) {
            setMessages(prev => prev.map(m => m.id === tempUserId ? { ...m, id: dbUserMsg.id } : m));
        }

        // 2. Format history for Gemini API
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));
        history.push({ role: "user", parts: [{ text: currentInput }] });

        // 3. Call Engine A
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history, sliderConfig: traitConfig })
            });
            const data = await res.json();

            if (data.text) {
                // Save model response
                const { data: dbModelMsg } = await supabase.from('messages').insert({
                    chat_id: targetChatId,
                    role: 'model',
                    content: data.text
                }).select().single();

                setMessages(prev => [...prev, { id: dbModelMsg ? dbModelMsg.id : crypto.randomUUID(), role: "model", content: data.text }]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsTyping(false);
        }
    };

    const { isListening, toggleListening, error: speechError, interimText } = useSpeech((text) => {
        // Flush speech to input buffer directly
        setInput(prev => {
            const trimmedPrev = prev.trim();
            const trimmedNew = text.trim();
            if (!trimmedPrev) return trimmedNew;
            return trimmedPrev + " " + trimmedNew;
        });
    });

    const handleEvaluate = async (msgId: string, content: string) => {
        if (!user) return;
        setEvaluatingMsgId(msgId);

        // Find index of this message and get last 6 messages ending at this one
        const msgIndex = messages.findIndex(m => m.id === msgId);
        const contextMessages = messages.slice(Math.max(0, msgIndex - 5), msgIndex + 1);
        const history = contextMessages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        try {
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history, sliderConfig: traitConfig })
            });
            const evaluation = await res.json();

            if (evaluation && !evaluation.error) {
                await supabase.from('evaluations').insert({
                    message_id: msgId,
                    user_id: user.id,
                    prof_score: evaluation.prof_score,
                    rat_score: evaluation.rat_score,
                    pol_score: evaluation.pol_score,
                    fun_score: evaluation.fun_score,
                    sly_score: evaluation.sly_score,
                    critique: evaluation.critique,
                    rewrite: evaluation.rewrite
                });
                alert(`Evaluated!\nCritique: ${evaluation.critique}\nRewrite: ${evaluation.rewrite}`);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setEvaluatingMsgId(null);
        }
    };

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-50 overflow-hidden font-sans relative">
            {/* Sidebar Overlay for Mobile */}
            {showSidebar && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setShowSidebar(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-72 glass-panel border-r border-slate-700/50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/20">
                    <h2 className="font-bold text-lg text-blue-400 tracking-wide">Conversations</h2>
                    <button className="md:hidden p-2 hover:bg-slate-700/50 rounded-xl transition-colors" onClick={() => setShowSidebar(false)}>
                        <ChevronLeft className="w-5 h-5 text-slate-300" />
                    </button>
                </div>
                <div className="p-3 space-y-2 overflow-y-auto h-[calc(100vh-73px)] custom-scrollbar">
                    <button
                        onClick={() => {
                            if (user) createNewChat(user.id);
                            setShowSidebar(false);
                        }}
                        className="w-full text-left px-4 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition-all shadow-lg shadow-blue-500/20 mb-4 flex items-center gap-2"
                    >
                        <span className="text-xl leading-none mb-0.5">+</span> New Chat
                    </button>
                    {chats.map(c => (
                        <div key={c.id} className="relative group mb-1.5">
                            {editingChatId === c.id ? (
                                <div className={`w-full flex items-center px-4 py-3 rounded-xl text-sm transition-colors bg-slate-700 border border-blue-500 shadow-inner`}>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={editingTitle}
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRenameChat(c.id)}
                                        className="bg-transparent border-none outline-none text-slate-100 w-full font-medium"
                                        placeholder="Chat title..."
                                    />
                                    <button onClick={() => handleRenameChat(c.id)} className="ml-2 text-blue-400 hover:text-blue-300 transition-colors p-1 bg-slate-800 rounded-md">
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { loadChat(c.id); setShowSidebar(false); }}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 ${c.id === currentChatId ? 'bg-slate-700/80 border border-slate-600 shadow-sm' : 'hover:bg-slate-800/60 border border-transparent'} pr-16`}
                                    >
                                        <div className={`truncate font-medium ${c.id === currentChatId ? 'text-blue-100' : 'text-slate-300'}`}>
                                            {c.title || new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </button>
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5 md:opacity-0 opacity-100">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingChatId(c.id);
                                                setEditingTitle(c.title || new Date(c.created_at).toLocaleDateString());
                                            }}
                                            className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700/80 transition-colors"
                                            title="Rename Chat"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}
                                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/80 transition-colors"
                                            title="Delete Chat"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full bg-[#0a0f1c] relative z-10 w-full overflow-hidden">
                {speechError && (
                    <div className="absolute top-0 left-0 right-0 bg-red-900/90 text-white text-sm font-medium text-center py-2 z-50 shadow-md flex items-center justify-center gap-2">
                        <span dangerouslySetInnerHTML={{ __html: speechError }} />
                    </div>
                )}

                {/* Header */}
                <header className="h-16 flex items-center justify-between px-4 glass-panel border-b border-slate-800/80 z-20 sticky top-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            className="md:hidden p-2 -ml-2 rounded-xl hover:bg-slate-800 text-slate-300 transition-colors"
                            onClick={() => setShowSidebar(true)}
                            title="Open Chat History"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight">
                            PersonaMixer
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowMixer(true)}
                        className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2 rounded-full border border-slate-700/50 text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:border-slate-600"
                    >
                        <Settings className="w-4 h-4 text-indigo-400" />
                        <span className="hidden sm:inline text-slate-200">Mixer</span>
                    </button>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                            <Activity className="w-12 h-12 opacity-20" />
                            <p>Start a conversation to train your persona.</p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}>
                            {msg.role === 'model' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                                    <Activity className="w-4 h-4 text-indigo-400" />
                                </div>
                            )}
                            <div className="relative max-w-[85%] sm:max-w-[70%]">
                                <div className={`px-4 py-3 rounded-2xl shadow-xl ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none'
                                    : 'bg-slate-800 border border-slate-700/50 text-slate-200 rounded-bl-none'
                                    }`}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                </div>

                                {/* Evaluate Button for User Messages */}
                                {msg.role === 'user' && (
                                    <button
                                        onClick={() => handleEvaluate(msg.id, msg.content)}
                                        disabled={evaluatingMsgId === msg.id}
                                        className="absolute top-1/2 -left-10 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-slate-800 rounded-full border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 shadow-lg"
                                        title="Evaluate this message"
                                    >
                                        {evaluatingMsgId === msg.id ? (
                                            <span className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin block"></span>
                                        ) : (
                                            <CheckCircle className="w-4 h-4 text-slate-400 hover:text-white" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                                <Activity className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="px-5 py-4 bg-slate-800 border border-slate-700/50 rounded-2xl rounded-bl-none shadow-xl flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={endOfMessagesRef} />
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0f1c] via-[#0a0f1c] to-transparent z-20">
                    <div className="max-w-4xl mx-auto glass-panel rounded-full flex items-center p-2 shadow-2xl relative">
                        <button
                            onClick={toggleListening}
                            className={`p-3 rounded-full transition-all flex-shrink-0 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse glow-primary shadow-red-500/50' : 'hover:bg-slate-700 text-slate-400'}`}
                            title={isListening ? "Stop listening" : "Start dictation"}
                        >
                            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isListening ? (interimText || "Listening...") : "Type your message..."}
                            className={`flex-1 bg-transparent border-none focus:ring-0 text-white px-4 text-sm w-full outline-none ${isListening && interimText ? 'placeholder-indigo-300' : 'placeholder-slate-500'}`}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isTyping}
                            className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-full transition-colors flex-shrink-0 shadow-lg shadow-blue-500/20"
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </button>
                    </div>
                </div>
            </div>

            {showMixer && (
                <MixerModal
                    config={traitConfig}
                    onChange={setTraitConfig}
                    onClose={() => setShowMixer(false)}
                />
            )}
        </div>
    );
}
