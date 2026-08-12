import * as cheerio from "cheerio";

export async function rasparPaginaWeb(targetUrl, format = "text") {
  try {
    let finalUrl = targetUrl.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }

    const urlObj = new URL(finalUrl);

    // ==========================================
    // TRATAMENTO ESPECIAL PARA REDDIT / SUBDOMÍNIOS
    // ==========================================
    if (urlObj.hostname.includes("reddit.com")) {
      // Se for o Reddit, usamos a API nativa de JSON deles adicionando .json na URL
      let jsonUrl = finalUrl.split("?")[0];
      if (!jsonUrl.endsWith(".json")) {
        jsonUrl = jsonUrl.endsWith("/") ? `${jsonUrl}.json` : `${jsonUrl}/.json`;
      }

      const resReddit = await fetch(jsonUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
        }
      });

      if (resReddit.ok) {
        const data = await resReddit.json();
        
        // Se for um feed de Subreddit ou post único
        if (Array.isArray(data)) {
          // É um Post com comentários
          const post = data[0]?.data?.children[0]?.data;
          const comments = data[1]?.data?.children || [];
          
          const title = post?.title || "Reddit Post";
          const selftext = post?.selftext || "";
          const topComments = comments
            .slice(0, 5)
            .map(c => c.data?.body)
            .filter(Boolean)
            .join("\n---\n");

          return {
            title,
            format: "text",
            text: `[POST]: ${selftext}\n\n[PRINCIPAIS COMENTÁRIOS]:\n${topComments}`.substring(0, 8000)
          };
        } else if (data?.data?.children) {
          // É a lista de posts de um Subreddit
          const posts = data.data.children;
          const listText = posts
            .slice(0, 10)
            .map(p => `• ${p.data.title} (Upvotes: ${p.data.ups})`)
            .join("\n");

          return {
            title: `Subreddit: ${urlObj.pathname}`,
            format: "text",
            text: listText.substring(0, 8000)
          };
        }
      }
    }

    // ==========================================
    // SCRAPER GENÉRICO PARA OUTROS SITES/SUBDOMÍNIOS
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
