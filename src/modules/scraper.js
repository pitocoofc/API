import * as cheerio from "cheerio";

export async function rasparPaginaWeb(targetUrl, format = "text") {
  try {
    let finalUrl = targetUrl.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }

    const urlObj = new URL(finalUrl);

    // ==========================================
    // BYPASS DEFINITIVO DO REDDIT VIA RSS/ATOM (NÃO BLOQUEIA)
    // ==========================================
    if (urlObj.hostname.includes("reddit.com")) {
      // Monta a URL de feed RSS (ex: https://www.reddit.com/r/javascript.rss)
      let rssUrl = finalUrl.split("?")[0];
      if (rssUrl.endsWith("/")) rssUrl = rssUrl.slice(0, -1);
      if (!rssUrl.endsWith(".rss")) rssUrl = `${rssUrl}.rss`;

      const resRss = await fetch(rssUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
          "Accept": "application/atom+xml,application/xml,text/xml"
        }
      });

      if (resRss.ok) {
        const xmlText = await resRss.text();
        const $ = cheerio.load(xmlText, { xmlMode: true });

        const title = $("feed > title").text() || $("entry > title").first().text() || "Reddit Feed";
        const entries = [];

        $("entry").slice(0, 10).each((_, el) => {
          const entryTitle = $(el).find("title").text().trim();
          const contentHtml = $(el).find("content").text();
          
          // Extrai o texto limpo do HTML dentro da tag <content> do RSS
          const $content = cheerio.load(contentHtml);
          $content("a").remove(); // Remove links repetidos
          const cleanContent = $content.text().replace(/\s+/g, " ").trim();

          if (entryTitle) {
            entries.push(`• ${entryTitle}\n  ${cleanContent.substring(0, 300)}`);
          }
        });

        if (entries.length > 0) {
          return {
            title,
            format: "text",
            text: entries.join("\n\n").substring(0, 8000)
          };
        }
      }
    }

    // ==========================================
    // SCRAPER GENÉRICO PARA OUTROS SITES
    // ==========================================
    const res = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Upgrade-Insecure-Requests": "1"
      },
      redirect: "follow"
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const isCaptcha = $("title").text().toLowerCase().includes("prove your humanity") || 
                      $("title").text().toLowerCase().includes("just a moment");

    if (isCaptcha) {
      return {
        title: "Bloqueio de CAPTCHA / Cloudflare",
        format: "text",
        text: "Erro: A página solicitada requer verificação humana (CAPTCHA) e não pode ser raspada diretamente."
      };
    }

    const title = $("title").text().trim() || $("h1").first().text().trim() || "Sem título";

    // MODALIDADE 1: Extração de Código (code / raw)
    if (format === "code" || format === "raw") {
      const styles = [];
      const scripts = [];

      $("style").each((_, el) => {
        const cssContent = $(el).html()?.trim();
        if (cssContent) styles.push(cssContent);
      });

      $("script").each((_, el) => {
        const type = $(el).attr("type");
        if (!type || type.includes("javascript") || type.includes("ecmascript")) {
          const jsContent = $(el).html()?.trim();
          if (jsContent) scripts.push(jsContent);
        }
      });

      $("script, style").remove();
      const cleanHtml = $("body").html()?.trim() || $.html();

      return {
        title,
        format: "code",
        html: cleanHtml.substring(0, 20000),
        css: styles.join("\n\n").substring(0, 10000),
        js: scripts.join("\n\n").substring(0, 10000)
      };
    }

    // MODALIDADE 2: Texto Limpo (padrão)
    $("script, style, nav, footer, iframe, noscript, header, svg, form, button, [role='banner'], [role='navigation']").remove();

    let mainSelector = $("main, article, [role='main'], #content, .content, body");
    let mainContent = mainSelector.first().text();

    let cleanText = mainContent
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      title,
      format: "text",
      text: cleanText.substring(0, 8000)
    };

  } catch (err) {
    return null;
  }
}
