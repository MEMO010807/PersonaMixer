import { GoogleGenerativeAI } from '@google/generative-ai';
import { TraitConfig, normalizeTraits } from '@/lib/traitNormalizer';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
    try {
        const { history, sliderConfig } = await req.json();

        const systemInstruction = normalizeTraits(sliderConfig as TraitConfig);

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction,
        });

        const chat = model.startChat({
            history: history.slice(0, -1),
        });

        const lastMessage = history[history.length - 1];
        const result = await chat.sendMessage(lastMessage.parts[0].text);

        return NextResponse.json({ text: result.response.text() });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
