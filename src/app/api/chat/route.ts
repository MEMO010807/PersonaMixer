import { GoogleGenerativeAI } from '@google/generative-ai';
import { TraitConfig, normalizeTraits } from '@/lib/traitNormalizer';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || '';
const sarvamApiKey = process.env.SARVAM_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
    try {
        const { history, sliderConfig, language } = await req.json();

        const systemInstruction = normalizeTraits(sliderConfig as TraitConfig);

        if (language === 'hindi') {
            // Sarvam AI Integration for Hinglish
            const sarvamHistory = history.map((msg: any) => ({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.parts[0].text
            }));

            // Prepend the system instruction as the first message
            const finalSysInstruction = "You are a conversational AI coach. " + systemInstruction + "\nIMPORTANT: You MUST reply entirely in natural conversational Hindi, written using the English alphabet (Hinglish). Do NOT reply in English. Do NOT use the Devanagari script.";
            sarvamHistory.unshift({ role: 'system', content: finalSysInstruction });

            const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-subscription-key': sarvamApiKey
                },
                body: JSON.stringify({
                    model: 'sarvam-m',
                    messages: sarvamHistory,
                    temperature: 0.7,
                    max_tokens: 500,
                })
            });

            if (!response.ok) {
                const errData = await response.text();
                throw new Error(`Sarvam API error: ${errData}`);
            }

            const data = await response.json();
            return NextResponse.json({ text: data.choices[0].message.content });

        } else {
            // Gemini Integration for English
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
        }
    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
