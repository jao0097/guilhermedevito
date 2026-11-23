/**
 * SuperLista V2 - Controlador Principal da Aplicação
 */

import { ListStore, CATEGORY_ICONS, AISLE_ORDER } from './store.mjs';
import { parseItemInput } from './parser.mjs';
import { soundEffects } from './audio.mjs';
import { formatBRL, formatQty, parseDecimal, normalizeText } from './format.mjs';
import { showToast, triggerConfetti, escapeHtml, getBadgeClass } from './ui.mjs';

// Instância única do store
const store = new ListStore();

// Estado local da UI
let currentStatusFilter = 'all'; // 'all' | 'pending' | 'checked'
let currentViewMode = 'aisle'; // 'aisle' | 'flat'
let searchQuery = '';
let speechRecognition = null;
let isRecording = false;
let wakeLock = null;
let wantsWakeLock = false;

// Controle de celebração: só celebra quando a lista *passa* a ficar 100% completa
let lastProgress = { listId: null, complete: false };

// Campos de detalhe que o usuário ajustou manualmente não são sobrescritos pelo parser
const manualDetails = new Set();

const $ = (id) => document.getElementById(id);

// Elementos DOM Principais
const listSelector = $('list-selector');
const themeButtons = document.querySelectorAll('[data-theme-option]');
const btnToggleSound = $('btn-toggle-sound');
const soundIcon = $('sound-icon');
const btnExportMenu = $('btn-export-menu');
const exportDropdown = $('export-dropdown');

// Métricas DOM
const metricCheckedCount = $('metric-checked-count');
const metricTotalCount = $('metric-total-count');
const metricProgressPercent = $('metric-progress-percent');
const metricActualSpent = $('metric-actual-spent');
const metricBudgetLimit = $('metric-budget-limit');
const metricProjected = $('metric-projected');
const budgetAlertBadge = $('budget-alert-badge');
const mainProgressBar = $('main-progress-bar');
const btnEditBudgetQuick = $('btn-edit-budget-quick');

// Formulário de Adição Rápida
const quickAddForm = $('quick-add-form');
const itemQuickInput = $('item-quick-input');
const btnVoiceInput = $('btn-voice-input');
const btnToggleDetails = $('btn-toggle-details');
const detailsPanel = $('details-panel');
const detailQty = $('detail-qty');
const detailUnit = $('detail-unit');
const detailPrice = $('detail-price');
const detailCategory = $('detail-category');
const parsePreview = $('parse-preview');

// Filtros e Lista
const statusTabs = document.querySelectorAll('.status-tab');
const btnToggleViewMode = $('btn-toggle-view-mode');
const viewModeIcon = $('view-mode-icon');
const viewModeLabel = $('view-mode-label');
const searchInput = $('search-input');
const btnClearChecked = $('btn-clear-checked');
const itemsContainer = $('items-container');
const emptyState = $('empty-state');
const emptyStateTitle = $('empty-state-title');
const emptyStateText = $('empty-state-text');

// Modo Mercado
const btnOpenShoppingMode = $('btn-open-shopping-mode');
const btnOpenShoppingModeMobile = $('btn-open-shopping-mode-mobile');
const mobileCtaCount = $('mobile-cta-count');
const shoppingModeOverlay = $('shopping-mode-overlay');
const btnExitShoppingMode = $('btn-exit-shopping-mode');
const shoppingModeTitle = $('shopping-mode-title');
const shoppingItemsRatio = $('shopping-items-ratio');
const shoppingTotalSpent = $('shopping-total-spent');
const shoppingBudgetTarget = $('shopping-budget-target');
const shoppingProjected = $('shopping-projected');
const shoppingProgressBar = $('shopping-progress-bar');
const shoppingItemsList = $('shopping-items-list');
const btnShoppingFinish = $('btn-shopping-finish');
const btnShoppingHideChecked = $('btn-shopping-hide-checked');
const wakeLockStatus = $('wake-lock-status');
let shoppingHideChecked = false;

// Modais
const btnManageLists = $('btn-manage-lists');
const modalManageLists = $('modal-manage-lists');
const formCreateList = $('form-create-list');
const newListTitle = $('new-list-title');
const newListBudget = $('new-list-budget');
const listsManagerContainer = $('lists-manager-container');

const btnOpenBackupModal = $('btn-open-backup-modal');
const modalBackup = $('modal-backup');
const backupJsonTextarea = $('backup-json-textarea');
const backupFileInput = $('backup-file-input');

const modalEditItem = $('modal-edit-item');
const formEditItem = $('form-edit-item');
const editItemId = $('edit-item-id');
const editItemName = $('edit-item-name');
const editItemQty = $('edit-item-qty');
const editItemUnit = $('edit-item-unit');
const editItemEstPrice = $('edit-item-est-price');
const editItemActPrice = $('edit-item-act-price');
const editItemCategory = $('edit-item-category');
const editItemNotes = $('edit-item-notes');

const modalPrice = $('modal-price');
const formPrice = $('form-price');
const priceItemId = $('price-item-id');
const priceItemName = $('price-item-name');
const priceItemHint = $('price-item-hint');
const priceInput = $('price-input');
const priceModeUnit = $('price-mode-unit');

const modalFinish = $('modal-finish');
const finishSummary = $('finish-summary');

const ALL_MODALS = [modalManageLists, modalBackup, modalEditItem, modalPrice, modalFinish].filter(Boolean);

// Inicialização (módulos são adiados, mas garantimos o DOM pronto)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initApp() {
  applyTheme(store.getTheme(), false);

  soundEffects.setMuted(!store.isSoundEnabled());
  updateSoundIcon();

  // Não celebrar ao abrir o app numa lista que já estava completa
  const active = store.getActiveList();
  if (active) {
    const m = store.getMetrics(active.id);
    lastProgress = { listId: active.id, complete: m.totalItems > 0 && m.checkedItems === m.totalItems };
  }

  initSpeechRecognition();
  setupEventListeners();
  render();

  store.subscribe(render);
  registerServiceWorker();
}

