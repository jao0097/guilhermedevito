/**
 * SuperLista V2 - Store de Gerenciamento Reativo de Múltiplas Listas e Orçamento
 */

import { formatBRL, formatQty, normalizeText } from './format.mjs';

export const AISLE_ORDER = [
  'Hortifruti',
  'Padaria',
  'Carnes & Aves',
  'Laticínios & Ovos',
  'Mercearia',
  'Bebidas',
  'Limpeza & Higiene',
  'Pet & Bazar',
  'Outros'
];

export const CATEGORY_ICONS = {
  'Hortifruti': 'fa-apple-whole',
  'Padaria': 'fa-bread-slice',
  'Carnes & Aves': 'fa-drumstick-bite',
  'Laticínios & Ovos': 'fa-egg',
  'Mercearia': 'fa-box-open',
  'Bebidas': 'fa-bottle-water',
  'Limpeza & Higiene': 'fa-soap',
  'Pet & Bazar': 'fa-paw',
  'Outros': 'fa-basket-shopping'
};

export const VALID_UNITS = ['un', 'kg', 'g', 'L', 'ml', 'pct', 'cx', 'dz'];

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toFiniteNumber(value, fallback) {
  const n = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Garante que um item (vindo do storage ou de um backup externo) tenha tipos válidos. */
export function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name ?? '').trim();
  if (!name) return null;
  const qty = toFiniteNumber(raw.qty, 1);
  const estimatedPrice = Math.max(0, toFiniteNumber(raw.estimatedPrice, 0));
  const actualRaw = raw.actualPrice === null || raw.actualPrice === undefined || raw.actualPrice === ''
    ? estimatedPrice
    : toFiniteNumber(raw.actualPrice, estimatedPrice);
  return {
    id: String(raw.id || genId('item')),
    name,
    qty: qty > 0 ? qty : 1,
    unit: VALID_UNITS.includes(raw.unit) ? raw.unit : 'un',
    estimatedPrice,
    actualPrice: Math.max(0, actualRaw),
    category: AISLE_ORDER.includes(raw.category) ? raw.category : 'Outros',
    checked: !!raw.checked,
    notes: String(raw.notes ?? '').trim(),
    createdAt: toFiniteNumber(raw.createdAt, Date.now())
  };
}

export function normalizeList(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return null;
  const title = String(raw.title ?? '').trim();
  if (!title) return null;
  const seen = new Set();
  const items = [];
  for (const it of raw.items) {
    const item = normalizeItem(it);
    if (!item) continue;
    if (seen.has(item.id)) item.id = genId('item');
    seen.add(item.id);
    items.push(item);
  }
  return {
    id: String(raw.id || genId('list')),
    title,
    budgetLimit: Math.max(0, toFiniteNumber(raw.budgetLimit, 0)),
    createdAt: toFiniteNumber(raw.createdAt, Date.now()),
    items
  };
}

/** Valida e higieniza um estado completo. Retorna null se não houver nenhuma lista aproveitável. */
export function normalizeState(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.lists)) return null;
  const seen = new Set();
  const lists = [];
  for (const l of raw.lists) {
    const list = normalizeList(l);
    if (!list) continue;
    if (seen.has(list.id)) list.id = genId('list');
    seen.add(list.id);
    lists.push(list);
  }
  if (lists.length === 0) return null;
  const activeListId = lists.some(l => l.id === raw.activeListId) ? raw.activeListId : lists[0].id;
  return {
    version: 2,
    activeListId,
    theme: typeof raw.theme === 'string' ? raw.theme : 'sunset',
    soundEnabled: raw.soundEnabled !== false,
    lists
  };
}

