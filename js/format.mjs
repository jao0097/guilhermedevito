/**
 * SuperLista V2 - Utilitários de formatação e normalização (pt-BR)
 */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata um valor numérico como moeda brasileira: 1234.5 -> "R$ 1.234,50" */
export function formatBRL(value) {
  const n = Number(value);
  // Intl usa espaço não separável; trocamos por espaço comum para copiar/colar sem surpresas
  return brl.format(Number.isFinite(n) ? n : 0).replace(/ /g, ' ');
}

/** Formata quantidade sem zeros desnecessários e com vírgula decimal: 1.5 -> "1,5", 2 -> "2" */
export function formatQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '1';
  return String(Math.round(n * 1000) / 1000).replace('.', ',');
}

/** Converte texto digitado pelo usuário ("12,50", "R$ 8.5", "1.234,56") em número, ou NaN */
export function parseDecimal(input) {
  if (typeof input === 'number') return input;
  if (input === null || input === undefined) return NaN;
  let s = String(input).replace(/R\$\s*/i, '').trim();
  if (!s) return NaN;
  if (s.includes(',')) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Remove acentos e caixa para comparações tolerantes: "Feijão" -> "feijao" */
export function normalizeText(str) {
  return String(str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}