function applyTheme(theme, persist = true) {
  document.body.setAttribute('data-theme', theme);
  // Os utilitários `dark:` do Tailwind seguem a classe `dark` (e não o tema do sistema operacional)
  document.documentElement.classList.toggle('dark', theme === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const colors = { sunset: '#f43f5e', emerald: '#059669', nordic: '#2563eb', violet: '#7c3aed', dark: '#0f172a' };
    meta.setAttribute('content', colors[theme] || '#f43f5e');
  }
  themeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeOption === theme)));
  if (persist) store.setTheme(theme);
}

function updateSoundIcon() {
  const isMuted = soundEffects.isMuted();
  if (soundIcon) {
    soundIcon.className = isMuted ? 'fa-solid fa-volume-xmark text-sm' : 'fa-solid fa-volume-high text-sm';
  }
  btnToggleSound?.setAttribute('aria-pressed', String(!isMuted));
}

// ---------------------------------------------------------------------------
// Modais
// ---------------------------------------------------------------------------
function openModal(modal, focusEl) {
  if (!modal) return;
  modal.classList.remove('hidden');
  setTimeout(() => (focusEl || modal.querySelector('input:not([type=hidden]), button'))?.focus(), 30);
}

function closeModal(modal) {
  modal?.classList.add('hidden');
}

