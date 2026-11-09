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
