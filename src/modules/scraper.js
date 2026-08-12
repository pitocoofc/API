import * as cheerio from "cheerio";

export async function rasparPaginaWeb(targetUrl, format = "text") {
  try {
    let finalUrl = targetUrl.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }

    const res = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      redirect: "follow"
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").text().trim() || $("h1").first().text().trim() || "Sem título";

    // MODALIDADE 1: Extração de Código Bruto (HTML, CSS, JS)
    if (format === "code" || format === "raw") {
      const styles = [];
      const scripts = [];

      // Coleta o CSS inline e tags <style>
      $("style").each((_, el) => {
        const cssContent = $(el).html()?.trim();
        if (cssContent) styles.push(cssContent);
      });

      // Coleta o JS inline e tags <script>
      $("script").each((_, el) => {
        const type = $(el).attr("type");
        // Filtra scripts que não sejam JSON-LD ou dados
        if (!type || type.includes("javascript") || type.includes("ecmascript")) {
          const jsContent = $(el).html()?.trim();
          if (jsContent) scripts.push(jsContent);
        }
      });

      // Limpa do HTML tags para entregar o HTML puro da estrutura
      $("script, style").remove();
      const cleanHtml = $("body").html()?.trim() || $.html();

      return {
        title,
        format: "code",
        html: cleanHtml.substring(0, 20000), // Limite seguro para não estourar payload
        css: styles.join("\n\n").substring(0, 10000),
        js: scripts.join("\n\n").substring(0, 10000)
      };
    }

    // MODALIDADE 2: Extração de Texto Limpo (Padrão)
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