function closeAllModals() {
  ALL_MODALS.forEach(closeModal);
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
function setupEventListeners() {
  themeButtons.forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation(); // mantém o menu aberto para comparar os temas
    applyTheme(btn.dataset.themeOption);
  }));
  exportDropdown?.addEventListener('click', (e) => {
    if (!e.target.closest('[data-theme-option]')) exportDropdown.classList.add('hidden');
  });

  btnToggleSound?.addEventListener('click', () => {
    const nextMuted = !soundEffects.isMuted();
    soundEffects.setMuted(nextMuted);
    store.setSoundEnabled(!nextMuted);
    updateSoundIcon();
    if (!nextMuted) soundEffects.playCheck();
  });

  listSelector?.addEventListener('change', (e) => store.switchList(e.target.value));

  // Menu de Exportação
  btnExportMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = exportDropdown.classList.toggle('hidden') === false;
    btnExportMenu.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', () => {
    if (exportDropdown && !exportDropdown.classList.contains('hidden')) {
      exportDropdown.classList.add('hidden');
      btnExportMenu?.setAttribute('aria-expanded', 'false');
    }
  });

  $('btn-export-whatsapp')?.addEventListener('click', exportToWhatsApp);
  $('btn-export-csv')?.addEventListener('click', exportToCSV);
  $('btn-print-list')?.addEventListener('click', () => window.print());

  // Input Rápido: Parser dinâmico ao digitar
  itemQuickInput?.addEventListener('input', () => syncDetailsFromText(itemQuickInput.value));

  // Ajustes manuais nos detalhes "travam" o campo até o próximo item
  [[detailQty, 'qty'], [detailUnit, 'unit'], [detailPrice, 'price'], [detailCategory, 'category']].forEach(([el, key]) => {
    el?.addEventListener('input', () => manualDetails.add(key));
    el?.addEventListener('change', () => manualDetails.add(key));
  });

  btnToggleDetails?.addEventListener('click', () => {
    const hidden = detailsPanel.classList.toggle('hidden');
    btnToggleDetails.setAttribute('aria-expanded', String(!hidden));
  });

  // Chips de Sugestões Rápidas: adicionam direto com 1 toque
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-item');
      if (text) addItemFromText(text, { useDetails: false });
    });
  });

  quickAddForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawText = itemQuickInput.value.trim();
    if (!rawText) return;
    // Permite colar vários itens de uma vez, um por linha ou separados por ";"
    const parts = rawText.split(/\s*[;\n]\s*/).filter(Boolean);
    if (parts.length > 1) {
      parts.forEach(p => addItemFromText(p, { useDetails: false, silent: true }));
      showToast(`${parts.length} itens adicionados!`);
      soundEffects.playCheck();
    } else {
      addItemFromText(rawText, { useDetails: true });
    }
    itemQuickInput.value = '';
    resetDetails();
    itemQuickInput.focus();
  });

  // Filtros de Status
  statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      statusTabs.forEach(t => {
        t.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-900', 'dark:text-white');
        t.classList.add('text-slate-600', 'dark:text-slate-400');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-900', 'dark:text-white');
      tab.classList.remove('text-slate-600', 'dark:text-slate-400');
      tab.setAttribute('aria-selected', 'true');
      currentStatusFilter = tab.getAttribute('data-status');
      renderItems();
    });
  });

  btnToggleViewMode?.addEventListener('click', () => {
    currentViewMode = currentViewMode === 'aisle' ? 'flat' : 'aisle';
    viewModeIcon.className = currentViewMode === 'aisle' ? 'fa-solid fa-layer-group' : 'fa-solid fa-list';
    viewModeLabel.textContent = currentViewMode === 'aisle' ? 'Por Corredor' : 'Lista Plana';
    renderItems();
  });

  searchInput?.addEventListener('input', (e) => {
    searchQuery = normalizeText(e.target.value);
    renderItems();
  });

  // Limpar Comprados (com Desfazer em vez de confirmação bloqueante)
  btnClearChecked?.addEventListener('click', () => {
    const active = store.getActiveList();
    if (!active) return;
    const removed = store.removeItemsWhere(active.id, i => i.checked);
    if (removed.length === 0) {
      showToast('Nenhum item marcado para limpar.');
      return;
    }
    showToast(`${removed.length} ${removed.length === 1 ? 'item removido' : 'itens removidos'}`, {
      actionLabel: 'Desfazer',
      onAction: () => store.restoreItems(active.id, removed)
    });
  });

  // Alterar Teto de Gastos Rápido
  btnEditBudgetQuick?.addEventListener('click', () => {
    const active = store.getActiveList();
    if (!active) return;
    const current = active.budgetLimit || 0;
    const input = prompt('Defina o teto de gastos (R$) para esta lista (0 = sem teto):', current > 0 ? formatQty(current) : '');
    if (input === null) return;
    const val = parseDecimal(input);
    if (input.trim() !== '' && !Number.isFinite(val)) {
      showToast('Valor inválido. Use números, ex: 250 ou 250,50');
      return;
    }
    store.updateList(active.id, { budgetLimit: Number.isFinite(val) ? val : 0 });
  });

  // Delegação de eventos dos itens (um único listener em vez de um por item a cada render)
  itemsContainer?.addEventListener('click', onItemsContainerClick);
  shoppingItemsList?.addEventListener('click', onShoppingListClick);

  // Gerenciador de Listas
  btnManageLists?.addEventListener('click', () => {
    renderListsManager();
    openModal(modalManageLists, newListTitle);
  });

  formCreateList?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = newListTitle.value.trim();
    const budget = parseDecimal(newListBudget.value);
    if (!title) return;
    store.createList(title, Number.isFinite(budget) ? budget : 0);
    newListTitle.value = '';
    newListBudget.value = '';
    renderListsManager();
    showToast(`Lista "${title}" criada e ativada!`);
  });

  listsManagerContainer?.addEventListener('click', onListsManagerClick);

  // Backup
  btnOpenBackupModal?.addEventListener('click', () => {
    backupJsonTextarea.value = store.exportJSON();
    openModal(modalBackup);
  });

  $('btn-copy-backup-json')?.addEventListener('click', () => {
    copyText(backupJsonTextarea.value).then(ok => showToast(ok ? 'JSON copiado para a área de transferência!' : 'Não foi possível copiar. Selecione e copie manualmente.'));
  });

  $('btn-download-backup-json')?.addEventListener('click', () => {
    downloadFile(backupJsonTextarea.value, `superlista-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  });

  $('btn-pick-backup-file')?.addEventListener('click', () => backupFileInput?.click());
  backupFileInput?.addEventListener('change', async () => {
    const file = backupFileInput.files?.[0];
    if (!file) return;
    backupJsonTextarea.value = await file.text();
    backupFileInput.value = '';
    showToast('Arquivo carregado. Clique em "Restaurar Dados" para aplicar.');
  });

  $('btn-restore-backup-json')?.addEventListener('click', () => {
    const val = backupJsonTextarea.value.trim();
    if (!val) return;
    if (!confirm('Atenção: Restaurar um backup substituirá seus dados atuais. Continuar?')) return;
    const previous = store.exportJSON();
    if (store.importJSON(val)) {
      applyTheme(store.getTheme(), false);
      soundEffects.setMuted(!store.isSoundEnabled());
      updateSoundIcon();
      closeModal(modalBackup);
      showToast('Backup restaurado com sucesso!', {
        actionLabel: 'Desfazer',
        onAction: () => store.importJSON(previous)
      });
    } else {
      alert('Erro: O arquivo ou texto JSON fornecido é inválido.');
    }
  });

  // Fechamento de modais: botão X, clique no fundo e tecla Esc
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal-backdrop')));
  });
  ALL_MODALS.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openModalEl = ALL_MODALS.find(m => !m.classList.contains('hidden'));
    if (openModalEl) closeModal(openModalEl);
    else if (!shoppingModeOverlay.classList.contains('hidden')) exitShoppingMode();
  });

  // Atalho: "/" foca o campo de adicionar
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      itemQuickInput?.focus();
    }
  });

  // Editar Item
  formEditItem?.addEventListener('submit', (e) => {
    e.preventDefault();
    const active = store.getActiveList();
    if (!active) return;
    const est = parseDecimal(editItemEstPrice.value);
    const act = parseDecimal(editItemActPrice.value);
    store.updateItem(active.id, editItemId.value, {
      name: editItemName.value,
      qty: parseDecimal(editItemQty.value) || 1,
      unit: editItemUnit.value,
      estimatedPrice: Number.isFinite(est) ? est : 0,
      // Preço real em branco = assume o estimado
      actualPrice: Number.isFinite(act) ? act : (Number.isFinite(est) ? est : 0),
      category: editItemCategory.value,
      notes: editItemNotes.value
    });
    closeModal(modalEditItem);
    showToast('Item atualizado!');
  });

  // Preço no caixa (Modo Mercado)
  formPrice?.addEventListener('submit', (e) => {
    e.preventDefault();
    const active = store.getActiveList();
    if (!active) return;
    const item = active.items.find(i => i.id === priceItemId.value);
    if (!item) return;
    const val = parseDecimal(priceInput.value);
    if (!Number.isFinite(val) || val < 0) {
      priceInput.focus();
      return;
    }
    // O usuário pode digitar o preço total da etiqueta (ex: bandeja de carne) ou o unitário
    const unitPrice = priceModeUnit?.checked ? val : val / (item.qty || 1);
    const wasChecked = item.checked;
    store.updateItem(active.id, item.id, { actualPrice: Math.round(unitPrice * 100) / 100, checked: true });
    if (!wasChecked) soundEffects.playCheck();
    closeModal(modalPrice);
    maybeWarnBudget();
  });

  // Modo Mercado
  btnOpenShoppingMode?.addEventListener('click', enterShoppingMode);
  btnOpenShoppingModeMobile?.addEventListener('click', enterShoppingMode);
  btnExitShoppingMode?.addEventListener('click', exitShoppingMode);
  btnShoppingFinish?.addEventListener('click', openFinishModal);
  btnShoppingHideChecked?.addEventListener('click', () => {
    shoppingHideChecked = !shoppingHideChecked;
    btnShoppingHideChecked.setAttribute('aria-pressed', String(shoppingHideChecked));
    btnShoppingHideChecked.querySelector('span').textContent = shoppingHideChecked ? 'Mostrar pegos' : 'Ocultar pegos';
    renderShoppingMode();
  });

  // Concluir compra
  $('btn-finish-clear')?.addEventListener('click', () => finishShoppingTrip('clear'));
  $('btn-finish-uncheck')?.addEventListener('click', () => finishShoppingTrip('uncheck'));
  $('btn-finish-keep')?.addEventListener('click', () => finishShoppingTrip('keep'));

  // A Wake Lock é liberada pelo navegador quando a aba sai de foco; readquire ao voltar
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wantsWakeLock) requestWakeLock();
  });
}

// ---------------------------------------------------------------------------
// Adição de itens
// ---------------------------------------------------------------------------
function syncDetailsFromText(text) {
  const parsed = parseItemInput(text);
  if (!manualDetails.has('qty')) detailQty.value = parsed.qty;
  if (!manualDetails.has('unit')) detailUnit.value = parsed.unit;
  if (!manualDetails.has('category')) detailCategory.value = parsed.category;
  if (!manualDetails.has('price')) detailPrice.value = parsed.price !== null ? parsed.price : '';
  renderParsePreview(text ? parsed : null);
}

function renderParsePreview(parsed) {
  if (!parsePreview) return;
  if (!parsed || !parsed.name) {
    parsePreview.classList.add('hidden');
    parsePreview.innerHTML = '';
    return;
  }
  const qty = manualDetails.has('qty') ? detailQty.value : parsed.qty;
  const unit = manualDetails.has('unit') ? detailUnit.value : parsed.unit;
  const cat = manualDetails.has('category') ? detailCategory.value : parsed.category;
  const priceVal = parseDecimal(detailPrice.value);
  parsePreview.classList.remove('hidden');
  parsePreview.innerHTML = `
    <i class="fa-solid fa-wand-magic-sparkles opacity-60"></i>
    <span class="font-bold">${escapeHtml(parsed.name)}</span>
    <span class="opacity-60">•</span>
    <span>${escapeHtml(formatQty(qty))} ${escapeHtml(unit)}</span>
    <span class="opacity-60">•</span>
    <span class="px-1.5 py-0.5 rounded-full ${getBadgeClass(cat)}">${escapeHtml(cat)}</span>
    ${Number.isFinite(priceVal) && priceVal > 0 ? `<span class="opacity-60">•</span><span>${formatBRL(priceVal)}/${escapeHtml(unit)}</span>` : ''}
  `;
}

function resetDetails() {
  manualDetails.clear();
  detailQty.value = 1;
  detailUnit.value = 'un';
  detailPrice.value = '';
  detailCategory.value = 'Outros';
  renderParsePreview(null);
}

function addItemFromText(rawText, { useDetails = true, silent = false } = {}) {
  const active = store.getActiveList();
  if (!active) return null;
  const parsed = parseItemInput(rawText);
  if (!parsed.name) return null;

  let qty = parsed.qty;
  let unit = parsed.unit;
  let category = parsed.category;
  let price = parsed.price ?? 0;

  if (useDetails) {
    qty = parseDecimal(detailQty.value) || qty;
    unit = detailUnit.value || unit;
    category = detailCategory.value || category;
    const p = parseDecimal(detailPrice.value);
    price = Number.isFinite(p) ? p : price;
  }

  const result = store.addItem(active.id, {
    name: parsed.name,
    qty,
    unit,
    estimatedPrice: price,
    category
  }, { mergeDuplicates: true });

  if (result && !silent) {
    soundEffects.playCheck();
    if (result.merged) {
      showToast(`"${result.name}" já estava na lista — agora ${formatQty(result.qty)} ${result.unit}`);
    } else {
      showToast(`Adicionado em ${result.category}`, {
        actionLabel: 'Desfazer',
        onAction: () => store.deleteItem(active.id, result.id)
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Renderização
// ---------------------------------------------------------------------------
function render() {
  renderListSelector();
  renderMetrics();
  renderItems();
  if (!shoppingModeOverlay.classList.contains('hidden')) renderShoppingMode();
  if (!modalManageLists.classList.contains('hidden')) renderListsManager();
}

function renderListSelector() {
  if (!listSelector) return;
  const lists = store.getLists();
  const active = store.getActiveList();
  listSelector.innerHTML = lists.map(l => `
    <option value="${escapeHtml(l.id)}" ${active && active.id === l.id ? 'selected' : ''}>
      ${escapeHtml(l.title)} (${l.items.length})
    </option>
  `).join('');
}

function renderMetrics() {
  const active = store.getActiveList();
  if (!active) return;
  const m = store.getMetrics(active.id);

  metricCheckedCount.textContent = m.checkedItems;
  metricTotalCount.textContent = m.totalItems;
  metricProgressPercent.textContent = `${m.progressPercent}%`;
  mainProgressBar.style.width = `${m.progressPercent}%`;
  mainProgressBar.parentElement?.setAttribute('aria-valuenow', String(m.progressPercent));
  metricActualSpent.textContent = formatBRL(m.totalActual);
  if (mobileCtaCount) mobileCtaCount.textContent = m.pendingItems > 0 ? `(${m.pendingItems} ${m.pendingItems === 1 ? 'pendente' : 'pendentes'})` : '';

  if (metricProjected) {
    if (m.projectedTotal > 0) {
      metricProjected.classList.remove('hidden');
      metricProjected.innerHTML = `<i class="fa-solid fa-chart-line mr-1"></i>Previsão da compra completa: <strong>${formatBRL(m.projectedTotal)}</strong>` +
        (m.isProjectedOverBudget && !m.isOverBudget ? ` <span class="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/80">deve passar do teto</span>` : '');
    } else {
      metricProjected.classList.add('hidden');
    }
  }

  if (m.budgetLimit > 0) {
    metricBudgetLimit.textContent = formatBRL(m.budgetLimit);
    const base = 'mt-1 text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full inline-block max-w-full truncate align-bottom text-white ';
    if (m.isOverBudget) {
      budgetAlertBadge.className = base + 'bg-rose-500/80';
      budgetAlertBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1 hidden sm:inline"></i>Estourou +${formatBRL(m.totalActual - m.budgetLimit)}`;
    } else if (m.isWarningBudget) {
      budgetAlertBadge.className = base + 'bg-amber-500/80';
      budgetAlertBadge.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1 hidden sm:inline"></i>${m.budgetPercent}% do teto`;
    } else {
      budgetAlertBadge.className = base + 'bg-emerald-500/80';
      budgetAlertBadge.innerHTML = `<i class="fa-solid fa-shield mr-1 hidden sm:inline"></i>Resta ${formatBRL(m.remainingBudget)}`;
    }
    budgetAlertBadge.title = budgetAlertBadge.textContent; // texto completo se for truncado em telas estreitas
  } else {
    metricBudgetLimit.textContent = 'Sem teto';
    budgetAlertBadge.className = 'hidden';
  }

  // Celebração apenas na transição para 100% dentro da mesma lista
  const complete = m.totalItems > 0 && m.checkedItems === m.totalItems;
  if (lastProgress.listId === active.id && complete && !lastProgress.complete) {
    soundEffects.playCelebration();
    triggerConfetti();
  }
  lastProgress = { listId: active.id, complete };
}

