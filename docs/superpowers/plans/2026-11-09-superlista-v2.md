# SuperLista V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o SuperLista V2, uma versão profundamente aprimorada da aplicação de supermercado com suporte a múltiplas listas, modo mercado imersivo com corredor, teto orçamentário ativo, parser inteligente de texto/voz, síntese de áudio, import/export de backup e testes automatizados.

**Architecture:** Arquitetura desacoplada e modular baseada em ES Modules com zero dependências de build. O `store.mjs` concentra o gerenciamento do estado, cálculos de orçamento e corredores testáveis unitariamente via Node.js; `parser.mjs` extrai nomes, quantidades e categorias de comandos rápidos; `audio.mjs` sintetiza efeitos sonoros na Web Audio API; e `app.mjs` com `index.html` fornece a UI responsiva com Wake Lock API.

**Tech Stack:** HTML5, CSS3 moderno com Tailwind CSS CDN, ES Modules (JavaScript moderno), Web Speech API, Screen Wake Lock API, Web Audio API, LocalStorage, e Node.js `node:test` para TDD.

**Spec:** `docs/superpowers/specs/2026-11-09-superlista-v2-spec.md`

## Global Constraints
- Zero build tools obrigatórios para o usuário final: o app deve funcionar com abertura direta no navegador ou servidor local.
- Compatibilidade com Node 22+ para execução dos testes unitários através de `node --test`.
- Persistência 100% offline-first com `localStorage` e mecanismo seguro de migração/backup JSON.
- Acessibilidade e responsividade mobile-first completa com suporte a temas visuais.

## Review Focus
1. Lista vazia ou corrompida no `localStorage` deve recuperar graciosamente com estado padrão sem travar a interface.
2. Entrada com formatos complexos de quantidade ("1,5kg de carne moída", "2x sabonete", "café") deve ser corretamente sanitizada pelo parser.
3. Exceder o teto orçamentário deve disparar alertas visuais claros (estado de perigo) sem bloquear adições de itens.
4. O Modo Mercado deve funcionar mesmo se o navegador não suportar a Wake Lock API (com fallback silencioso).
5. A exportação/importação de dados deve validar schemas JSON para evitar injeção de estados inválidos.

---

### Task 1: Parser Inteligente de Linguagem Natural (TDD)

**Files:**
- Create: `js/parser.mjs`
- Test: `tests/parser.test.mjs`

**Interfaces:**
- Produces: `parseItemInput(text: string) -> { name: string, qty: number, unit: string, category: string }`

- [ ] **Step 1: Write the failing test**
Create `tests/parser.test.mjs` testando extração de quantidade decimal com vírgula ou ponto, unidades (kg, g, L, ml, un, pct), nomes limpos e categorização automática inteligente.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/parser.test.mjs`
Expected: FAIL with module not found or function not implemented.

- [ ] **Step 3: Implement `parseItemInput` in `js/parser.mjs`**
Implement regex and category dictionary mapping keywords (e.g. leite -> Laticínios, tomate -> Hortifruti, carne -> Carnes & Aves).

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/parser.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**
`git add js/parser.mjs tests/parser.test.mjs && git commit -m "feat(parser): add natural language grocery input parser with tests"`

---

### Task 2: Core Store e Gerenciamento de Estado Reativo (TDD)

**Files:**
- Create: `js/store.mjs`
- Test: `tests/store.test.mjs`

**Interfaces:**
- Consumes: `parseItemInput` (from `js/parser.mjs`)
- Produces: `ListStore` class com métodos:
  - `createList(title: string, budgetLimit?: number)`
  - `switchList(listId: string)`
  - `addItem(listId: string, itemData)`
  - `toggleItem(listId: string, itemId: string)`
  - `updateItem(listId: string, itemId: string, updates)`
  - `deleteItem(listId: string, itemId: string)`
  - `getMetrics(listId: string) -> { totalItems, checkedItems, progressPercent, totalEstimated, totalActual, budgetLimit, budgetPercent, isOverBudget }`
  - `getItemsGroupedByAisle(listId: string) -> Array<{ aisle: string, items: Array }>`
  - `exportJSON() -> string`
  - `importJSON(jsonString: string) -> boolean`
  - `exportWhatsApp(listId: string) -> string`
  - `exportCSV(listId: string) -> string`

- [ ] **Step 1: Write the failing test**
Create `tests/store.test.mjs` testando criação de múltiplas listas, alternância, métricas de orçamento com teto, agrupamento por corredores e exportações.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/store.test.mjs`
Expected: FAIL with module not found or method not implemented.

