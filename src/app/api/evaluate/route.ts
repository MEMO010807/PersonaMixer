import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { TraitConfig, normalizeTraits } from '@/lib/traitNormalizer';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const evaluationSchema = {
    type: SchemaType.OBJECT,
    properties: {
        prof_score: { type: SchemaType.INTEGER, description: "Professional score 0-100" },
        rat_score: { type: SchemaType.INTEGER, description: "Rational score 0-100" },
        pol_score: { type: SchemaType.INTEGER, description: "Polite score 0-100" },
        fun_score: { type: SchemaType.INTEGER, description: "Funny score 0-100" },
        sly_score: { type: SchemaType.INTEGER, description: "Sly score 0-100" },
        critique: { type: SchemaType.STRING, description: "A 1-sentence critique of the target message." },
        rewrite: { type: SchemaType.STRING, description: "A rewrite of the target message embodying the desired traits." }
    },
    required: ["prof_score", "rat_score", "pol_score", "fun_score", "sly_score", "critique", "rewrite"]
};

export async function POST(req: Request) {
    try {
        const { history, sliderConfig } = await req.json();

        // history object shape: { role: "user" | "model", parts: [{ text: string }] }[]
        // Pass ONLY the last 6 messages
        const last6 = history.slice(-6).map((h: any) => `${h.role}: ${h.parts[0].text}`).join('\n');
        const targetTraits = normalizeTraits(sliderConfig as TraitConfig);

        const prompt = `
You are an expert AI communication coach. Evaluate the USER's last message in this conversation based on these desired target behavioral traits:

${targetTraits}

Conversation context (last 6 messages):
${last6}

Provide strictly typed JSON output evaluating the user's latest message. Calculate 0-100 scores for how well the user's message matches the 5 desired traits (Professional, Rational, Polite, Funny, Sly). Provide a 1-sentence critique and a better rewrite.
    `.trim();

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: evaluationSchema as any,
            }
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const evaluation = JSON.parse(responseText);

        return NextResponse.json(evaluation);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