function filterItems(items) {
  return items.filter(item => {
    if (currentStatusFilter === 'pending' && item.checked) return false;
    if (currentStatusFilter === 'checked' && !item.checked) return false;
    if (searchQuery) {
      const haystack = normalizeText(`${item.name} ${item.category} ${item.notes || ''}`);
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });
}

function showEmpty(title, text) {
  itemsContainer.innerHTML = '';
  emptyState.classList.remove('hidden');
  if (emptyStateTitle) emptyStateTitle.textContent = title;
  if (emptyStateText) emptyStateText.textContent = text;
}

function renderItems() {
  const active = store.getActiveList();
  if (!active || active.items.length === 0) {
    showEmpty('Sua lista está vazia', 'Digite, fale ou toque em uma sugestão acima para adicionar o primeiro item.');
    return;
  }

  // Itens pendentes primeiro; dentro de cada grupo, mantém a ordem de inserção
  const filtered = filterItems(active.items).sort((a, b) => Number(a.checked) - Number(b.checked));

  if (filtered.length === 0) {
    showEmpty('Nenhum item encontrado', searchQuery ? 'Nenhum produto coincide com a sua busca.' : 'Nenhum item neste filtro.');
    return;
  }

  emptyState.classList.add('hidden');

  if (currentViewMode === 'aisle') {
    const grouped = Object.fromEntries(AISLE_ORDER.map(a => [a, []]));
    for (const item of filtered) {
      grouped[AISLE_ORDER.includes(item.category) ? item.category : 'Outros'].push(item);
    }

    itemsContainer.innerHTML = AISLE_ORDER.filter(a => grouped[a].length > 0).map(aisle => {
      const items = grouped[aisle];
      const done = items.filter(i => i.checked).length;
      return `
        <section class="theme-card rounded-3xl p-4 sm:p-5 shadow-sm border" aria-label="${escapeHtml(aisle)}">
          <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs ${getBadgeClass(aisle)}">
                <i class="fa-solid ${CATEGORY_ICONS[aisle] || 'fa-basket-shopping'}"></i>
              </span>
              <h2 class="text-xs sm:text-sm font-extrabold uppercase tracking-wider opacity-80">${escapeHtml(aisle)}</h2>
            </div>
            <span class="text-[11px] font-bold opacity-70" aria-label="${done} de ${items.length} no carrinho">${done}/${items.length}</span>
          </div>
          <div class="space-y-2">
            ${items.map(renderItemCard).join('')}
          </div>
        </section>
      `;
    }).join('');
  } else {
    itemsContainer.innerHTML = `
      <div class="theme-card rounded-3xl p-4 sm:p-5 shadow-sm border space-y-2">
        ${filtered.map(renderItemCard).join('')}
      </div>
    `;
  }
}

function itemLineTotal(item) {
  const unitPrice = item.checked ? (item.actualPrice ?? item.estimatedPrice) : item.estimatedPrice;
  return (unitPrice || 0) * (item.qty || 1);
}

function renderItemCard(item) {
  const id = escapeHtml(item.id);
  const total = itemLineTotal(item);
  const priceDiff = item.checked && item.estimatedPrice > 0 && item.actualPrice !== item.estimatedPrice
    ? (item.actualPrice - item.estimatedPrice) * item.qty : 0;

  return `
    <div class="item-card ${item.checked ? 'is-checked' : ''} p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800" data-id="${id}">
      <button type="button" class="btn-toggle-check flex items-center gap-3 flex-1 min-w-0 text-left" data-id="${id}" aria-pressed="${item.checked}" aria-label="${item.checked ? 'Desmarcar' : 'Marcar'} ${escapeHtml(item.name)}">
        <span class="shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}">
          ${item.checked ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
        </span>
        <span class="min-w-0 block">
          <span class="flex items-center gap-2">
            <span class="item-title text-xs sm:text-sm font-bold truncate">${escapeHtml(item.name)}</span>
            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full ${getBadgeClass(item.category)} hidden sm:inline-flex items-center gap-1 whitespace-nowrap">
              <i class="fa-solid ${CATEGORY_ICONS[item.category] || 'fa-basket-shopping'}"></i> ${escapeHtml(item.category)}
            </span>
          </span>
          <span class="text-[11px] opacity-65 flex items-center gap-2">
            <span class="font-semibold">${formatQty(item.qty)} ${escapeHtml(item.unit)}</span>
            ${item.notes ? `<span class="truncate">• <em>${escapeHtml(item.notes)}</em></span>` : ''}
          </span>
        </span>
      </button>

      <div class="flex items-center gap-1.5">
        ${total > 0 ? `
          <span class="text-right leading-tight">
            <span class="text-xs font-bold whitespace-nowrap opacity-80 block">${formatBRL(total)}</span>
            ${priceDiff ? `<span class="text-[10px] font-bold ${priceDiff > 0 ? 'text-rose-500' : 'text-emerald-500'}">${priceDiff > 0 ? '+' : '−'}${formatBRL(Math.abs(priceDiff))}</span>` : ''}
          </span>` : ''}
        <button type="button" class="btn-edit-item p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs" data-id="${id}" title="Editar" aria-label="Editar ${escapeHtml(item.name)}">
          <i class="fa-solid fa-pencil"></i>
        </button>
        <button type="button" class="btn-delete-item p-2 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs" data-id="${id}" title="Excluir" aria-label="Excluir ${escapeHtml(item.name)}">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `;
}

function toggleWithSound(listId, itemId) {
  const item = store.toggleItem(listId, itemId);
  if (!item) return null;
  if (item.checked) {
    soundEffects.playCheck();
    if ('vibrate' in navigator) navigator.vibrate(15);
    maybeWarnBudget();
  } else {
    soundEffects.playUncheck();
  }
  return item;
}

// Toca o alerta sonoro apenas ao cruzar um limiar (80% ou 100%), não a cada item
let lastBudgetLevel = 0;
function maybeWarnBudget() {
  const active = store.getActiveList();
  if (!active) return;
  const m = store.getMetrics(active.id);
  const level = m.isOverBudget ? 2 : m.isWarningBudget ? 1 : 0;
  if (level > lastBudgetLevel) {
    soundEffects.playWarning();
    showToast(level === 2 ? `⚠️ Teto estourado! Total: ${formatBRL(m.totalActual)}` : `Atenção: ${m.budgetPercent}% do teto já foi usado`);
  }
  lastBudgetLevel = level;
}

function onItemsContainerClick(e) {
  const active = store.getActiveList();
  if (!active) return;
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  const id = btn.getAttribute('data-id');

  if (btn.classList.contains('btn-toggle-check')) {
    toggleWithSound(active.id, id);
  } else if (btn.classList.contains('btn-edit-item')) {
    openEditModal(id);
  } else if (btn.classList.contains('btn-delete-item')) {
    const removed = store.removeItemsWhere(active.id, i => i.id === id);
    if (removed.length) {
      showToast(`"${removed[0].item.name}" excluído`, {
        actionLabel: 'Desfazer',
        onAction: () => store.restoreItems(active.id, removed)
      });
    }
  }
}

function openEditModal(itemId) {
  const active = store.getActiveList();
  if (!active) return;
  const item = active.items.find(i => i.id === itemId);
  if (!item) return;

  editItemId.value = item.id;
  editItemName.value = item.name;
  editItemQty.value = item.qty;
  editItemUnit.value = item.unit;
  editItemEstPrice.value = item.estimatedPrice || '';
  editItemActPrice.value = item.actualPrice || '';
  editItemCategory.value = item.category || 'Outros';
  editItemNotes.value = item.notes || '';

  openModal(modalEditItem, editItemName);
}

// ---------------------------------------------------------------------------
// Modo Mercado
// ---------------------------------------------------------------------------
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) {
    setWakeLockStatus(false, 'Mantenha a tela ativa manualmente');
    return;
  }
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener?.('release', () => {
      if (wantsWakeLock && document.visibilityState !== 'visible') setWakeLockStatus(false, 'Tela pode apagar');
    });
    setWakeLockStatus(true, 'Tela sempre ativa');
  } catch (e) {
    setWakeLockStatus(false, 'Tela pode apagar');
  }
}

