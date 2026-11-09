/**
 * SuperLista V2 - Controlador Principal da Aplicação
 */

import { ListStore, CATEGORY_ICONS, AISLE_ORDER } from './store.mjs';
import { parseItemInput } from './parser.mjs';
import { soundEffects } from './audio.mjs';

// Instância única do store
const store = new ListStore();

// Estado local da UI
let currentStatusFilter = 'all'; // 'all' | 'pending' | 'checked'
let currentViewMode = 'aisle'; // 'aisle' | 'flat'
let searchQuery = '';
let speechRecognition = null;
let isRecording = false;
let wakeLock = null;

// Elementos DOM Principais
const listSelector = document.getElementById('list-selector');
const themeSelector = document.getElementById('theme-selector');
const btnToggleSound = document.getElementById('btn-toggle-sound');
const soundIcon = document.getElementById('sound-icon');
const btnExportMenu = document.getElementById('btn-export-menu');
const exportDropdown = document.getElementById('export-dropdown');

// Métricas DOM
const metricCheckedCount = document.getElementById('metric-checked-count');
const metricTotalCount = document.getElementById('metric-total-count');
const metricProgressPercent = document.getElementById('metric-progress-percent');
const metricActualSpent = document.getElementById('metric-actual-spent');
const metricBudgetLimit = document.getElementById('metric-budget-limit');
const budgetAlertBadge = document.getElementById('budget-alert-badge');
const mainProgressBar = document.getElementById('main-progress-bar');
const btnEditBudgetQuick = document.getElementById('btn-edit-budget-quick');

// Formulário de Adição Rápida
const quickAddForm = document.getElementById('quick-add-form');
const itemQuickInput = document.getElementById('item-quick-input');
const btnVoiceInput = document.getElementById('btn-voice-input');
const btnToggleDetails = document.getElementById('btn-toggle-details');
const detailsPanel = document.getElementById('details-panel');
const detailQty = document.getElementById('detail-qty');
const detailUnit = document.getElementById('detail-unit');
const detailPrice = document.getElementById('detail-price');
const detailCategory = document.getElementById('detail-category');

// Filtros e Visualização
const statusTabs = document.querySelectorAll('.status-tab');
const btnToggleViewMode = document.getElementById('btn-toggle-view-mode');
const viewModeIcon = document.getElementById('view-mode-icon');
const viewModeLabel = document.getElementById('view-mode-label');
const searchInput = document.getElementById('search-input');
const btnClearChecked = document.getElementById('btn-clear-checked');
const itemsContainer = document.getElementById('items-container');
const emptyState = document.getElementById('empty-state');

// Modo Mercado (Shopping Mode)
const btnOpenShoppingMode = document.getElementById('btn-open-shopping-mode');
const shoppingModeOverlay = document.getElementById('shopping-mode-overlay');
const btnExitShoppingMode = document.getElementById('btn-exit-shopping-mode');
const shoppingModeTitle = document.getElementById('shopping-mode-title');
const shoppingItemsRatio = document.getElementById('shopping-items-ratio');
const shoppingTotalSpent = document.getElementById('shopping-total-spent');
const shoppingBudgetTarget = document.getElementById('shopping-budget-target');
const shoppingItemsList = document.getElementById('shopping-items-list');
const btnShoppingFinish = document.getElementById('btn-shopping-finish');
const wakeLockStatus = document.getElementById('wake-lock-status');

// Modais
const btnManageLists = document.getElementById('btn-manage-lists');
const modalManageLists = document.getElementById('modal-manage-lists');
const formCreateList = document.getElementById('form-create-list');
const newListTitle = document.getElementById('new-list-title');
const newListBudget = document.getElementById('new-list-budget');
const listsManagerContainer = document.getElementById('lists-manager-container');

const btnOpenBackupModal = document.getElementById('btn-open-backup-modal');
const modalBackup = document.getElementById('modal-backup');
const backupJsonTextarea = document.getElementById('backup-json-textarea');
const btnCopyBackupJson = document.getElementById('btn-copy-backup-json');
const btnDownloadBackupJson = document.getElementById('btn-download-backup-json');
const btnRestoreBackupJson = document.getElementById('btn-restore-backup-json');

