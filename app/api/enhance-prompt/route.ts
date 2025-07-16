import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  // CORS preflight (for edge runtime, Next.js handles most CORS, but add headers for safety)
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const body = await req.json();
    const { prompt } = body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Missing or invalid prompt.' }, {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured.' }, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const systemPrompt =
      'You are a prompt enhancer for an AI image generator. Given a user prompt, rewrite it to be more vivid, creative, and visually detailed for generating a stunning YouTube thumbnail. Focus on clarity, vivid imagery, and creative composition.';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 120,
      temperature: 0.9,
      n: 1,
    });

    const enhancedPrompt = completion.choices?.[0]?.message?.content?.trim();
    if (!enhancedPrompt) {
      return NextResponse.json({ error: 'No enhanced prompt returned from OpenAI.' }, {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    return NextResponse.json({ enhancedPrompt }, {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err: unknown) {
    console.error('Enhance prompt API error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
} 