function setWakeLockStatus(ok, label) {
  if (!wakeLockStatus) return;
  wakeLockStatus.innerHTML = ok
    ? `<i class="fa-solid fa-bolt text-amber-400 mr-1"></i>${escapeHtml(label)}`
    : `<i class="fa-solid fa-moon text-slate-500 mr-1"></i>${escapeHtml(label)}`;
}

function enterShoppingMode() {
  const active = store.getActiveList();
  if (!active || active.items.length === 0) {
    showToast('Adicione itens à sua lista antes de iniciar o Modo Mercado!');
    itemQuickInput?.focus();
    return;
  }

  const m = store.getMetrics(active.id);
  lastBudgetLevel = m.isOverBudget ? 2 : m.isWarningBudget ? 1 : 0;

  shoppingModeOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  wantsWakeLock = true;
  requestWakeLock();
  renderShoppingMode();
}

function exitShoppingMode() {
  shoppingModeOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  wantsWakeLock = false;
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

function openFinishModal() {
  const active = store.getActiveList();
  if (!active) return;
  const m = store.getMetrics(active.id);
  const pending = m.pendingItems;
  finishSummary.innerHTML = `
    <div class="grid grid-cols-2 gap-2 text-center">
      <div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3">
        <div class="text-[11px] uppercase font-bold opacity-60">Total pago</div>
        <div class="text-lg font-black">${formatBRL(m.totalActual)}</div>
      </div>
      <div class="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3">
        <div class="text-[11px] uppercase font-bold opacity-60">Itens</div>
        <div class="text-lg font-black">${m.checkedItems}/${m.totalItems}</div>
      </div>
    </div>
    ${m.budgetLimit > 0 ? `<p class="text-xs mt-3 font-semibold ${m.isOverBudget ? 'text-rose-500' : 'text-emerald-600'}">
      ${m.isOverBudget ? `Passou ${formatBRL(m.totalActual - m.budgetLimit)} do teto de ${formatBRL(m.budgetLimit)}.` : `Economizou ${formatBRL(m.remainingBudget)} em relação ao teto de ${formatBRL(m.budgetLimit)}. 👏`}
    </p>` : ''}
    ${pending > 0 ? `<p class="text-xs mt-2 opacity-70">${pending} ${pending === 1 ? 'item ficou' : 'itens ficaram'} sem pegar.</p>` : ''}
  `;
  openModal(modalFinish);
}

function finishShoppingTrip(action) {
  const active = store.getActiveList();
  closeModal(modalFinish);
  exitShoppingMode();
  if (!active) return;

  if (action === 'clear') {
    const removed = store.removeItemsWhere(active.id, i => i.checked);
    showToast('🎉 Compra concluída! Itens comprados removidos.', {
      actionLabel: 'Desfazer',
      onAction: () => store.restoreItems(active.id, removed)
    });
  } else if (action === 'uncheck') {
    const checkedIds = active.items.filter(i => i.checked).map(i => i.id);
    store.uncheckAll(active.id);
    showToast('🎉 Compra concluída! Lista pronta para a próxima vez.', {
      actionLabel: 'Desfazer',
      onAction: () => checkedIds.forEach(id => store.updateItem(active.id, id, { checked: true }))
    });
  } else {
    showToast('🎉 Compra concluída!');
  }
  soundEffects.playCelebration();
  triggerConfetti();
}

function renderShoppingMode() {
  const active = store.getActiveList();
  if (!active) return;
  const m = store.getMetrics(active.id);

  shoppingModeTitle.textContent = active.title;
  shoppingItemsRatio.textContent = `${m.checkedItems}/${m.totalItems} pegos`;
  shoppingTotalSpent.textContent = formatBRL(m.totalActual);
  if (shoppingProgressBar) shoppingProgressBar.style.width = `${m.progressPercent}%`;

  if (m.budgetLimit > 0) {
    shoppingBudgetTarget.textContent = `/ Teto: ${formatBRL(m.budgetLimit)}`;
    shoppingBudgetTarget.className = m.isOverBudget ? 'text-xs text-rose-400 font-bold' : m.isWarningBudget ? 'text-xs text-amber-400 font-bold' : 'text-xs text-slate-400 font-medium';
  } else {
    shoppingBudgetTarget.textContent = '';
  }

  if (shoppingProjected) {
    shoppingProjected.textContent = m.pendingItems > 0 && m.projectedTotal > 0 ? `Previsão final: ${formatBRL(m.projectedTotal)}` : '';
    shoppingProjected.className = m.isProjectedOverBudget ? 'text-[11px] text-amber-400 font-semibold' : 'text-[11px] text-slate-400';
  }

  const grouped = store.getItemsGroupedByAisle(active.id)
    .map(g => ({
      ...g,
      // Pendentes primeiro dentro do corredor, para não precisar rolar passando pelo que já pegou
      items: g.items.filter(i => !(shoppingHideChecked && i.checked)).sort((a, b) => Number(a.checked) - Number(b.checked))
    }))
    .filter(g => g.items.length > 0);

  if (grouped.length === 0) {
    shoppingItemsList.innerHTML = `
      <div class="text-center py-16 text-slate-400">
        <i class="fa-solid fa-circle-check text-5xl text-emerald-500 mb-4"></i>
        <p class="font-bold text-white">Tudo no carrinho!</p>
        <p class="text-xs mt-1">Toque em "Concluir Compra" quando passar no caixa.</p>
      </div>`;
    return;
  }

  shoppingItemsList.innerHTML = grouped.map(group => `
    <section>
      <div class="flex items-center justify-between mb-2 px-1">
        <div class="flex items-center gap-2">
          <i class="fa-solid ${CATEGORY_ICONS[group.aisle] || 'fa-basket-shopping'} text-rose-400 text-xs"></i>
          <h3 class="text-xs font-black uppercase tracking-wider text-slate-400">${escapeHtml(group.aisle)}</h3>
        </div>
        <span class="text-[11px] text-slate-400 font-bold">${group.items.filter(i => i.checked).length}/${group.items.length}</span>
      </div>
      <div class="space-y-2.5">
        ${group.items.map(item => {
          const id = escapeHtml(item.id);
          const total = itemLineTotal(item);
          return `
          <div class="shopping-card ${item.checked ? 'is-checked' : ''} rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-stretch overflow-hidden">
            <button type="button" class="btn-shop-toggle flex-1 min-w-0 p-4 flex items-center gap-3.5 text-left" data-id="${id}" aria-pressed="${item.checked}">
              <span class="shrink-0 w-9 h-9 rounded-xl border-2 flex items-center justify-center text-sm font-bold ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500 text-transparent'}">
                <i class="fa-solid fa-check"></i>
              </span>
              <span class="min-w-0 block">
                <span class="shopping-text text-base sm:text-lg font-bold text-white block truncate">${escapeHtml(item.name)}</span>
                <span class="text-xs text-slate-400 font-medium">${formatQty(item.qty)} ${escapeHtml(item.unit)}${item.notes ? ` • ${escapeHtml(item.notes)}` : ''}</span>
              </span>
            </button>
            <button type="button" class="btn-shop-price shrink-0 px-3 sm:px-4 border-l border-slate-700/80 text-right hover:bg-slate-700/50 min-w-[92px]" data-id="${id}" aria-label="Informar preço de ${escapeHtml(item.name)}">
              <span class="text-xs font-bold text-slate-200 block">${total > 0 ? formatBRL(total) : '<i class="fa-solid fa-tag"></i>'}</span>
              <span class="text-[10px] text-slate-400">${total > 0 ? 'alterar preço' : 'informar preço'}</span>
            </button>
          </div>`;
        }).join('')}
      </div>
    </section>
  `).join('');
}

function onShoppingListClick(e) {
  const active = store.getActiveList();
  if (!active) return;
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  if (btn.classList.contains('btn-shop-toggle')) {
    toggleWithSound(active.id, id);
  } else if (btn.classList.contains('btn-shop-price')) {
    openPriceModal(id);
  }
}

function openPriceModal(itemId) {
  const active = store.getActiveList();
  const item = active?.items.find(i => i.id === itemId);
  if (!item) return;
  priceItemId.value = item.id;
  priceItemName.textContent = item.name;
  const hasQty = item.qty !== 1;
  if (priceModeUnit) priceModeUnit.checked = true;
  $('price-mode-wrapper')?.classList.toggle('hidden', !hasQty);
  const current = item.actualPrice || item.estimatedPrice;
  priceInput.value = current ? formatQty(current) : '';
  priceItemHint.textContent = item.estimatedPrice > 0
    ? `Estimado: ${formatBRL(item.estimatedPrice)} por ${item.unit} • ${formatQty(item.qty)} ${item.unit}`
    : `${formatQty(item.qty)} ${item.unit}`;
  openModal(modalPrice, priceInput);
  setTimeout(() => priceInput.select(), 40);
}

// ---------------------------------------------------------------------------
// Reconhecimento de Voz (Web Speech API)
// ---------------------------------------------------------------------------
function initSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (btnVoiceInput) {
      btnVoiceInput.title = 'Reconhecimento de voz não suportado neste navegador';
      btnVoiceInput.classList.add('opacity-40');
      btnVoiceInput.addEventListener('click', () => showToast('Seu navegador não suporta entrada por voz. Tente o Chrome.'));
    }
    return;
  }

  speechRecognition = new SpeechRec();
  speechRecognition.lang = 'pt-BR';
  speechRecognition.continuous = false;
  speechRecognition.interimResults = true;

  speechRecognition.onstart = () => {
    isRecording = true;
    btnVoiceInput?.classList.add('recording-active');
    btnVoiceInput?.setAttribute('aria-pressed', 'true');
    itemQuickInput.placeholder = 'Ouvindo... fale o item (ex: "dois quilos de tomate")';
  };

  speechRecognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript.trim();
    if (!transcript) return;
    itemQuickInput.value = transcript;
    syncDetailsFromText(transcript);
    if (result.isFinal) {
      // Fala "arroz e feijão e leite" adiciona vários itens
      const parts = transcript.split(/\s+e\s+(?=(?:\d|um|uma|dois|duas|tr[eê]s|meio|meia|[a-zà-ú]))/i);
      if (parts.length > 1 && parts.every(p => parseItemInput(p).name.length > 1)) {
        parts.forEach(p => addItemFromText(p, { useDetails: false, silent: true }));
        showToast(`🎙️ ${parts.length} itens adicionados por voz`);
        soundEffects.playCheck();
      } else {
        addItemFromText(transcript, { useDetails: true });
      }
      itemQuickInput.value = '';
      resetDetails();
    }
  };

  speechRecognition.onerror = (e) => {
    const messages = {
      'not-allowed': 'Permita o uso do microfone para adicionar por voz.',
      'no-speech': 'Não ouvi nada. Tente novamente.',
      'network': 'Reconhecimento de voz precisa de internet.'
    };
    if (messages[e.error]) showToast(messages[e.error]);
  };

  speechRecognition.onend = () => {
    isRecording = false;
    btnVoiceInput?.classList.remove('recording-active');
    btnVoiceInput?.setAttribute('aria-pressed', 'false');
    itemQuickInput.placeholder = itemQuickInput.dataset.placeholder || '';
  };

  if (itemQuickInput) itemQuickInput.dataset.placeholder = itemQuickInput.placeholder;

  btnVoiceInput?.addEventListener('click', () => {
    if (isRecording) {
      speechRecognition.stop();
      return;
    }
    try {
      speechRecognition.start();
    } catch (e) {
      speechRecognition.stop();
    }
  });
}