- [ ] **Step 3: Implement `ListStore` in `js/store.mjs`**
Implement state model, storage adapter, calculations and aisle sorting logic.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/store.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**
`git add js/store.mjs tests/store.test.mjs && git commit -m "feat(store): add multi-list store with budget tracking, aisle grouping and export tools"`

---

### Task 3: Síntese de Efeitos Sonoros e Feedback Sensorial

**Files:**
- Create: `js/audio.mjs`

**Interfaces:**
- Produces: `SoundEffects` object com métodos:
  - `playCheck()` (som harmônico curto de clique positivo)
  - `playUncheck()` (som sutil descendente)
  - `playCelebration()` (arpeggio alegre ao concluir 100% da lista)
  - `playWarning()` (som discreto de atenção ao atingir teto de orçamento)
  - `toggleMute()` / `isMuted()`

- [ ] **Step 1: Implement Web Audio API synthesizers in `js/audio.mjs`**
Construct pure Web Audio oscillators with graceful fallback for environments without AudioContext.

- [ ] **Step 2: Verify audio module syntax and exports**
Run: `node --check js/audio.mjs`
Expected: PASS (syntax valid)

- [ ] **Step 3: Commit**
`git add js/audio.mjs && git commit -m "feat(audio): add web audio synthesis for check, celebration and budget warnings"`

---

### Task 4: Interface do Usuário e Modo Mercado (HTML, CSS e App Controller)

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `js/app.mjs`

**Interfaces:**
- Consumes: `ListStore` (from `js/store.mjs`), `parseItemInput` (from `js/parser.mjs`), `SoundEffects` (from `js/audio.mjs`)
- Produces: Web App completo com:
  - Seletor e gerenciador de múltiplas listas (criar, renomear, excluir)
  - Barra de progresso com alerta visual dinâmico de orçamento (teto de gastos)
  - Input inteligente com comando de voz (Web Speech API) e sugestões rápidas
  - Modo Mercado em tela cheia com grandes botões de toque e Screen Wake Lock
  - Modal de importação/exportação (WhatsApp, CSV, backup JSON)
  - Confetes comemorativos e alternância de temas visuais

- [ ] **Step 1: Create `style.css` with responsive layout, custom theme palettes, high contrast and animation styles**
- [ ] **Step 2: Create `index.html` with semantic structure, modals, quick-add bar, and dedicated Shopping Mode overlay**
- [ ] **Step 3: Create `js/app.mjs` binding all UI interactions to store, audio, speech recognition, and wake lock**
- [ ] **Step 4: Run syntax check and integration smoke check on scripts**
Run: `node --check js/app.mjs`
Expected: PASS

- [ ] **Step 5: Commit**
`git add index.html style.css js/app.mjs && git commit -m "feat(ui): implement modern UI with shopping mode, budget alerts and voice input"`

---

### Task 5: Documentação e Comparativo Detalhado V1 vs V2

**Files:**
- Create: `README.md`
- Create: `COMPARISON.md`

- [ ] **Step 1: Write `README.md` documenting installation, feature guide and architecture**
- [ ] **Step 2: Write `COMPARISON.md` highlighting side-by-side evolution from V1 (`lista-de-supermercado`) to V2 (`superlista-v2`)**
- [ ] **Step 3: Commit**
`git add README.md COMPARISON.md docs/ && git commit -m "docs: add comprehensive readme and v1 vs v2 detailed comparison matrix"`
