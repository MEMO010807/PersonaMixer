"use client";

import { useEffect, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { createClient } from "@/lib/supabase/client";

export default function Dashboard() {
    const supabase = createClient();
    const [stats, setStats] = useState<any>(null);
    const [rewrites, setRewrites] = useState<any[]>([]);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                fetchData(data.user.id);
            }
        });

        // Real-time listener for the cache changes
        const channel = supabase.channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'user_stats_cache' },
                (payload) => setStats(payload.new)
            )
            .subscribe();

        return () => { supabase.removeChannel(channel) };
    }, []);

    const fetchData = async (userId: string) => {
        const { data: statsData } = await supabase
            .from('user_stats_cache')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (statsData) setStats(statsData);

        const { data: evalsData } = await supabase
            .from('evaluations')
            .select('id, critique, rewrite, created_at, messages(content)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (evalsData) setRewrites(evalsData);
    };

    const chartData = stats ? [
        { subject: 'Professional', A: stats.avg_prof, fullMark: 100 },
        { subject: 'Rational', A: stats.avg_rat, fullMark: 100 },
        { subject: 'Polite', A: stats.avg_pol, fullMark: 100 },
        { subject: 'Funny', A: stats.avg_fun, fullMark: 100 },
        { subject: 'Sly', A: stats.avg_sly, fullMark: 100 },
    ] : [];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Chart Section */}
                <div className="glass-panel rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/20 blur-3xl rounded-full pointer-events-none" />
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <div className="w-2 h-6 bg-blue-500 rounded-full" />
                        Skill Radar
                    </h2>
                    <div className="h-80 w-full relative z-10">
                        {stats ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'transparent' }} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        itemStyle={{ color: '#60a5fa' }}
                                    />
                                    <Radar name="You" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">Not enough data to calculate stats yet.</div>
                        )}
                    </div>
                    {stats && (
                        <p className="text-center text-xs text-slate-500 mt-2">Based on {stats.total_evaluations} evaluations</p>
                    )}
                </div>

                {/* Rewrites Section */}
                <div className="glass-panel rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col h-[400px]">
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 blur-3xl rounded-full pointer-events-none" />
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                        Recent Rewrites
                    </h2>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 relative z-10">
                        {rewrites.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                                <p>Get evaluated in chat to see rewrites here.</p>
                            </div>
                        ) : (
                            rewrites.map(rw => (
                                <div key={rw.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:bg-slate-800 transition-colors group">
                                    <p className="text-xs text-slate-400 mb-2 font-mono">"{rw.messages?.content || 'Unknown original'}"</p>
                                    <p className="text-sm font-medium text-slate-200 leading-relaxed group-hover:text-white transition-colors">
                                        {rw.rewrite}
                                    </p>
                                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                                        <p className="text-xs text-indigo-400 italic">"{rw.critique}"</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