const modalEditItem = document.getElementById('modal-edit-item');
const formEditItem = document.getElementById('form-edit-item');
const editItemId = document.getElementById('edit-item-id');
const editItemName = document.getElementById('edit-item-name');
const editItemQty = document.getElementById('edit-item-qty');
const editItemUnit = document.getElementById('edit-item-unit');
const editItemEstPrice = document.getElementById('edit-item-est-price');
const editItemActPrice = document.getElementById('edit-item-act-price');
const editItemCategory = document.getElementById('edit-item-category');
const editItemNotes = document.getElementById('edit-item-notes');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  applyTheme(store.getTheme());
  if (themeSelector) themeSelector.value = store.getTheme();

  soundEffects.setMuted(!store.isSoundEnabled());
  updateSoundIcon();

  initSpeechRecognition();
  setupEventListeners();
  render();

  store.subscribe(() => {
    render();
  });
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  store.setTheme(theme);
}

function updateSoundIcon() {
  const isMuted = soundEffects.isMuted();
  if (soundIcon) {
    soundIcon.className = isMuted ? 'fa-solid fa-volume-xmark text-sm' : 'fa-solid fa-volume-high text-sm';
  }
}

// Configuração de Eventos
function setupEventListeners() {
  // Tema
  if (themeSelector) {
    themeSelector.addEventListener('change', (e) => applyTheme(e.target.value));
  }

  // Alternar Som
  if (btnToggleSound) {
    btnToggleSound.addEventListener('click', () => {
      const nextMuted = !soundEffects.isMuted();
      soundEffects.setMuted(nextMuted);
      store.setSoundEnabled(!nextMuted);
      updateSoundIcon();
      if (!nextMuted) soundEffects.playCheck();
    });
  }

  // Alternância de Listas no Dropdown
  if (listSelector) {
    listSelector.addEventListener('change', (e) => {
      store.switchList(e.target.value);
    });
  }

  // Menu de Exportação
  if (btnExportMenu) {
    btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      exportDropdown.classList.toggle('hidden');
    });
  }
  document.addEventListener('click', () => {
    if (exportDropdown && !exportDropdown.classList.contains('hidden')) {
      exportDropdown.classList.add('hidden');
    }
  });

  // Ações de Exportação
  document.getElementById('btn-export-whatsapp')?.addEventListener('click', exportToWhatsApp);
  document.getElementById('btn-export-csv')?.addEventListener('click', exportToCSV);
  document.getElementById('btn-print-list')?.addEventListener('click', () => window.print());

  // Input Rápido: Parser dinâmico ao digitar
  if (itemQuickInput) {
    itemQuickInput.addEventListener('input', () => {
      const parsed = parseItemInput(itemQuickInput.value);
      if (parsed.name && parsed.qty) {
        detailQty.value = parsed.qty;
        detailUnit.value = parsed.unit;
        detailCategory.value = parsed.category;
      }
    });
  }

  // Alternar Painel de Detalhes
  if (btnToggleDetails) {
    btnToggleDetails.addEventListener('click', () => {
      detailsPanel.classList.toggle('hidden');
    });
  }

  // Chips de Sugestões Rápidas
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-item');
      if (text) {
        itemQuickInput.value = text;
        const parsed = parseItemInput(text);
        detailQty.value = parsed.qty;
        detailUnit.value = parsed.unit;
        detailCategory.value = parsed.category;
        itemQuickInput.focus();
      }
    });
  });

  // Envio do Formulário de Adicionar Item
  if (quickAddForm) {
    quickAddForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawText = itemQuickInput.value.trim();
      if (!rawText) return;

      const parsed = parseItemInput(rawText);
      const active = store.getActiveList();
      if (!active) return;

      const qty = parseFloat(detailQty.value) || parsed.qty || 1;
      const unit = detailUnit.value || parsed.unit || 'un';
      const estPrice = parseFloat(detailPrice.value) || 0;
      const category = detailCategory.value || parsed.category || 'Outros';

      store.addItem(active.id, {
        name: parsed.name || rawText,
        qty,
        unit,
        estimatedPrice: estPrice,
        actualPrice: estPrice,
        category
      });

      soundEffects.playCheck();
      itemQuickInput.value = '';
      detailPrice.value = '';
      itemQuickInput.focus();
    });
  }

  // Filtros de Status
  statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      statusTabs.forEach(t => {
        t.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-900', 'dark:text-white');
        t.classList.add('text-slate-600', 'dark:text-slate-400');
      });
      tab.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-900', 'dark:text-white');
      tab.classList.remove('text-slate-600', 'dark:text-slate-400');

      currentStatusFilter = tab.getAttribute('data-status');
      renderItems();
    });
  });

  // Alternador de Visualização (Corredores vs Lista)
  if (btnToggleViewMode) {
    btnToggleViewMode.addEventListener('click', () => {
      currentViewMode = currentViewMode === 'aisle' ? 'flat' : 'aisle';
      viewModeIcon.className = currentViewMode === 'aisle' ? 'fa-solid fa-layer-group' : 'fa-solid fa-list';
      viewModeLabel.textContent = currentViewMode === 'aisle' ? 'Por Corredor' : 'Lista Plana';
      renderItems();
    });
  }

  // Busca
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderItems();
    });
  }

  // Limpar Comprados
  if (btnClearChecked) {
    btnClearChecked.addEventListener('click', () => {
      const active = store.getActiveList();
      if (!active) return;
      if (confirm('Deseja remover todos os itens já marcados como comprados desta lista?')) {
        store.clearCheckedItems(active.id);
      }
    });
  }

  // Alterar Teto de Gastos Rápido
  if (btnEditBudgetQuick) {
    btnEditBudgetQuick.addEventListener('click', () => {
      const active = store.getActiveList();
      if (!active) return;
      const current = active.budgetLimit || 0;
      const input = prompt('Defina o novo teto de gastos (R$) para esta lista:', current > 0 ? current : '');
      if (input !== null) {
        const val = parseFloat(input.replace(',', '.')) || 0;
        store.updateList(active.id, { budgetLimit: val });
      }
    });
  }

  // Gerenciador de Listas Modal
  if (btnManageLists) {
    btnManageLists.addEventListener('click', () => {
      renderListsManager();
      modalManageLists.classList.remove('hidden');
    });
  }

  if (formCreateList) {
    formCreateList.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = newListTitle.value.trim();
      const budget = parseFloat(newListBudget.value) || 0;
      if (title) {
        store.createList(title, budget);
        newListTitle.value = '';
        newListBudget.value = '';
        renderListsManager();
      }
    });
  }

  // Backup Modal
  if (btnOpenBackupModal) {
    btnOpenBackupModal.addEventListener('click', () => {
      backupJsonTextarea.value = store.exportJSON();
      modalBackup.classList.remove('hidden');
    });
  }

  if (btnCopyBackupJson) {
    btnCopyBackupJson.addEventListener('click', () => {
      navigator.clipboard.writeText(backupJsonTextarea.value).then(() => {
        showToast('JSON copiado para a área de transferência!');
      });
    });
  }

  if (btnDownloadBackupJson) {
    btnDownloadBackupJson.addEventListener('click', () => {
      const blob = new Blob([backupJsonTextarea.value], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `superlista-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (btnRestoreBackupJson) {
    btnRestoreBackupJson.addEventListener('click', () => {
      const val = backupJsonTextarea.value.trim();
      if (!val) return;
      if (confirm('Atenção: Restaurar um backup substituirá seus dados atuais. Continuar?')) {
        const ok = store.importJSON(val);
        if (ok) {
          showToast('Backup restaurado com sucesso!');
          modalBackup.classList.add('hidden');
        } else {
          alert('Erro: O arquivo ou texto JSON fornecido é inválido.');
        }
      }
    });
  }

  // Modal Fechamento Universal
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modalManageLists.classList.add('hidden');
      modalBackup.classList.add('hidden');
      modalEditItem.classList.add('hidden');
    });
  });

  // Form Editar Item
  if (formEditItem) {
    formEditItem.addEventListener('submit', (e) => {
      e.preventDefault();
      const active = store.getActiveList();
      if (!active) return;
      const itemId = editItemId.value;

      store.updateItem(active.id, itemId, {
        name: editItemName.value,
        qty: parseFloat(editItemQty.value) || 1,
        unit: editItemUnit.value,
        estimatedPrice: parseFloat(editItemEstPrice.value) || 0,
        actualPrice: parseFloat(editItemActPrice.value) || 0,
        category: editItemCategory.value,
        notes: editItemNotes.value
      });

      modalEditItem.classList.add('hidden');
      showToast('Item atualizado com sucesso!');
    });
  }

  // Modo Mercado (Shopping Mode)
  if (btnOpenShoppingMode) {
    btnOpenShoppingMode.addEventListener('click', enterShoppingMode);
  }
  if (btnExitShoppingMode) {
    btnExitShoppingMode.addEventListener('click', exitShoppingMode);
  }
  if (btnShoppingFinish) {
    btnShoppingFinish.addEventListener('click', finishShoppingTrip);
  }
}

// Renderização Geral
function render() {
  renderListSelector();
  renderMetrics();
  renderItems();
  if (!shoppingModeOverlay.classList.contains('hidden')) {
    renderShoppingMode();
  }
}

function renderListSelector() {
  if (!listSelector) return;
  const lists = store.getLists();
  const active = store.getActiveList();

  listSelector.innerHTML = lists.map(l => `
    <option value="${l.id}" ${active && active.id === l.id ? 'selected' : ''}>
      🛒 ${escapeHtml(l.title)} (${l.items.length})
    </option>
  `).join('');
}

function renderMetrics() {
  const active = store.getActiveList();
  if (!active) return;
  const m = store.getMetrics(active.id);

  if (metricCheckedCount) metricCheckedCount.textContent = m.checkedItems;
  if (metricTotalCount) metricTotalCount.textContent = m.totalItems;
  if (metricProgressPercent) metricProgressPercent.textContent = `${m.progressPercent}%`;
  if (mainProgressBar) mainProgressBar.style.width = `${m.progressPercent}%`;

  if (metricActualSpent) {
    metricActualSpent.textContent = `R$ ${m.totalActual.toFixed(2).replace('.', ',')}`;
  }

  if (metricBudgetLimit) {
    if (m.budgetLimit > 0) {
      metricBudgetLimit.textContent = `R$ ${m.budgetLimit.toFixed(2).replace('.', ',')}`;
      budgetAlertBadge.classList.remove('hidden');

      if (m.isOverBudget) {
        budgetAlertBadge.className = 'mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block bg-rose-500/80 text-white';
        budgetAlertBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i>Estourou +R$ ${(m.totalActual - m.budgetLimit).toFixed(2).replace('.', ',')}`;
      } else if (m.isWarningBudget) {
        budgetAlertBadge.className = 'mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block bg-amber-500/80 text-white';
        budgetAlertBadge.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1"></i>${m.budgetPercent}% do teto`;
      } else {
        budgetAlertBadge.className = 'mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block bg-emerald-500/80 text-white';
        budgetAlertBadge.innerHTML = `<i class="fa-solid fa-shield mr-1"></i>Resta R$ ${m.remainingBudget.toFixed(2).replace('.', ',')}`;
      }
    } else {
      metricBudgetLimit.textContent = 'Sem teto';
      budgetAlertBadge.classList.add('hidden');
    }
  }

  // Celebração quando 100% dos itens são completados
  if (m.totalItems > 0 && m.checkedItems === m.totalItems && !store._hasCelebratedThisTrip) {
    store._hasCelebratedThisTrip = true;
    soundEffects.playCelebration();
    triggerConfetti();
  } else if (m.checkedItems < m.totalItems) {
    store._hasCelebratedThisTrip = false;
  }
}

