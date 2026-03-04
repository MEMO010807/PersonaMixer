"use client";

import { useState, useEffect } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import { MessageSquare, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
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
        <div className="h-screen flex flex-col bg-[#0f172a] overflow-hidden">
            <ChatInterface />
        </div>
    );
}
