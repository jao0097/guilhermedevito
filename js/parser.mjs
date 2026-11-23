/**
 * Parser inteligente de itens para supermercado
 * Extrai quantidade, unidade, nome, preço e categoria sugerida a partir de
 * linguagem natural digitada ou falada ("dois quilos de tomate", "3x sabonete R$ 2,50").
 */

import { normalizeText, parseDecimal } from './format.mjs';

const CATEGORY_KEYWORDS = [
  {
    category: 'Hortifruti',
    keywords: ['tomate', 'maçã', 'banana', 'cebola', 'alho', 'batata', 'batata doce', 'cenoura', 'alface', 'limão', 'laranja', 'morango', 'uva', 'abacaxi', 'mamão', 'manga', 'pera', 'melancia', 'melão', 'abacate', 'pepino', 'chuchu', 'abobrinha', 'abóbora', 'rúcula', 'couve', 'brócolis', 'pimentão', 'mandioca', 'aipim', 'beterraba', 'repolho', 'espinafre', 'salsinha', 'cebolinha', 'coentro', 'cheiro verde', 'gengibre', 'inhame', 'kiwi', 'maracujá', 'goiaba', 'pêssego', 'ameixa', 'tangerina', 'mexerica', 'berinjela', 'quiabo', 'vagem', 'jiló', 'fruta', 'legume', 'verdura']
  },
  {
    category: 'Padaria',
    keywords: ['pão', 'pão de queijo', 'torrada', 'bolo', 'biscoito', 'bolacha', 'croissant', 'baguete', 'broa', 'brioche', 'salgado', 'tortinha', 'sonho', 'rosca']
  },
  {
    category: 'Carnes & Aves',
    keywords: ['carne', 'alcatra', 'picanha', 'patinho', 'acém', 'contrafilé', 'maminha', 'fraldinha', 'cupim', 'músculo', 'filé', 'frango', 'peito', 'coxa', 'sobrecoxa', 'moída', 'linguiça', 'costela', 'bacon', 'peixe', 'tilápia', 'salmão', 'camarão', 'pernil', 'lombo', 'bife', 'hambúrguer', 'salsicha', 'presunto', 'mortadela', 'salame', 'peito de peru', 'frios']
  },
  {
    category: 'Laticínios & Ovos',
    keywords: ['leite', 'queijo', 'manteiga', 'margarina', 'requeijão', 'iogurte', 'yogurte', 'ovo', 'creme de leite', 'leite condensado', 'ricota', 'mussarela', 'muçarela', 'parmesão', 'nata', 'coalhada', 'cream cheese']
  },
  {
    category: 'Mercearia',
    keywords: ['arroz', 'feijão', 'macarrão', 'massa', 'café', 'açúcar', 'sal', 'óleo', 'azeite', 'vinagre', 'farinha', 'fubá', 'polvilho', 'molho', 'molho de tomate', 'extrato', 'extrato de tomate', 'milho', 'ervilha', 'atum', 'sardinha', 'aveia', 'granola', 'cereal', 'maionese', 'ketchup', 'mostarda', 'tempero', 'chocolate', 'achocolatado', 'gelatina', 'pipoca', 'leite de coco', 'leite em pó', 'biscoito de polvilho']
  },
  {
    category: 'Bebidas',
    keywords: ['cerveja', 'refrigerante', 'refri', 'suco', 'vinho', 'espumante', 'água', 'água com gás', 'chá', 'energético', 'isotônico', 'vodka', 'whisky', 'cachaça', 'gin', 'coca', 'guaraná', 'tônica']
  },
  {
    category: 'Limpeza & Higiene',
    keywords: ['detergente', 'sabão', 'amaciante', 'desinfetante', 'água sanitária', 'cloro', 'esponja', 'papel higiênico', 'papel toalha', 'saco de lixo', 'sabonete', 'xampu', 'shampoo', 'condicionador', 'pasta de dente', 'creme dental', 'escova', 'escova de dente', 'desodorante', 'fio dental', 'alvejante', 'lã de aço', 'limpador', 'multiuso', 'fralda', 'absorvente', 'lenço umedecido', 'cotonete']
  },
  {
    category: 'Pet & Bazar',
    keywords: ['ração', 'petisco', 'areia', 'areia de gato', 'gato', 'cachorro', 'pilha', 'fósforo', 'guardanapo', 'vela', 'filme plástico', 'papel alumínio', 'lâmpada', 'carvão']
  }
];

// Pré-processa as palavras-chave (normalizadas e com regex compiladas uma única vez)
const KEYWORD_INDEX = CATEGORY_KEYWORDS.flatMap(({ category, keywords }) =>
  keywords.map(kw => {
    const norm = normalizeText(kw);
    const escaped = norm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    // Aceita plural simples: "tomates", "limoes" não, mas "laranjas", "ovos", "detergentes" sim
    return { category, norm, regex: new RegExp(`(^|[^a-z0-9])(${escaped})(s|es)?(?=[^a-z0-9]|$)`) };
  })
);

/**
 * Detecta o corredor do produto. Prioriza a palavra-chave que aparece primeiro no nome
 * (o "núcleo" do produto em português: "Suco de laranja" é bebida, não hortifruti)
 * e, em empate, a mais longa ("Água sanitária" vence "Água").
 */