function renderItems() {
  const active = store.getActiveList();
  if (!active || active.items.length === 0) {
    itemsContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  // Filtragem
  let filtered = active.items.filter(item => {
    if (currentStatusFilter === 'pending' && item.checked) return false;
    if (currentStatusFilter === 'checked' && !item.checked) return false;
    if (searchQuery) {
      const matchName = item.name.toLowerCase().includes(searchQuery);
      const matchCat = (item.category || '').toLowerCase().includes(searchQuery);
      if (!matchName && !matchCat) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    itemsContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  if (currentViewMode === 'aisle') {
    // Agrupamento por Corredor
    const grouped = {};
    for (const aisle of AISLE_ORDER) grouped[aisle] = [];

    for (const item of filtered) {
      const aisle = AISLE_ORDER.includes(item.category) ? item.category : 'Outros';
      grouped[aisle].push(item);
    }

    let html = '';
    for (const aisle of AISLE_ORDER) {
      const items = grouped[aisle];
      if (items.length === 0) continue;

      const iconClass = CATEGORY_ICONS[aisle] || 'fa-basket-shopping';
      const badgeClass = getBadgeClass(aisle);

      html += `
        <div class="theme-card rounded-3xl p-4 sm:p-5 shadow-sm border">
          <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs ${badgeClass}">
                <i class="fa-solid ${iconClass}"></i>
              </span>
              <h3 class="text-xs sm:text-sm font-extrabold uppercase tracking-wider opacity-80">${escapeHtml(aisle)}</h3>
            </div>
            <span class="text-[11px] font-bold opacity-50">${items.length} ${items.length === 1 ? 'item' : 'itens'}</span>
          </div>
          <div class="space-y-2">
            ${items.map(item => renderItemCard(item)).join('')}
          </div>
        </div>
      `;
    }
    itemsContainer.innerHTML = html;
  } else {
    // Lista Plana
    itemsContainer.innerHTML = `
      <div class="theme-card rounded-3xl p-4 sm:p-5 shadow-sm border space-y-2">
        ${filtered.map(item => renderItemCard(item)).join('')}
      </div>
    `;
  }

  attachItemEvents();
}

function renderItemCard(item) {
  const badgeClass = getBadgeClass(item.category);
  const iconClass = CATEGORY_ICONS[item.category] || 'fa-basket-shopping';
  const priceDisplay = item.estimatedPrice > 0 ? `R$ ${(item.estimatedPrice * item.qty).toFixed(2).replace('.', ',')}` : '';

  return `
    <div class="item-card ${item.checked ? 'is-checked' : ''} p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all" data-id="${item.id}">
      
      <!-- Checkbox e Título -->
      <div class="flex items-center gap-3 flex-1 min-w-0 cursor-pointer btn-toggle-check" data-id="${item.id}">
        <div class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}">
          ${item.checked ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
        </div>
        
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="item-title text-xs sm:text-sm font-bold truncate">${escapeHtml(item.name)}</span>
            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full ${badgeClass} hidden sm:inline-flex items-center gap-1">
              <i class="fa-solid ${iconClass}"></i> ${escapeHtml(item.category)}
            </span>
          </div>
          <div class="text-[11px] opacity-65 flex items-center gap-2">
            <span class="font-semibold">${item.qty} ${escapeHtml(item.unit)}</span>
            ${item.notes ? `<span>• <em>${escapeHtml(item.notes)}</em></span>` : ''}
          </div>
        </div>
      </div>

      <!-- Preço e Ações -->
      <div class="flex items-center gap-2.5">
        ${priceDisplay ? `<span class="text-xs font-bold whitespace-nowrap opacity-80">${priceDisplay}</span>` : ''}
        
        <button class="btn-edit-item p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs" data-id="${item.id}" title="Editar">
          <i class="fa-solid fa-pencil"></i>
        </button>

        <button class="btn-delete-item p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs" data-id="${item.id}" title="Excluir">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>

    </div>
  `;
}

function attachItemEvents() {
  document.querySelectorAll('.btn-toggle-check').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      const active = store.getActiveList();
      if (!active) return;
      const item = store.toggleItem(active.id, id);
      if (item) {
        if (item.checked) {
          soundEffects.playCheck();
        } else {
          soundEffects.playUncheck();
        }
      }
    });
  });

  document.querySelectorAll('.btn-edit-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-id');
      openEditModal(id);
    });
  });

  document.querySelectorAll('.btn-delete-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-id');
      const active = store.getActiveList();
      if (active) store.deleteItem(active.id, id);
    });
  });
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
  editItemActPrice.value = item.actualPrice || item.estimatedPrice || '';
  editItemCategory.value = item.category || 'Outros';
  editItemNotes.value = item.notes || '';

  modalEditItem.classList.remove('hidden');
}

