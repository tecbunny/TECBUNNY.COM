import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '../../../../lib/supabase/server';
import { generateGeminiText } from '../../../../lib/ai/gemini-service';
import { getProductDisplayImage } from '../../../../lib/image-utils';

export const dynamic = 'force-dynamic';

// ── Allowed topics ─────────────────────────────────────────────────────────
const CCTV_IT_KEYWORDS = [
  // CCTV / security
  'cctv', 'camera', 'cameras', 'nvr', 'dvr', 'surveillance', 'security camera',
  'ip camera', 'ptz', 'dome', 'bullet camera', 'fisheye', 'analog',
  'hikvision', 'dahua', 'cp plus', 'cpplus', 'uniview', 'axis', 'reolink',
  'access control', 'intercom', 'biometric', 'fingerprint', 'attendance',
  // IT / computer hardware
  'computer', 'laptop', 'desktop', 'pc', 'monitor', 'keyboard', 'mouse',
  'ram', 'memory', 'ssd', 'hdd', 'hard disk', 'storage', 'processor', 'cpu',
  'motherboard', 'gpu', 'graphics card', 'graphics', 'power supply', 'ups',
  'router', 'switch', 'wifi', 'network', 'networking', 'lan', 'cable', 'patch',
  'printer', 'scanner', 'projector', 'server', 'rack',
  // Services / generic intent
  'amc', 'installation', 'maintenance', 'repair', 'install',
  'product', 'spec', 'specification', 'feature', 'compare', 'comparison',
  'recommend', 'recommendation', 'which', 'best', 'difference', 'vs',
  'tecbunny', 'techbunny',
];

// ── Quote / pricing keywords ───────────────────────────────────────────────
const QUOTE_KEYWORDS = [
  'quote', 'quotation', 'price', 'pricing', 'cost', 'how much', 'budget',
  'estimate', 'custom setup', 'package', 'bundle', 'total cost',
  'setup cost', 'installation cost', 'rate', 'rates', 'tariff',
];

// ── Topic helpers ──────────────────────────────────────────────────────────
function isTopicAllowed(query: string): boolean {
  const lower = query.toLowerCase();
  return CCTV_IT_KEYWORDS.some((kw) => lower.includes(kw));
}

function isQuoteRequest(query: string): boolean {
  const lower = query.toLowerCase();
  return QUOTE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── System instruction ─────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are TecBunny AI — the dedicated product specialist for TecBunny Solutions, \
a CCTV and IT hardware company based in Goa, India.

STRICT RULES — follow these without exception:
1. You ONLY answer questions about CCTV products, IT/computer hardware, \
networking equipment, security systems, and TecBunny's product catalog.
2. For ANY off-topic question, respond exactly: \
"I can only assist with CCTV and IT product questions. Please contact our support team for anything else."
3. NEVER mention, guess, or suggest prices, costs, discounts, or budgets. \
If the user asks about pricing, respond exactly: \
"For pricing and custom quotes, please use our Customised Setups tool at /customised-setups"
4. Base every answer on the product catalog data provided. Do not invent specs or \
details that are not in the catalog.
5. Be concise, professional, and helpful. Use Markdown (bold, bullets) for clarity.`;

// ── Route handler ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    // 1. Quote intent → send to /customised-setups ─────────────────────────
    if (isQuoteRequest(query)) {
      return NextResponse.json({
        type: 'quote_redirect',
        summary: 'It looks like you need pricing or a custom quote.',
        quoteUrl: '/customised-setups',
        products: [],
      });
    }

    // 2. Off-topic guard ───────────────────────────────────────────────────
    if (!isTopicAllowed(query)) {
      return NextResponse.json({
        type: 'off_topic',
        summary:
          'I can only assist with CCTV and IT product questions. Try asking about cameras, NVR/DVR systems, computers, networking gear, or any tech hardware we carry.',
        products: [],
      });
    }

    // 3. Search internal product catalog ──────────────────────────────────
    const supabase = await createClient();

    const { data: products } = await supabase
      .from('products')
      .select(
        'id,title,name,description,product_type,category,brand,tags,specifications,image,images,additional_images'
      )
      .or(
        [
          `title.ilike.%${query}%`,
          `name.ilike.%${query}%`,
          `category.ilike.%${query}%`,
          `brand.ilike.%${query}%`,
          `description.ilike.%${query}%`,
        ].join(',')
      )
      .limit(6);

    const safeProducts = (products || []).map((p) => ({
      id: p.id,
      title: p.title || p.name || 'Product',
      description: (p.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
      category: p.category ?? null,
      brand: p.brand ?? null,
      productType: p.product_type ?? null,
      tags: Array.isArray(p.tags) ? p.tags : [],
      specifications: p.specifications ?? null,
      image: getProductDisplayImage(p),
      images: [] as string[],
    }));

    // 4. Build prompt with catalog context ────────────────────────────────
    const catalogContext = safeProducts.length
      ? safeProducts
          .map((p, i) => {
            const lines = [
              `Product ${i + 1}: ${p.title}`,
              p.brand ? `Brand: ${p.brand}` : null,
              p.category ? `Category: ${p.category}` : null,
              p.productType ? `Type: ${p.productType}` : null,
              p.description ? `Description: ${p.description}` : null,
              p.tags?.length ? `Tags: ${p.tags.join(', ')}` : null,
            ].filter(Boolean);
            return lines.join('\n');
          })
          .join('\n\n')
      : 'No exact product match found in the catalog for this query.';

    const prompt = `Customer question: "${query}"

Relevant products from TecBunny's catalog:
${catalogContext}

Answer the customer's question about CCTV or IT products using the catalog data above.
Structure your response in Markdown:
1. **Overview** — what this product or category is
2. **Key Features** — what to look for
3. **Our Products** — highlight matching catalog items (if any)
4. **Next Steps** — how to proceed (view product page, request installation, etc.)

Be concise and helpful. Do not mention prices. Do not answer off-topic questions.`;

    // 5. Call Vertex AI / Gemini ──────────────────────────────────────────
    const rawResponse = await generateGeminiText({
      prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
      maxOutputTokens: 2000,
    });

    return NextResponse.json({
      type: 'info',
      summary: rawResponse,
      products: safeProducts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate AI response.' },
      { status: 500 }
    );
  }
}
