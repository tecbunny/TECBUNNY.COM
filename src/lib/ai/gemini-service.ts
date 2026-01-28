type GeminiGenerateParams = {
  prompt: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function extractGeminiText(payload: any): string {
  const candidate = payload?.candidates?.[0];
  const parts = candidate?.content?.parts;
  if (Array.isArray(parts)) {
    const textPart = parts.find((part: any) => typeof part?.text === 'string');
    if (textPart?.text) return textPart.text.trim();
  }
  if (typeof payload?.text === 'string') return payload.text.trim();
  return '';
}

export async function generateGeminiText({
  prompt,
  model = 'gemini-1.5-flash',
  temperature = 0.4,
  maxOutputTokens = 600,
}: GeminiGenerateParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = extractGeminiText(data);
  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  return text;
}