// Modo Mercado (Shopping Mode)
async function enterShoppingMode() {
  const active = store.getActiveList();
  if (!active || active.items.length === 0) {
    alert('Adicione itens à sua lista antes de iniciar o Modo Mercado!');
    return;
  }

  shoppingModeOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Screen Wake Lock API
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      if (wakeLockStatus) wakeLockStatus.innerHTML = '<i class="fa-solid fa-bolt text-amber-400 mr-1"></i>Tela Sempre Ativa';
    } catch (e) {
      if (wakeLockStatus) wakeLockStatus.innerHTML = '<i class="fa-solid fa-moon text-slate-500 mr-1"></i>Modo Padrão';
    }
  }

  renderShoppingMode();
}

function exitShoppingMode() {
  shoppingModeOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

function finishShoppingTrip() {
  exitShoppingMode();
  soundEffects.playCelebration();
  triggerConfetti();
  showToast('🎉 Compras finalizadas com sucesso!');
}

function renderShoppingMode() {
  const active = store.getActiveList();
  if (!active) return;
  const m = store.getMetrics(active.id);

  shoppingModeTitle.textContent = active.title;
  shoppingItemsRatio.textContent = `${m.checkedItems}/${m.totalItems} pegos`;
  shoppingTotalSpent.textContent = `R$ ${m.totalActual.toFixed(2).replace('.', ',')}`;

  if (m.budgetLimit > 0) {
    shoppingBudgetTarget.textContent = `/ Teto: R$ ${m.budgetLimit.toFixed(2).replace('.', ',')}`;
    if (m.isOverBudget) {
      shoppingBudgetTarget.className = 'text-xs text-rose-400 font-bold';
    } else {
      shoppingBudgetTarget.className = 'text-xs text-slate-400 font-medium';
    }
  } else {
    shoppingBudgetTarget.textContent = '';
  }

  // Agrupar itens por corredores no modo mercado
  const grouped = store.getItemsGroupedByAisle(active.id);

  let html = '';
  for (const group of grouped) {
    const iconClass = CATEGORY_ICONS[group.aisle] || 'fa-basket-shopping';
    html += `
      <div>
        <div class="flex items-center gap-2 mb-2 px-1">
          <i class="fa-solid ${iconClass} text-rose-400 text-xs"></i>
          <h4 class="text-xs font-black uppercase tracking-wider text-slate-400">${escapeHtml(group.aisle)}</h4>
        </div>
        <div class="space-y-2.5">
          ${group.items.map(item => `
            <div class="shopping-card ${item.checked ? 'is-checked' : ''} p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-between gap-3 cursor-pointer select-none active:scale-95 transition-all" data-id="${item.id}">
              <div class="flex items-center gap-3.5 flex-1 min-w-0">
                <div class="w-8 h-8 rounded-xl border-2 flex items-center justify-center text-sm font-bold ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500 text-transparent'}">
                  <i class="fa-solid fa-check"></i>
                </div>
                <div class="min-w-0">
                  <span class="shopping-text text-sm sm:text-base font-bold text-white block truncate">${escapeHtml(item.name)}</span>
                  <span class="text-xs text-slate-400 font-medium">${item.qty} ${escapeHtml(item.unit)} ${item.notes ? `• ${escapeHtml(item.notes)}` : ''}</span>
                </div>
              </div>
              <div class="text-right">
                <span class="text-xs font-bold text-slate-300 block">R$ ${((item.actualPrice || item.estimatedPrice || 0) * item.qty).toFixed(2).replace('.', ',')}</span>
                <span class="text-[10px] text-slate-500">${item.checked ? 'No carrinho' : 'Pendente'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  shoppingItemsList.innerHTML = html;

  // Click handler para marcar/desmarcar no Modo Mercado
  shoppingItemsList.querySelectorAll('.shopping-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      const item = store.toggleItem(active.id, id);
      if (item) {
        if (item.checked) {
          soundEffects.playCheck();
        } else {
          soundEffects.playUncheck();
        }
      }
      renderShoppingMode();
      renderMetrics();
    });
  });
}