// ---------------------------------------------------------------------------
// Exportações
// ---------------------------------------------------------------------------
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportToWhatsApp() {
  const active = store.getActiveList();
  if (!active) return;
  const text = store.exportWhatsApp(active.id);

  // No celular, abre a folha de compartilhamento nativa (WhatsApp, Telegram...)
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: active.title, text });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }
  if (await copyText(text)) {
    showToast('Lista copiada! Cole no WhatsApp para enviar.', {
      actionLabel: 'Abrir WhatsApp',
      onAction: () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }
}

function exportToCSV() {
  const active = store.getActiveList();
  if (!active) return;
  const slug = normalizeText(active.title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lista';
  downloadFile('﻿' + store.exportCSV(active.id), `superlista-${slug}.csv`, 'text/csv;charset=utf-8;');
}

// ---------------------------------------------------------------------------
// Gerenciador de Listas
// ---------------------------------------------------------------------------
function renderListsManager() {
  if (!listsManagerContainer) return;
  const lists = store.getLists();
  const active = store.getActiveList();

  listsManagerContainer.innerHTML = lists.map(l => {
    const isCurrent = active && active.id === l.id;
    const id = escapeHtml(l.id);
    return `
      <div class="flex items-center justify-between p-3 rounded-2xl border ${isCurrent ? 'theme-accent-ring' : 'border-slate-100 dark:border-slate-800'}">
        <div class="flex-1 min-w-0 pr-2">
          <div class="flex items-center gap-2">
            <span class="font-bold text-xs truncate">${escapeHtml(l.title)}</span>
            ${isCurrent ? '<span class="text-[10px] font-black uppercase theme-accent-text">(Ativa)</span>' : ''}
          </div>
          <span class="text-[11px] opacity-60">${l.items.length} ${l.items.length === 1 ? 'item' : 'itens'}${l.budgetLimit > 0 ? ` • Teto: ${formatBRL(l.budgetLimit)}` : ''}</span>
        </div>
        <div class="flex items-center gap-1">
          ${!isCurrent ? `<button type="button" class="btn-switch-list px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700" data-id="${id}">Ativar</button>` : ''}
          <button type="button" class="btn-rename-list p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs" data-id="${id}" title="Renomear" aria-label="Renomear ${escapeHtml(l.title)}"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="btn-duplicate-list p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs" data-id="${id}" title="Duplicar (itens desmarcados)" aria-label="Duplicar ${escapeHtml(l.title)}"><i class="fa-solid fa-copy"></i></button>
          ${lists.length > 1 ? `<button type="button" class="btn-delete-list p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs" data-id="${id}" title="Excluir Lista" aria-label="Excluir ${escapeHtml(l.title)}"><i class="fa-solid fa-trash-can"></i></button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function onListsManagerClick(e) {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  const list = store.getList(id);
  if (!list) return;

  if (btn.classList.contains('btn-switch-list')) {
    store.switchList(id);
    closeModal(modalManageLists);
  } else if (btn.classList.contains('btn-rename-list')) {
    const title = prompt('Novo nome da lista:', list.title);
    if (title && title.trim()) store.updateList(id, { title });
  } else if (btn.classList.contains('btn-duplicate-list')) {
    const copy = store.duplicateList(id);
    if (copy) showToast(`"${copy.title}" criada e ativada`);
  } else if (btn.classList.contains('btn-delete-list')) {
    if (confirm(`Excluir a lista "${list.title}" e todos os seus ${list.items.length} itens?`)) {
      store.deleteList(id);
    }
  }
}

// PWA: funciona offline no mercado (sinal fraco é comum lá dentro)
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker não registrado:', err));
  });
  if (document.readyState === 'complete') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