const DEFAULT_STATE = {
  version: 2,
  activeListId: 'default-1',
  theme: 'sunset',
  soundEnabled: true,
  lists: [
    {
      id: 'default-1',
      title: 'Compras da Semana',
      budgetLimit: 250,
      createdAt: Date.now() - 3600000,
      items: [
        { id: 'item-1', name: 'Arroz Tipo 1 (5kg)', qty: 1, unit: 'pct', estimatedPrice: 28.90, actualPrice: 28.90, category: 'Mercearia', checked: false, createdAt: Date.now() - 3000 },
        { id: 'item-2', name: 'Leite Integral', qty: 3, unit: 'L', estimatedPrice: 4.89, actualPrice: 4.89, category: 'Laticínios & Ovos', checked: true, createdAt: Date.now() - 2000 },
        { id: 'item-3', name: 'Banana Prata', qty: 1.5, unit: 'kg', estimatedPrice: 8.50, actualPrice: 8.50, category: 'Hortifruti', checked: false, createdAt: Date.now() - 1000 },
        { id: 'item-4', name: 'Detergente Neutro', qty: 2, unit: 'un', estimatedPrice: 2.39, actualPrice: 2.39, category: 'Limpeza & Higiene', checked: false, createdAt: Date.now() }
      ]
    }
  ]
};

export class ListStore {
  constructor(customStorage = null) {
    this.storageKey = 'superlista_v2_data';
    this.storage = customStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.listeners = [];
    this.state = this.loadState();
  }

  loadState() {
    if (this.storage) {
      try {
        const raw = this.storage.getItem(this.storageKey);
        if (raw) {
          const parsed = normalizeState(JSON.parse(raw));
          if (parsed) return parsed;
        }
      } catch (err) {
        console.warn('Falha ao restaurar dados salvos. Usando estado inicial.', err);
      }
    }
    const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.saveState(fresh);
    return fresh;
  }

  saveState(stateToSave = null) {
    if (stateToSave) this.state = stateToSave;
    if (this.storage) {
      try {
        this.storage.setItem(this.storageKey, JSON.stringify(this.state));
      } catch (err) {
        console.error('Erro ao persistir estado no storage:', err);
      }
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (e) {
        console.error(e);
      }
    }
  }

  getLists() {
    return this.state.lists;
  }

  getList(listId) {
    return this.state.lists.find(l => l.id === listId) || null;
  }

  getActiveList() {
    const list = this.getList(this.state.activeListId);
    if (list) return list;
    if (this.state.lists.length > 0) {
      this.state.activeListId = this.state.lists[0].id;
      return this.state.lists[0];
    }
    return null;
  }

  switchList(listId) {
    if (this.getList(listId)) {
      this.state.activeListId = listId;
      this.saveState();
      return true;
    }
    return false;
  }

  createList(title, budgetLimit = 0) {
    const newList = {
      id: genId('list'),
      title: (title || 'Nova Lista').trim(),
      budgetLimit: Math.max(0, toFiniteNumber(budgetLimit, 0)),
      createdAt: Date.now(),
      items: []
    };
    this.state.lists.push(newList);
    this.state.activeListId = newList.id;
    this.saveState();
    return newList;
  }

  /** Cria uma cópia da lista com todos os itens desmarcados (ex.: reaproveitar a lista do mês). */
  duplicateList(listId) {
    const source = this.getList(listId);
    if (!source) return null;
    const copy = {
      id: genId('list'),
      title: `${source.title} (cópia)`,
      budgetLimit: source.budgetLimit,
      createdAt: Date.now(),
      items: source.items.map(item => ({ ...item, id: genId('item'), checked: false, createdAt: Date.now() }))
    };
    this.state.lists.push(copy);
    this.state.activeListId = copy.id;
    this.saveState();
    return copy;
  }

  updateList(listId, { title, budgetLimit }) {
    const list = this.getList(listId);
    if (!list) return false;
    if (title !== undefined && String(title).trim()) list.title = String(title).trim();
    if (budgetLimit !== undefined) list.budgetLimit = Math.max(0, toFiniteNumber(budgetLimit, 0));
    this.saveState();
    return true;
  }