// Reconhecimento de Voz (Web Speech API)
function initSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (btnVoiceInput) {
      btnVoiceInput.title = 'Reconhecimento de voz não suportado neste navegador';
      btnVoiceInput.classList.add('opacity-40');
    }
    return;
  }

  speechRecognition = new SpeechRec();
  speechRecognition.lang = 'pt-BR';
  speechRecognition.continuous = false;
  speechRecognition.interimResults = false;

  speechRecognition.onstart = () => {
    isRecording = true;
    if (btnVoiceInput) btnVoiceInput.classList.add('recording-active');
  };

  speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript && itemQuickInput) {
      itemQuickInput.value = transcript;
      const parsed = parseItemInput(transcript);
      detailQty.value = parsed.qty;
      detailUnit.value = parsed.unit;
      detailCategory.value = parsed.category;
      itemQuickInput.focus();
      showToast(`Voz: "${transcript}"`);
    }
  };

  speechRecognition.onerror = (e) => {
    console.warn('Erro no reconhecimento de voz:', e);
    isRecording = false;
    if (btnVoiceInput) btnVoiceInput.classList.remove('recording-active');
  };

  speechRecognition.onend = () => {
    isRecording = false;
    if (btnVoiceInput) btnVoiceInput.classList.remove('recording-active');
  };

  if (btnVoiceInput) {
    btnVoiceInput.addEventListener('click', () => {
      if (!speechRecognition) return;
      if (isRecording) {
        speechRecognition.stop();
      } else {
        try {
          speechRecognition.start();
        } catch (e) {
          speechRecognition.stop();
        }
      }
    });
  }
}

