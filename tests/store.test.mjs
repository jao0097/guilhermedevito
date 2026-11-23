import test from 'node:test';
import assert from 'node:assert/strict';
import { ListStore } from '../js/store.mjs';

function createMockStorage(initialData = null) {
  let data = initialData ? JSON.stringify(initialData) : null;
  return {
    getItem: (key) => data,
    setItem: (key, val) => { data = val; },
    removeItem: () => { data = null; }
  };
}

test('ListStore initializes with default list and item when empty', () => {
  const storage = createMockStorage();
  const store = new ListStore(storage);
  const lists = store.getLists();
  assert.equal(lists.length >= 1, true);
  assert.ok(store.getActiveList());
});

test('ListStore manages multiple lists and switching', () => {
  const storage = createMockStorage();
  const store = new ListStore(storage);

  const newList = store.createList('Churrasco de Domingo', 300);
  assert.equal(newList.title, 'Churrasco de Domingo');
  assert.equal(newList.budgetLimit, 300);

  store.switchList(newList.id);
  assert.equal(store.getActiveList().id, newList.id);
});

test('ListStore handles CRUD on items within active list', () => {
  const storage = createMockStorage();
  const store = new ListStore(storage);
  const activeList = store.getActiveList();

  const item = store.addItem(activeList.id, {
    name: 'Picanha',
    qty: 2,
    unit: 'kg',
    estimatedPrice: 75.00,
    category: 'Carnes & Aves'
  });

  assert.equal(item.name, 'Picanha');
  assert.equal(item.checked, false);

  // Toggle item
  const toggled = store.toggleItem(activeList.id, item.id);
  assert.equal(toggled.checked, true);

  // Update item
  store.updateItem(activeList.id, item.id, { actualPrice: 72.50 });
  const updatedItem = store.getActiveList().items.find(i => i.id === item.id);
  assert.equal(updatedItem.actualPrice, 72.50);

  // Delete item
  const deleted = store.deleteItem(activeList.id, item.id);
  assert.equal(deleted, true);
  assert.equal(store.getActiveList().items.some(i => i.id === item.id), false);
});

test('ListStore accurately calculates budget metrics and over-budget status', () => {
  const storage = createMockStorage();
  const store = new ListStore(storage);
  const list = store.createList('Orçamento Teste', 100);

  store.addItem(list.id, { name: 'Item 1', qty: 1, unit: 'un', estimatedPrice: 50, category: 'Mercearia' });
  store.addItem(list.id, { name: 'Item 2', qty: 2, unit: 'un', estimatedPrice: 30, category: 'Mercearia' });

  // No item checked yet
  let metrics = store.getMetrics(list.id);
  assert.equal(metrics.totalItems, 2);
  assert.equal(metrics.checkedItems, 0);
  assert.equal(metrics.totalEstimated, 110); // 50 + (2 * 30)
  assert.equal(metrics.totalActual, 0);
  assert.equal(metrics.isOverBudget, false);

  // Check item 1 and item 2
  const items = store.getList(list.id).items;
  store.toggleItem(list.id, items[0].id); // 50
  store.toggleItem(list.id, items[1].id); // 60 -> totalActual = 110

  metrics = store.getMetrics(list.id);
  assert.equal(metrics.checkedItems, 2);
  assert.equal(metrics.progressPercent, 100);
  assert.equal(metrics.totalActual, 110);
  assert.equal(metrics.isOverBudget, true); // 110 > 100
});

test('ListStore groups items logically by supermarket aisles', () => {
  const storage = createMockStorage();
  const store = new ListStore(storage);
  const list = store.createList('Aisles List');

  store.addItem(list.id, { name: 'Detergente', category: 'Limpeza & Higiene' });
  store.addItem(list.id, { name: 'Banana', category: 'Hortifruti' });
  store.addItem(list.id, { name: 'Queijo', category: 'Laticínios & Ovos' });

  const grouped = store.getItemsGroupedByAisle(list.id);
  // Hortifruti should come before Laticínios, and Limpeza near the end
  const aisleNames = grouped.map(g => g.aisle);
  assert.deepEqual(aisleNames, ['Hortifruti', 'Laticínios & Ovos', 'Limpeza & Higiene']);
});

test('ListStore exports to WhatsApp, CSV and backup JSON correctly', () => {
  const storage = createMockStorage();
  const store = new ListStore(storage);
  const list = store.createList('Export Test', 150);
  store.addItem(list.id, { name: 'Leite', qty: 2, unit: 'L', estimatedPrice: 5.0, category: 'Laticínios & Ovos' });

  const waText = store.exportWhatsApp(list.id);
  assert.ok(waText.includes('SuperLista: Export Test'));
  assert.ok(waText.includes('Leite'));

  const csv = store.exportCSV(list.id);
  assert.ok(csv.includes('Item;Quantidade;Unidade;Categoria;Preco Estimado;Preco Real;Comprado'));
  assert.ok(csv.includes('"Leite";2;L;"Laticínios & Ovos";5;5;Nao'));

  const jsonBackup = store.exportJSON();
  assert.ok(jsonBackup.includes('Export Test'));

  // Test import JSON
  const newStorage = createMockStorage();
  const newStore = new ListStore(newStorage);
  const imported = newStore.importJSON(jsonBackup);
  assert.equal(imported, true);
  assert.ok(newStore.getLists().some(l => l.title === 'Export Test'));
});

