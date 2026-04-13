import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GeneratedContent } from "@/types";

// ============================================================
// WealthFlip — Content Pillars (rotated daily)
// ============================================================
const CONTENT_PILLARS = [
  {
    niche: "Side Hustle Ideas",
    angle: "a specific, actionable side hustle someone can start today with no money",
    example: "Make $200/day with your phone — no experience needed",
  },
  {
    niche: "Passive Income",
    angle: "a passive income stream that requires minimal effort to set up",
    example: "This app pays you $50/day just to walk",
  },
  {
    niche: "Money Saving Hacks",
    angle: "a surprising money-saving trick most people don't know about",
    example: "The 50/30/20 rule that saved me $10,000 this year",
  },
  {
    niche: "Investing for Beginners",
    angle: "a simple investing strategy anyone can start with $100 or less",
    example: "Turn $100 into $1,000 — here's exactly how",
  },
  {
    niche: "AI Money Tools",
    angle: "a free AI tool that helps people make or save money",
    example: "This free AI tool finds you side hustles in 30 seconds",
  },
  {
    niche: "Debt Freedom",
    angle: "a proven method to pay off debt faster than most people think possible",
    example: "Pay off $20,000 debt in 12 months with this method",
  },
  {
    niche: "Frugal Living",
    angle: "specific expenses people waste money on and how to cut them immediately",
    example: "7 expenses you should cut right now to save $500/month",
  },
];

// ============================================================
// Returns today's content pillar (rotates daily)
// ============================================================
export function getTrendingNiche(): string {
  const day = new Date().getDay();
  return CONTENT_PILLARS[day % CONTENT_PILLARS.length].niche;
}

export function getTodaysPillar() {
  const day = new Date().getDay();
  return CONTENT_PILLARS[day % CONTENT_PILLARS.length];
}

// ============================================================
// Generates a viral WealthFlip script using Gemini 1.5 Flash
// ============================================================
export async function generateVideoScript(
  niche: string,
  apiKey: string
): Promise<GeneratedContent> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  // Find matching pillar or use niche directly
  const pillar = CONTENT_PILLARS.find((p) => p.niche === niche) ?? {
    niche,
    angle: niche,
    example: niche,
  };

  const prompt = `You are a viral YouTube Shorts scriptwriter for the channel "WealthFlip" — a personal finance and side hustle channel.

Today's content pillar: "${pillar.niche}"
Angle: "${pillar.angle}"
Example title style: "${pillar.example}"

Return ONLY a valid JSON object. No markdown, no code blocks, no extra text. Use this exact structure:
{
  "title": "Viral YouTube title under 70 chars with a number or hook word",
  "description": "SEO description under 200 chars with hashtags #WealthFlip #SideHustle #PersonalFinance",
  "tags": ["side hustle", "make money online", "passive income", "personal finance", "wealth tips", "money hacks", "financial freedom"],
  "script_segments": [
    { "text": "Hook: shocking stat or bold claim under 20 words", "image_prompt": "person looking shocked at phone showing money" },
    { "text": "Problem: what most people are doing wrong under 20 words", "image_prompt": "person stressed about bills and debt" },
    { "text": "Solution step 1 under 20 words", "image_prompt": "person on laptop working from home smiling" },
    { "text": "Solution step 2 under 20 words", "image_prompt": "phone screen showing cash app or payment notification" },
    { "text": "Result + CTA: follow for daily money tips under 20 words", "image_prompt": "person celebrating with money or success" }
  ],
  "search_terms_for_background_video": ["person counting money", "laptop work from home", "financial freedom lifestyle"]
}

Rules:
- Hook MUST start with a number or shocking fact (e.g. "93% of people...", "$500 a day...")
- Each segment must be under 20 words
- Tone: energetic, direct, motivating — like a friend giving real advice
- Tags must target high-CPM finance keywords`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const parsed = parseGeminiJSON<GeneratedContent>(raw);
  parsed.full_script = parsed.script_segments.map((s) => s.text).join(" ");

  return parsed;
}

// ============================================================
// Strict JSON parser — strips markdown fences if Gemini adds them
// ============================================================
function parseGeminiJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`Gemini returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
}