// Exportações
function exportToWhatsApp() {
  const active = store.getActiveList();
  if (!active) return;
  const text = store.exportWhatsApp(active.id);
  navigator.clipboard.writeText(text).then(() => {
    showToast('Lista copiada! Cole no WhatsApp para enviar.');
  }).catch(() => {
    prompt('Copie o texto para o WhatsApp:', text);
  });
}

function exportToCSV() {
  const active = store.getActiveList();
  if (!active) return;
  const csv = store.exportCSV(active.id);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `superlista-${active.title.toLowerCase().replace(/\s+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Gerenciador de Listas Modal
function renderListsManager() {
  if (!listsManagerContainer) return;
  const lists = store.getLists();
  const active = store.getActiveList();

  listsManagerContainer.innerHTML = lists.map(l => {
    const isCurrent = active && active.id === l.id;
    return `
      <div class="flex items-center justify-between p-3 rounded-2xl border ${isCurrent ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20' : 'border-slate-100 dark:border-slate-800'}">
        <div class="flex-1 min-w-0 pr-2">
          <div class="flex items-center gap-2">
            <span class="font-bold text-xs truncate">${escapeHtml(l.title)}</span>
            ${isCurrent ? '<span class="text-[10px] font-black uppercase text-rose-500">(Ativa)</span>' : ''}
          </div>
          <span class="text-[11px] opacity-60">${l.items.length} itens ${l.budgetLimit > 0 ? `• Teto: R$ ${l.budgetLimit.toFixed(2).replace('.', ',')}` : ''}</span>
        </div>
        
        <div class="flex items-center gap-1.5">
          ${!isCurrent ? `
            <button class="btn-switch-list px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200" data-id="${l.id}">
              Ativar
            </button>
          ` : ''}
          ${lists.length > 1 ? `
            <button class="btn-delete-list p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs" data-id="${l.id}" title="Excluir Lista">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  listsManagerContainer.querySelectorAll('.btn-switch-list').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      store.switchList(id);
      renderListsManager();
      modalManageLists.classList.add('hidden');
    });
  });

  listsManagerContainer.querySelectorAll('.btn-delete-list').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Deseja realmente excluir esta lista e todos os seus itens?')) {
        store.deleteList(id);
        renderListsManager();
      }
    });
  });
}

// Confetes Efeito
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#f43f5e', '#fb923c', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.8) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.02 + 0.01
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;

    for (const p of particles) {
      if (p.alpha > 0) {
        active = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravidade
        p.alpha -= p.decay;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (active) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(frame);
}

// Toast Notificação
function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'fixed bottom-6 right-6 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 z-50 transition-all duration-300 opacity-0 transform translate-y-4';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove('opacity-0', 'translate-y-4');

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-4');
  }, 2500);
}

// Utilitários de escape e classe
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function getBadgeClass(category) {
  switch (category) {
    case 'Hortifruti': return 'badge-hortifruti';
    case 'Padaria': return 'badge-padaria';
    case 'Carnes & Aves': return 'badge-carnes';
    case 'Laticínios & Ovos': return 'badge-laticinios';
    case 'Mercearia': return 'badge-mercearia';
    case 'Bebidas': return 'badge-bebidas';
    case 'Limpeza & Higiene': return 'badge-limpeza';
    case 'Pet & Bazar': return 'badge-pet';
    default: return 'badge-outros';
  }
}
