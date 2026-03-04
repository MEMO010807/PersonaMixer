"use client";

import { useState, useEffect } from "react";
import Dashboard from "@/components/dashboard/Dashboard";
import ChatInterface from "@/components/chat/ChatInterface";
import { MessageSquare, LayoutDashboard, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
    const [activeTab, setActiveTab] = useState<"dashboard" | "chat">("dashboard");
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-slate-400">Loading...</div>;
    }

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 text-center">
                <div className="glass-panel p-8 max-w-sm w-full rounded-3xl space-y-6 animate-in slide-in-from-bottom-4 duration-700">
                    <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 mb-6">
                        <MessageSquare className="w-8 h-8 text-blue-400 glow-primary" />
                    </div>
                    <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">PersonaMixer</h1>
                    <p className="text-slate-400 text-sm">Your dual-engine AI communication coach. Train your conversational traits dynamically.</p>

                    <button
                        onClick={handleLogin}
                        className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 font-semibold px-4 py-3 rounded-xl hover:bg-slate-100 transition-colors shadow-lg"
                    >
                        <LogIn className="w-5 h-5" />
                        Continue with Google
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#0f172a]">
            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <Dashboard />
                </div>
                <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <ChatInterface />
                </div>
            </div>

            {/* Floating Top Nav for PWA */}
            <div className="fixed top-3 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-500 delay-300">
                <div className="glass-panel flex items-center gap-1 p-1.5 rounded-full shadow-2xl">
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === "dashboard"
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                            }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="hidden sm:inline tracking-wide">Dashboard</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("chat")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === "chat"
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden sm:inline tracking-wide">Coach Chat</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