  deleteList(listId) {
    if (this.state.lists.length <= 1) {
      return false; // Não permite apagar a única lista existente
    }
    this.state.lists = this.state.lists.filter(l => l.id !== listId);
    if (this.state.activeListId === listId) {
      this.state.activeListId = this.state.lists[0].id;
    }
    this.saveState();
    return true;
  }

  /**
   * Adiciona um item à lista. Com `mergeDuplicates`, se já existir um item pendente com o
   * mesmo nome (ignorando acentos/caixa) e mesma unidade, soma a quantidade em vez de duplicar.
   * Retorna o item resultante; `item.merged === true` indica que houve mesclagem.
   */
  addItem(listId, itemData, { mergeDuplicates = false } = {}) {
    const list = this.getList(listId);
    if (!list) return null;

    const estPrice = Math.max(0, toFiniteNumber(itemData.estimatedPrice, 0));
    const qty = toFiniteNumber(itemData.qty, 1);
    const unit = VALID_UNITS.includes(itemData.unit) ? itemData.unit : 'un';
    const name = String(itemData.name || '').trim();
    if (!name) return null;

    if (mergeDuplicates) {
      const key = normalizeText(name);
      const existing = list.items.find(i => !i.checked && i.unit === unit && normalizeText(i.name) === key);
      if (existing) {
        existing.qty = Math.round((existing.qty + (qty > 0 ? qty : 1)) * 1000) / 1000;
        if (estPrice > 0) {
          existing.estimatedPrice = estPrice;
          existing.actualPrice = estPrice;
        }
        this.saveState();
        return { ...existing, merged: true };
      }
    }

    const newItem = {
      id: genId('item'),
      name,
      qty: qty > 0 ? qty : 1,
      unit,
      estimatedPrice: estPrice,
      actualPrice: itemData.actualPrice !== undefined ? Math.max(0, toFiniteNumber(itemData.actualPrice, estPrice)) : estPrice,
      category: AISLE_ORDER.includes(itemData.category) ? itemData.category : 'Outros',
      checked: !!itemData.checked,
      notes: (itemData.notes || '').trim(),
      createdAt: Date.now()
    };

    list.items.unshift(newItem);
    this.saveState();
    return newItem;
  }

  /** Reinsere itens removidos (usado pelo "Desfazer"), preservando a posição original quando possível. */
  restoreItems(listId, entries) {
    const list = this.getList(listId);
    if (!list || !Array.isArray(entries)) return 0;
    const sorted = [...entries].sort((a, b) => a.index - b.index);
    let count = 0;
    for (const { item, index } of sorted) {
      if (!item || list.items.some(i => i.id === item.id)) continue;
      const pos = Math.min(Math.max(0, index ?? 0), list.items.length);
      list.items.splice(pos, 0, item);
      count++;
    }
    if (count > 0) this.saveState();
    return count;
  }

  /** Desmarca todos os itens (reaproveitar a mesma lista na próxima compra). */
  uncheckAll(listId) {
    const list = this.getList(listId);
    if (!list) return 0;
    let count = 0;
    for (const item of list.items) {
      if (item.checked) {
        item.checked = false;
        count++;
      }
    }
    if (count > 0) this.saveState();
    return count;
  }

  toggleItem(listId, itemId) {
    const list = this.getList(listId);
    if (!list) return null;
    const item = list.items.find(i => i.id === itemId);
    if (!item) return null;

    item.checked = !item.checked;
    this.saveState();
    return item;
  }

  updateItem(listId, itemId, updates) {
    const list = this.getList(listId);
    if (!list) return null;
    const item = list.items.find(i => i.id === itemId);
    if (!item) return null;

    if (updates.name !== undefined && String(updates.name).trim()) item.name = String(updates.name).trim();
    if (updates.qty !== undefined) {
      const q = toFiniteNumber(updates.qty, 1);
      item.qty = q > 0 ? q : 1;
    }
    if (updates.unit !== undefined && VALID_UNITS.includes(updates.unit)) item.unit = updates.unit;
    if (updates.estimatedPrice !== undefined) item.estimatedPrice = Math.max(0, toFiniteNumber(updates.estimatedPrice, 0));
    if (updates.actualPrice !== undefined) item.actualPrice = Math.max(0, toFiniteNumber(updates.actualPrice, 0));
    if (updates.category !== undefined && AISLE_ORDER.includes(updates.category)) item.category = updates.category;
    if (updates.notes !== undefined) item.notes = String(updates.notes).trim();
    if (updates.checked !== undefined) item.checked = !!updates.checked;

    this.saveState();
    return item;
  }

