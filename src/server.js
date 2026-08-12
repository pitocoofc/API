import express from "express";
import { buscarNoSearXNG, buscarWikipediaAPI } from "./modules/search.js";
import { traduzirTexto } from "./modules/translate.js";
import { converterMoeda } from "./modules/currency.js";
import { rasparPaginaWeb } from "./modules/scraper.js";

const app = express();
app.use(express.json());

const SEARXNG_URL = process.env.SEARXNG_URL || "https://g-jxlf.onrender.com";

// Endpoint de Busca Unificada
app.get("/v1/search", async (req, res) => {
  const { q, lang = "pt" } = req.query;
  if (!q) return res.status(400).json({ error: "Parâmetro 'q' é obrigatório" });

  let dados = await buscarNoSearXNG(q, lang, SEARXNG_URL);

  if (!dados.resumo) {
    dados.resumo = await buscarWikipediaAPI(q, lang);
  }

  return res.json({
    query: q,
    summary: dados.resumo,
    sources: dados.urls
  });
});

// Endpoint de Tradução
app.get("/v1/translate", async (req, res) => {
  const { text, from = "auto", to = "pt" } = req.query;
  if (!text) return res.status(400).json({ error: "Parâmetro 'text' é obrigatório" });

  const translated = await traduzirTexto(text, from, to);
  if (!translated) return res.status(500).json({ error: "Falha ao traduzir texto" });

  return res.json({ original: text, translated, from, to });
});

// Endpoint de Cotação de Moeda
app.get("/v1/currency", async (req, res) => {
  const { amount = 1, from = "USD", to = "BRL" } = req.query;
  const result = await converterMoeda(amount, from, to);
  if (!result) return res.status(500).json({ error: "Falha ao converter moeda" });

  return res.json(result);
});

// Endpoint de Raspagem/Scraper Web
app.get("/v1/scrape", async (req, res) => {
  let { url, format = "text" } = req.query;
  if (!url) return res.status(400).json({ error: "Parâmetro 'url' é obrigatório" });

  // Limpa aspas ou colchetes acidentais enviados na URL
  const cleanUrl = decodeURIComponent(url).replace(/[\[\]'"]/g, "").trim();

  const scrapedData = await rasparPaginaWeb(cleanUrl, format.toLowerCase());
  if (!scrapedData) return res.status(500).json({ error: "Falha ao extrair conteúdo da URL" });

  return res.json(scrapedData);
});

// Health check
app.get("/", (_, res) => res.send("🤖 Unified AI Gateway Online!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Gateway rodando na porta ${PORT}`));
