import * as cheerio from "cheerio";

export async function rasparPaginaWeb(targetUrl) {
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove tags desnecessárias
    $("script, style, nav, footer, iframe, noscript, header, svg").remove();

    const title = $("title").text().trim();
    let text = $("main, article, body").text();

    // Limpa espaços extras e linhas vazias
    text = text.replace(/\s+/g, " ").trim();

    return { title, text: text.substring(0, 8000) }; // Retorna os primeiros 8k chars
  } catch {
    return null;
  }
}
