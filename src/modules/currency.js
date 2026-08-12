export async function converterMoeda(amount = 1, from = "USD", to = "BRL") {
  try {
    const url = `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erro Frankfurter");
    return await res.json();
  } catch {
    return null;
  }
}
