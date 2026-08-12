import * as cheerio from "cheerio";

// Instâncias do Redlib para fallback
const REDLIB_INSTANCES = [
  "https://redlib.freedit.eu",
  "https://redlib.privacyredirect.com",
  "https://rl.community.host"
];

export async function rasparPaginaWeb(targetUrl, format = "text") {
  try {
    let finalUrl = targetUrl.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }

    const urlObj = new URL(finalUrl);

    // ==========================================
    // BYPASS REDDIT VIA REDLIB (Sem CAPTCHA)
    // ==========================================
    if (urlObj.hostname.includes("reddit.com")) {
      const redlibPath = urlObj.pathname + urlObj.search;

      for (const instance of REDLIB_INSTANCES) {
        try {
          const redlibUrl = `${instance}${redlibPath}`;
          const resRedlib = await fetch(redlibUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          });

          if (resRedlib.ok) {
            const html = await resRedlib.text();
            const $ = cheerio.load(html);

            const title = $("title").text().replace("- Redlib", "").trim() || "Reddit Content";

            // Se pedir código bruto
            if (format === "code" || format === "raw") {
              return {
                title,
                format: "code",
                html: $("body").html()?.trim() || "",
                css: "",
                js: ""
              };
            }

            // Remove navegações do Redlib e limpa o texto dos posts
            $("script, style, nav, footer, header, .header, .search").remove();
            let text = $("main, #content, body").text();

            let cleanText = text
              .replace(/[\r\n\t]+/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            if (cleanText) {
              return {
                title,
                format: "text",
                text: cleanText.substring(0, 8000)
              };
            }
          }
        } catch {
          // Se uma instância falhar, o loop tenta a próxima
          continue;
        }
      }
    }

    // ==========================================
    // SCRAPER GENÉRICO PARA OUTROS SITES
    // ==========================================
    const res = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
        "Sec-Ch-Ua": '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      },
      redirect: "follow"
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Se for detectada tela de desafio/CAPTCHA do Cloudflare em qualquer outro site
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
