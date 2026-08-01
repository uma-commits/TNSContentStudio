// Minimal dependency-free HTML → text scraper for feeding a product/service
// page to an LLM as grounding. No JS rendering, so single-page apps that
// render content client-side will yield thin text — good enough for
// marketing/landing pages, which are almost always server-rendered.
export async function scrapePageText(url: string): Promise<{ title: string; text: string }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ContentStudioBriefBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();

  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() || "";

  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const text = withoutNoise
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);

  if (!text) throw new Error("Page returned no readable text — it may be a JS-rendered app.");

  return { title, text };
}
