import * as cheerio from "cheerio";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

export async function buscarWikipediaAPI(termo, idioma = "pt") {
  try {
    const termoFormatado = encodeURIComponent(termo.trim().replace(/\s+/g, "_"));
    const url = `https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${termoFormatado}`;
    const res = await fetch(url, { headers: { "User-Agent": "UnifiedAIGateway/1.0" } });
    if (!res.ok) return null;
    const dados = await res.json();
    return dados?.extract && dados.type !== "no-summary" ? dados.extract : null;
  } catch {
    return null;
  }
}

export async function buscarNoSearXNG(termoBusca, idioma = "pt", instanceUrl = "https://g-jxlf.onrender.com") {
  try {
    let url = `${instanceUrl}/search?q=${encodeURIComponent(termoBusca)}&categories=general`;
    if (idioma === "pt") url += "&language=pt-BR";

    const resposta = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!resposta.ok) throw new Error("Erro SearXNG");

    const html = await resposta.text();
    const $ = cheerio.load(html);

    let resumo = null;
    const elementoAnswer = $("#answers .answer span");
    if (elementoAnswer.length > 0) {
      const clone = elementoAnswer.clone();
      clone.find("a").remove();
      resumo = clone.text().replace(/\s+/g, " ").trim();
    }

    if (!resumo) {
      const paragrafoInfobox = $("aside.infobox p bdi");
      if (paragrafoInfobox.length > 0) {
        resumo = paragrafoInfobox.text().replace(/\s+/g, " ").trim();
      }
    }

    const urlsEncontradas = [];
    $("article.result h3 a").each((_, el) => {
      const link = $(el).attr("href");
      if (link && urlsEncontradas.length < 5) urlsEncontradas.push(link);
    });

    return { resumo, urls: urlsEncontradas };
  } catch {
    return { resumo: null, urls: [] };
  }
}
