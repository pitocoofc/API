export async function traduzirTexto(text, from = "auto", to = "pt") {
  try {
    const url = `https://simplytranslate.org/api/translate/?engine=google&text=${encodeURIComponent(text)}&from=${from}&to=${to}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erro SimplyTranslate");
    const data = await res.json();
    return data.translated_text || text;
  } catch {
    return null;
  }
}