  deleteItem(listId, itemId) {
    const list = this.getList(listId);
    if (!list) return false;
    const initialLen = list.items.length;
    list.items = list.items.filter(i => i.id !== itemId);
    if (list.items.length !== initialLen) {
      this.saveState();
      return true;
    }
    return false;
  }

  /** Remove os itens já comprados. Retorna a quantidade removida. */
  clearCheckedItems(listId) {
    return this.removeItemsWhere(listId, i => i.checked).length;
  }

  /**
   * Remove itens que satisfazem o predicado e devolve `[{ item, index }]`
   * com as posições originais, para permitir "Desfazer" via restoreItems().
   */
  removeItemsWhere(listId, predicate) {
    const list = this.getList(listId);
    if (!list) return [];
    const removed = [];
    const kept = [];
    list.items.forEach((item, index) => {
      if (predicate(item)) removed.push({ item, index });
      else kept.push(item);
    });
    if (removed.length > 0) {
      list.items = kept;
      this.saveState();
    }
    return removed;
  }

  clearAllItems(listId) {
    const list = this.getList(listId);
    if (!list) return 0;
    const count = list.items.length;
    list.items = [];
    this.saveState();
    return count;
  }

  getMetrics(listId) {
    const list = this.getList(listId);
    if (!list) {
      return {
        totalItems: 0,
        checkedItems: 0,
        pendingItems: 0,
        progressPercent: 0,
        totalEstimated: 0,
        totalActual: 0,
        budgetLimit: 0,
        budgetPercent: 0,
        isOverBudget: false,
        isWarningBudget: false,
        remainingBudget: 0,
        projectedTotal: 0,
        isProjectedOverBudget: false
      };
    }

    const items = list.items || [];
    const totalItems = items.length;
    const checkedItems = items.filter(i => i.checked).length;
    const pendingItems = totalItems - checkedItems;
    const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

    let totalEstimated = 0;
    let totalActual = 0;
    let pendingEstimated = 0;

    for (const item of items) {
      const q = item.qty || 1;
      const est = (item.estimatedPrice || 0) * q;
      totalEstimated += est;

      if (item.checked) {
        totalActual += getUnitPrice(item) * q;
      } else {
        pendingEstimated += est;
      }
    }

    // Projeção: o que já está no carrinho + o que falta pegar (pelo preço estimado)
    const projectedTotal = totalActual + pendingEstimated;

    const budgetLimit = list.budgetLimit || 0;
    let budgetPercent = 0;
    let isOverBudget = false;
    let isWarningBudget = false;
    let remainingBudget = 0;

    if (budgetLimit > 0) {
      budgetPercent = Math.min(999, Math.round((totalActual / budgetLimit) * 100));
      isOverBudget = totalActual > budgetLimit;
      isWarningBudget = totalActual >= budgetLimit * 0.8 && !isOverBudget;
      remainingBudget = Math.max(0, budgetLimit - totalActual);
    }

    return {
      totalItems,
      checkedItems,
      pendingItems,
      progressPercent,
      totalEstimated: Math.round(totalEstimated * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      budgetLimit,
      budgetPercent,
      isOverBudget,
      isWarningBudget,
      remainingBudget: Math.round(remainingBudget * 100) / 100,
      projectedTotal: Math.round(projectedTotal * 100) / 100,
      isProjectedOverBudget: budgetLimit > 0 && projectedTotal > budgetLimit
    };
  }

  getItemsGroupedByAisle(listId) {
    const list = this.getList(listId);
    if (!list) return [];

    const grouped = {};
    for (const aisle of AISLE_ORDER) {
      grouped[aisle] = [];
    }

    for (const item of list.items) {
      const cat = AISLE_ORDER.includes(item.category) ? item.category : 'Outros';
      grouped[cat].push(item);
    }

    const result = [];
    for (const aisle of AISLE_ORDER) {
      if (grouped[aisle].length > 0) {
        result.push({
          aisle,
          items: grouped[aisle]
        });
      }
    }
    return result;
  }

  exportWhatsApp(listId) {
    const list = this.getList(listId);
    if (!list) return '';
    const metrics = this.getMetrics(listId);
    const grouped = this.getItemsGroupedByAisle(listId);

    let lines = [];
    lines.push(`🛒 *SuperLista: ${list.title}*`);
    lines.push(`📅 ${new Date().toLocaleDateString('pt-BR')}`);
    lines.push(`📊 Progresso: ${metrics.checkedItems}/${metrics.totalItems} (${metrics.progressPercent}%)`);
    if (metrics.budgetLimit > 0) {
      lines.push(`💰 Total no Carrinho: ${formatBRL(metrics.totalActual)} / Teto: ${formatBRL(metrics.budgetLimit)}`);
    } else if (metrics.totalEstimated > 0) {
      lines.push(`💰 Total Estimado: ${formatBRL(metrics.totalEstimated)}`);
    }
    lines.push('----------------------------------');

    for (const group of grouped) {
      lines.push(`\n📌 *${group.aisle.toUpperCase()}*`);
      for (const item of group.items) {
        const mark = item.checked ? '✅' : '⬜';
        const priceStr = item.estimatedPrice > 0 ? ` (${formatBRL(item.estimatedPrice)})` : '';
        const notesStr = item.notes ? ` _${item.notes}_` : '';
        lines.push(`${mark} ${item.name} - ${formatQty(item.qty)} ${item.unit}${priceStr}${notesStr}`);
      }
    }

    lines.push('\n_Gerado pelo SuperLista V2_');
    return lines.join('\n');
  }

  exportCSV(listId) {
    const list = this.getList(listId);
    if (!list) return '';

    const headers = ['Item', 'Quantidade', 'Unidade', 'Categoria', 'Preco Estimado', 'Preco Real', 'Comprado'];
    const rows = [headers.join(';')];

    for (const item of list.items) {
      rows.push([
        csvText(item.name),
        csvNumber(item.qty),
        item.unit,
        csvText(item.category),
        csvNumber(item.estimatedPrice || 0),
        csvNumber(getUnitPrice(item)),
        item.checked ? 'Sim' : 'Nao'
      ].join(';'));
    }

    return rows.join('\n');
  }

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = normalizeState(JSON.parse(jsonString));
      if (!parsed) return false;
      this.state = parsed;
      this.saveState();
      return true;
    } catch (err) {
      console.error('Falha ao importar backup JSON:', err);
      return false;
    }
  }

  setTheme(themeName) {
    this.state.theme = themeName;
    this.saveState();
  }

  getTheme() {
    return this.state.theme || 'sunset';
  }

  setSoundEnabled(enabled) {
    this.state.soundEnabled = !!enabled;
    this.saveState();
  }

  isSoundEnabled() {
    return this.state.soundEnabled !== false;
  }
}

/** Preço unitário efetivo: o real pago no caixa, ou o estimado se o real não foi informado. */
function getUnitPrice(item) {
  const act = item.actualPrice;
  return act !== undefined && act !== null && Number.isFinite(act) ? act : (item.estimatedPrice || 0);
}

// Excel/Sheets em pt-BR usam ";" como separador e "," como decimal
function csvNumber(n) {
  return String(Math.round((Number(n) || 0) * 1000) / 1000).replace('.', ',');
}

function csvText(str) {
  let s = String(str ?? '');
  // Evita injeção de fórmulas ao abrir no Excel (=, +, -, @ no início da célula)
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