test('ListStore merges duplicate pending items when requested', () => {
  const store = new ListStore(createMockStorage());
  const list = store.createList('Merge');
  store.addItem(list.id, { name: 'Leite', qty: 2, unit: 'L' }, { mergeDuplicates: true });
  const merged = store.addItem(list.id, { name: 'leite', qty: 1, unit: 'L' }, { mergeDuplicates: true });
  assert.equal(merged.merged, true);
  assert.equal(store.getList(list.id).items.length, 1);
  assert.equal(store.getList(list.id).items[0].qty, 3);

  // Unidade diferente não mescla
  store.addItem(list.id, { name: 'Leite', qty: 1, unit: 'cx' }, { mergeDuplicates: true });
  assert.equal(store.getList(list.id).items.length, 2);
});

test('ListStore removes and restores items for undo', () => {
  const store = new ListStore(createMockStorage());
  const list = store.createList('Undo');
  store.addItem(list.id, { name: 'A' });
  store.addItem(list.id, { name: 'B' });
  store.addItem(list.id, { name: 'C' });
  const before = store.getList(list.id).items.map(i => i.name);

  const ids = store.getList(list.id).items.filter(i => i.name !== 'B').map(i => i.id);
  store.toggleItem(list.id, ids[0]);
  store.toggleItem(list.id, ids[1]);
  const removed = store.removeItemsWhere(list.id, i => i.checked);
  assert.equal(removed.length, 2);
  assert.deepEqual(store.getList(list.id).items.map(i => i.name), ['B']);

  store.restoreItems(list.id, removed);
  assert.deepEqual(store.getList(list.id).items.map(i => i.name), before);
});

test('ListStore projects total spending including pending items', () => {
  const store = new ListStore(createMockStorage());
  const list = store.createList('Projeção', 100);
  store.addItem(list.id, { name: 'Carne', qty: 1, estimatedPrice: 70 });
  store.addItem(list.id, { name: 'Vinho', qty: 1, estimatedPrice: 40 });
  const carne = store.getList(list.id).items.find(i => i.name === 'Carne');
  store.toggleItem(list.id, carne.id);
  store.updateItem(list.id, carne.id, { actualPrice: 65 });

  const m = store.getMetrics(list.id);
  assert.equal(m.totalActual, 65);
  assert.equal(m.projectedTotal, 105);
  assert.equal(m.isOverBudget, false);
  assert.equal(m.isProjectedOverBudget, true);
});

test('ListStore duplicates a list with all items unchecked and uncheckAll resets a list', () => {
  const store = new ListStore(createMockStorage());
  const list = store.createList('Mensal', 500);
  const item = store.addItem(list.id, { name: 'Arroz', category: 'Mercearia' });
  store.toggleItem(list.id, item.id);

  const copy = store.duplicateList(list.id);
  assert.equal(copy.title, 'Mensal (cópia)');
  assert.equal(copy.budgetLimit, 500);
  assert.equal(copy.items[0].checked, false);
  assert.notEqual(copy.items[0].id, item.id);
  assert.equal(store.getActiveList().id, copy.id);

  assert.equal(store.uncheckAll(list.id), 1);
  assert.equal(store.getList(list.id).items[0].checked, false);
});

test('ListStore sanitizes imported backups and rejects garbage', () => {
  const store = new ListStore(createMockStorage());
  assert.equal(store.importJSON('not json'), false);
  assert.equal(store.importJSON(JSON.stringify({ lists: [] })), false);
  assert.equal(store.importJSON(JSON.stringify({ lists: [{ title: '', items: [] }] })), false);

  const ok = store.importJSON(JSON.stringify({
    activeListId: 'nope',
    lists: [{
      id: 'l1',
      title: 'Importada',
      budgetLimit: '120,50',
      items: [
        { id: 'x"><img src=x onerror=alert(1)>', name: 'Feijão', qty: '2', unit: 'tonelada', category: 'Inexistente', estimatedPrice: '7.5' },
        { name: '' },
        null
      ]
    }]
  }));
  assert.equal(ok, true);
  const list = store.getActiveList();
  assert.equal(list.id, 'l1');
  assert.equal(list.budgetLimit, 120.5);
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].qty, 2);
  assert.equal(list.items[0].unit, 'un');
  assert.equal(list.items[0].category, 'Outros');
  assert.equal(list.items[0].estimatedPrice, 7.5);
  assert.equal(list.items[0].actualPrice, 7.5);
});

test('ListStore CSV uses Brazilian decimals and guards against formula injection', () => {
  const store = new ListStore(createMockStorage());
  const list = store.createList('CSV');
  store.addItem(list.id, { name: '=HYPERLINK("x")', qty: 1.5, unit: 'kg', estimatedPrice: 8.99, category: 'Hortifruti' });
  const csv = store.exportCSV(list.id);
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")";1,5;kg;"Hortifruti";8,99;8,99;Nao`));
});
