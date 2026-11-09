/**
 * Parser inteligente de itens para supermercado
 * Extrai quantidade, unidade, nome e categoria sugerida a partir de linguagem natural ou fala.
 */

const CATEGORY_KEYWORDS = [
  {
    category: 'Hortifruti',
    keywords: ['tomate', 'maçã', 'banana', 'cebola', 'alho', 'batata', 'cenoura', 'alface', 'limão', 'laranja', 'morango', 'uva', 'abacaxi', 'mamão', 'manga', 'pera', 'melancia', 'abacate', 'pepino', 'chuchu', 'abobrinha', 'rúcula', 'couve', 'brócolis', 'pimentão', 'mandioca', 'aipim', 'fruta', 'legume', 'verdura']
  },
  {
    category: 'Padaria',
    keywords: ['pão', 'pao', 'torrada', 'bolo', 'biscoito', 'bolacha', 'croissant', 'baguete', 'broa', 'brioche', 'salgado', 'tortinha']
  },
  {
    category: 'Carnes & Aves',
    keywords: ['carne', 'alcatra', 'picanha', 'patinho', 'acém', 'contrafilé', 'frango', 'peito', 'coxa', 'sobrecoxa', 'moída', 'linguiça', 'linguica', 'costela', 'bacon', 'peixe', 'tilápia', 'salmão', 'camarão', 'pernil', 'lombo', 'bife']
  },
  {
    category: 'Laticínios & Ovos',
    keywords: ['leite', 'queijo', 'manteiga', 'requeijão', 'requeijao', 'iogurte', 'yogurte', 'ovo', 'ovos', 'creme de leite', 'leite condensado', 'ricota', 'mussarela', 'parmesão', 'prato']
  },
  {
    category: 'Mercearia',
    keywords: ['arroz', 'feijão', 'feijao', 'macarrão', 'macarrao', 'café', 'cafe', 'açúcar', 'acucar', 'sal', 'óleo', 'oleo', 'azeite', 'farinha', 'molho', 'extrato', 'milho', 'ervilha', 'atum', 'sardinha', 'aveia', 'maionese', 'ketchup', 'mostarda', 'tempero']
  },
  {
    category: 'Bebidas',
    keywords: ['cerveja', 'refrigerante', 'suco', 'vinho', 'água', 'agua', 'chá', 'cha', 'energético', 'vodka', 'whisky', 'coca', 'guaraná', 'tonica']
  },
  {
    category: 'Limpeza & Higiene',
    keywords: ['detergente', 'sabão', 'sabao', 'amaciante', 'desinfetante', 'água sanitária', 'esponja', 'papel higiênico', 'sabonete', 'xampu', 'shampoo', 'condicionador', 'pasta de dente', 'creme dental', 'escova', 'desodorante', 'fio dental', 'alvejante', 'lã de aço', 'limpador', 'multiuso']
  },
  {
    category: 'Pet & Bazar',
    keywords: ['ração', 'racao', 'petisco', 'areia', 'gato', 'cachorro', 'pilha', 'fósforo', 'guardanapo', 'vela', 'filme plástico', 'papel alumínio']
  }
];

export function detectCategory(name) {
  if (!name || typeof name !== 'string') return 'Outros';
  const clean = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    for (const kw of keywords) {
      const cleanKw = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const regex = new RegExp(`\\b${cleanKw}\\b`, 'i');
      if (regex.test(clean)) {
        return category;
      }
    }
  }
  return 'Outros';
}

export function parseItemInput(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { name: '', qty: 1, unit: 'un', category: 'Outros' };
  }

  let text = rawText.trim();
  let qty = 1;
  let unit = 'un';

  // 1. Verificar padrões como "2x Item", "2 x Item"
  const multiMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*x\s+(.+)$/i);
  if (multiMatch) {
    qty = parseFloat(multiMatch[1].replace(',', '.'));
    text = multiMatch[2].trim();
  } else {
    // 2. Verificar padrões como "1,5 kg de tomate", "500g carne", "3 L leite", "2 un sabonete"
    const prefixMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|un|pct|cx|dz|latas?|garrafas?)\b(?:\s+(?:de|da|do|dos|das))?\s*(.+)$/i);
    if (prefixMatch) {
      qty = parseFloat(prefixMatch[1].replace(',', '.'));
      unit = normalizeUnit(prefixMatch[2]);
      text = prefixMatch[3].trim();
    } else {
      // 3. Verificar número simples no início: "2 detergentes"
      const simpleNumberMatch = text.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
      if (simpleNumberMatch) {
        qty = parseFloat(simpleNumberMatch[1].replace(',', '.'));
        text = simpleNumberMatch[2].trim();
      }
    }
  }

  // Limpar preposição no começo de text caso tenha sobrado: "de queijo" -> "queijo"
  text = text.replace(/^(?:de|da|do|dos|das)\s+/i, '').trim();

  // Capitalizar primeira letra do nome
  const formattedName = text ? text.charAt(0).toUpperCase() + text.slice(1) : '';

  const category = detectCategory(formattedName);

  return {
    name: formattedName,
    qty: isNaN(qty) || qty <= 0 ? 1 : qty,
    unit: unit || 'un',
    category
  };
}

function normalizeUnit(rawUnit) {
  const u = rawUnit.toLowerCase();
  if (u === 'kg') return 'kg';
  if (u === 'g') return 'g';
  if (u === 'l' || u === 'litro' || u === 'litros') return 'L';
  if (u === 'ml') return 'ml';
  if (u === 'pct' || u === 'pacote' || u === 'pacotes') return 'pct';
  if (u === 'cx' || u === 'caixa' || u === 'caixas') return 'cx';
  if (u === 'dz' || u === 'duzia' || u === 'dúzia' || u === 'duzias') return 'dz';
  return 'un';
}
