import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Missing or invalid prompt.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });
    }

    // System prompt for enhancement
    const systemPrompt =
      'You are a prompt enhancer for an AI image generator. Given a user prompt, rewrite it to be more descriptive, creative, and visually detailed for generating a stunning YouTube thumbnail. Focus on clarity, vivid imagery, and creative composition.';

    // Call OpenAI ChatGPT 4.1 Nano
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano', // 4.1 Nano
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 120,
        temperature: 0.9,
        n: 1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: 'OpenAI API error', details: err }, { status: 502 });
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content?.trim();
    if (!enhancedPrompt) {
      return NextResponse.json({ error: 'No enhanced prompt returned from OpenAI.' }, { status: 502 });
    }

    return NextResponse.json({ enhancedPrompt }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Enhance prompt API error:', err.message, err.stack);
    } else {
      console.error('Enhance prompt API error:', err);
    }
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
} 