export function detectCategory(name) {
  if (!name || typeof name !== 'string') return 'Outros';
  const clean = normalizeText(name);

  let best = null;
  for (const entry of KEYWORD_INDEX) {
    const m = entry.regex.exec(clean);
    if (!m) continue;
    const pos = m.index + m[1].length;
    const len = m[2].length;
    if (!best || pos < best.pos || (pos === best.pos && len > best.len)) {
      best = { pos, len, category: entry.category };
    }
  }
  return best ? best.category : 'Outros';
}

// Números por extenso (comuns em entrada por voz)
const NUMBER_WORDS = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7,
  oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, quinze: 15, vinte: 20, trinta: 30,
  meio: 0.5, meia: 0.5
};

// Unidades por extenso ou abreviadas -> unidade canônica
const UNIT_ALIASES = {
  kg: 'kg', quilo: 'kg', quilos: 'kg', kilo: 'kg', kilos: 'kg', quilograma: 'kg', quilogramas: 'kg',
  g: 'g', gr: 'g', grama: 'g', gramas: 'g',
  l: 'L', lt: 'L', litro: 'L', litros: 'L',
  ml: 'ml', mililitro: 'ml', mililitros: 'ml',
  un: 'un', und: 'un', unid: 'un', unidade: 'un', unidades: 'un',
  lata: 'un', latas: 'un', garrafa: 'un', garrafas: 'un', pote: 'un', potes: 'un',
  bandeja: 'un', bandejas: 'un', saco: 'un', sacos: 'un', maco: 'un', macos: 'un',
  pct: 'pct', pacote: 'pct', pacotes: 'pct',
  cx: 'cx', caixa: 'cx', caixas: 'cx',
  dz: 'dz', duzia: 'dz', duzias: 'dz'
};

const NUM = String.raw`\d+(?:[.,]\d+)?`;
const PREP = String.raw`(?:de|da|do|dos|das)`;

function toNumber(token) {
  if (token === undefined || token === null) return NaN;
  const t = normalizeText(token);
  if (t in NUMBER_WORDS) return NUMBER_WORDS[t];
  return parseFloat(t.replace(',', '.'));
}

export function parseItemInput(rawText) {
  const empty = { name: '', qty: 1, unit: 'un', category: 'Outros', price: null };
  if (!rawText || typeof rawText !== 'string') return empty;

  let text = rawText.normalize('NFC').trim().replace(/\s+/g, ' ');
  let qty = 1;
  let unit = 'un';
  let price = null;

  // 0. Preço em qualquer posição: "tomate R$ 8,50", "por R$8.90"
  const priceMatch = text.match(/(?:^|\s)(?:(?:por|a)\s+)?R\$\s*(\d+(?:[.,]\d{1,2})?)(?=\s|$)/i);
  if (priceMatch) {
    const p = parseDecimal(priceMatch[1]);
    if (Number.isFinite(p) && p >= 0) price = p;
    text = (text.slice(0, priceMatch.index) + ' ' + text.slice(priceMatch.index + priceMatch[0].length)).trim().replace(/\s+/g, ' ');
  }

  // Trabalha numa versão sem acentos apenas para casar padrões, preservando o nome original
  const normalized = normalizeText(text);
  const numberWords = Object.keys(NUMBER_WORDS).join('|');
  const unitWords = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length).join('|');
  const qtyToken = `(${NUM}|${numberWords})`;

  let consumed = 0;

  // 1. "2x Item", "2 x Item"
  let m = normalized.match(new RegExp(`^(${NUM})\\s*x\\s+`));
  if (m) {
    qty = toNumber(m[1]);
    consumed = m[0].length;
  } else {
    // 2. "1,5 kg de tomate", "500g carne", "dois quilos de tomate", "meia duzia de ovos"
    m = normalized.match(new RegExp(`^${qtyToken}\\s*(${unitWords})\\.?(?=\\s|$)\\s*(?:${PREP}\\s+)?`));
    if (m) {
      qty = toNumber(m[1]);
      unit = UNIT_ALIASES[m[2]] || 'un';
      consumed = m[0].length;
    } else {
      // 3. Número simples no início: "2 detergentes", "tres cebolas" (meio/meia exigem unidade)
      m = normalized.match(new RegExp(`^(${NUM}|${numberWords})\\s+(?:${PREP}\\s+)?`));
      if (m && !/^mei[oa]$/.test(m[1])) {
        qty = toNumber(m[1]);
        consumed = m[0].length;
      }
    }
  }

  // NFD remove apenas marcas combinantes: o comprimento normalizado bate com o original,
  // então podemos cortar o texto original na mesma posição.
  text = text.slice(consumed).trim();

  // 4. Quantidade no final: "Sabonete x3", "Sabonete 3x"
  if (!consumed) {
    const suffix = text.match(/^(.+?)\s+(?:x\s*(\d+)|(\d+)\s*x)$/i);
    if (suffix) {
      qty = parseFloat(suffix[2] || suffix[3]);
      text = suffix[1].trim();
    }
  }

  // Limpar preposição no começo caso tenha sobrado: "de queijo" -> "queijo"
  text = text.replace(/^(?:de|da|do|dos|das)\s+/i, '').trim();

  // Meia dúzia, 1,5 dúzia... -> converte para unidades inteiras
  if (unit === 'dz' && !Number.isInteger(qty)) {
    qty = Math.round(qty * 12);
    unit = 'un';
  }

  const formattedName = text ? text.charAt(0).toUpperCase() + text.slice(1) : '';

  return {
    name: formattedName,
    qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
    unit: unit || 'un',
    category: detectCategory(formattedName),
    price
  };
}
