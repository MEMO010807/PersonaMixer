"use client";

import { useState } from "react";
import { Sliders, X } from "lucide-react";
import { TraitConfig } from "@/lib/traitNormalizer";

export default function MixerModal({
    config,
    onChange,
    onClose
}: {
    config: TraitConfig;
    onChange: (c: TraitConfig) => void;
    onClose: () => void;
}) {
    const [localConfig, setLocalConfig] = useState<TraitConfig>(config);

    const handleApply = () => {
        onChange(localConfig);
        onClose();
    };

    const sliders = [
        { key: "professional", label: "Professionalism", low: "Casual", high: "Formal" },
        { key: "rational", label: "Rationality", low: "Emotional", high: "Logical" },
        { key: "polite", label: "Politeness", low: "Blunt", high: "Deferential" },
        { key: "funny", label: "Humor", low: "Serious", high: "Joking" },
        { key: "sly", label: "Slyness", low: "Direct", high: "Cunning" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-blue-400" />
                        Persona Mixer
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {sliders.map(({ key, label, low, high }) => {
                        const val = localConfig[key as keyof TraitConfig];
                        return (
                            <div key={key} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm">{label}</span>
                                    <span className="text-xs text-blue-300 font-mono bg-blue-500/10 px-2 py-0.5 rounded">
                                        {val}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={val}
                                    onChange={(e) => setLocalConfig({ ...localConfig, [key]: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                                    <span>{low}</span>
                                    <span>{high}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 bg-slate-800/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        Apply Traits
                    </button>
                </div>
            </div>
        </div>
    );
}
