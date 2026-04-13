import { getTodaysPillar } from "@/core/ai/generator";

const FINANCE_KEYWORDS = [
  "money", "income", "invest", "crypto", "stock", "finance",
  "hustle", "earn", "salary", "budget", "debt", "savings",
  "rich", "wealth", "profit", "business", "freelance", "passive",
];

// ============================================================
// Fetch trending topics from Google Trends RSS
// ============================================================
async function fetchGoogleTrends(geo = "US"): Promise<string[]> {
  const url = `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
  });

  const text = await res.text();

  // Simple regex extraction — no xml2js needed
  const titles: string[] = [];
  let match;
  const regex = /<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] && match[1] !== "Daily Search Trends") {
      titles.push(match[1]);
    }
  }

  return titles.slice(0, 20);
}

// ============================================================
// Find a finance-related trend or fall back to today's pillar
// ============================================================
export async function getTrendingNicheFromRSS(): Promise<string> {
  try {
    const trends = await fetchGoogleTrends();
    const financeTrend = trends.find((t) =>
      FINANCE_KEYWORDS.some((kw) => t.toLowerCase().includes(kw))
    );
    if (financeTrend) return financeTrend;
  } catch {
    // Silently fall back
  }

  return getTodaysPillar().niche;
}
