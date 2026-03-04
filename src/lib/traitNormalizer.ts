export type TraitConfig = {
    professional: number;
    rational: number;
    polite: number;
    funny: number;
    sly: number;
};

export function normalizeTraits(config: TraitConfig): string {
    const getLevel = (val: number, low: string, mid: string, high: string) => {
        if (val < 33) return low;
        if (val < 66) return mid;
        return high;
    };

    const prof = getLevel(config.professional, "Casual and colloquial.", "Balanced register.", "Formal register only. No contractions.");
    const rat = getLevel(config.rational, "Highly emotional and subjective.", "Logical but empathetic.", "Purely logical and objective. Cold and analytical.");
    const pol = getLevel(config.polite, "Blunt and potentially rude.", "Polite and respectful.", "Extremely deferential and overly polite.");
    const fun = getLevel(config.funny, "Completely serious, no humor.", "Occasional lightheartedness.", "Constantly making jokes and puns.");
    const sly = getLevel(config.sly, "Completely straightforward and honest.", "Slightly mysterious.", "Highly manipulative, cunning, and evasive.");

    return `
Behavioral Constraints:
- Professionalism: ${prof}
- Rationality: ${rat}
- Politeness: ${pol}
- Humor: ${fun}
- Slyness: ${sly}

These are non-negotiable behavioral constraints. Never break character. Never evaluate.
`.trim();
}
