/**
 * SuperLista V2 - Store de Gerenciamento Reativo de Múltiplas Listas e Orçamento
 */

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
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.lists) && parsed.lists.length > 0) {
            return parsed;
          }
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
      id: 'list-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: (title || 'Nova Lista').trim(),
      budgetLimit: parseFloat(budgetLimit) || 0,
      createdAt: Date.now(),
      items: []
    };
    this.state.lists.push(newList);
    this.state.activeListId = newList.id;
    this.saveState();
    return newList;
  }

  updateList(listId, { title, budgetLimit }) {
    const list = this.getList(listId);
    if (!list) return false;
    if (title !== undefined) list.title = title.trim();
    if (budgetLimit !== undefined) list.budgetLimit = parseFloat(budgetLimit) || 0;
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

  addItem(listId, itemData) {
    const list = this.getList(listId);
    if (!list) return null;

    const estPrice = parseFloat(itemData.estimatedPrice) || 0;
    const newItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: (itemData.name || '').trim(),
      qty: parseFloat(itemData.qty) > 0 ? parseFloat(itemData.qty) : 1,
      unit: itemData.unit || 'un',
      estimatedPrice: estPrice,
      actualPrice: itemData.actualPrice !== undefined ? parseFloat(itemData.actualPrice) : estPrice,
      category: itemData.category || 'Outros',
      checked: !!itemData.checked,
      notes: (itemData.notes || '').trim(),
      createdAt: Date.now()
    };

    list.items.unshift(newItem);
    this.saveState();
    return newItem;
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

    if (updates.name !== undefined) item.name = updates.name.trim();
    if (updates.qty !== undefined) item.qty = parseFloat(updates.qty) || 1;
    if (updates.unit !== undefined) item.unit = updates.unit;
    if (updates.estimatedPrice !== undefined) item.estimatedPrice = parseFloat(updates.estimatedPrice) || 0;
    if (updates.actualPrice !== undefined) item.actualPrice = parseFloat(updates.actualPrice) || 0;
    if (updates.category !== undefined) item.category = updates.category;
    if (updates.notes !== undefined) item.notes = updates.notes;
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

  clearCheckedItems(listId) {
    const list = this.getList(listId);
    if (!list) return 0;
    const initialLen = list.items.length;
    list.items = list.items.filter(i => !i.checked);
    const removedCount = initialLen - list.items.length;
    if (removedCount > 0) {
      this.saveState();
    }
    return removedCount;
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
        remainingBudget: 0
      };
    }

    const items = list.items || [];
    const totalItems = items.length;
    const checkedItems = items.filter(i => i.checked).length;
    const pendingItems = totalItems - checkedItems;
    const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

    let totalEstimated = 0;
    let totalActual = 0;

    for (const item of items) {
      const q = item.qty || 1;
      const est = (item.estimatedPrice || 0) * q;
      totalEstimated += est;

      if (item.checked) {
        const act = (item.actualPrice !== undefined && item.actualPrice !== null ? item.actualPrice : item.estimatedPrice || 0) * q;
        totalActual += act;
      }
    }

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
      remainingBudget: Math.round(remainingBudget * 100) / 100
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
      lines.push(`💰 Total no Carrinho: R$ ${metrics.totalActual.toFixed(2).replace('.', ',')} / Teto: R$ ${metrics.budgetLimit.toFixed(2).replace('.', ',')}`);
    } else {
      lines.push(`💰 Total Estimado: R$ ${metrics.totalEstimated.toFixed(2).replace('.', ',')}`);
    }
    lines.push('----------------------------------');

    for (const group of grouped) {
      lines.push(`\n📌 *${group.aisle.toUpperCase()}*`);
      for (const item of group.items) {
        const mark = item.checked ? '✅' : '⬜';
        const priceStr = item.estimatedPrice > 0 ? ` (R$ ${item.estimatedPrice.toFixed(2).replace('.', ',')})` : '';
        lines.push(`${mark} ${item.name} - ${item.qty} ${item.unit}${priceStr}`);
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
        `"${item.name.replace(/"/g, '""')}"`,
        item.qty,
        item.unit,
        `"${item.category}"`,
        item.estimatedPrice || 0,
        item.actualPrice || item.estimatedPrice || 0,
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
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.lists) || parsed.lists.length === 0) {
        return false;
      }
      for (const l of parsed.lists) {
        if (!l.id || !l.title || !Array.isArray(l.items)) {
          return false;
        }
      }
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
