/**
 * SuperLista - Testes de ponta a ponta (E2E) com Playwright
 *
 * Exercita todos os botões, formulários e fluxos da aplicação num navegador real.
 * Uso:
 *   npm run test:e2e                  (Chromium)
 *   BROWSER=firefox npm run test:e2e  (requer `npx playwright install firefox`)
 *   BROWSER=webkit  npm run test:e2e  (motor do Safari)
 *   BASE_URL=https://jao0097.github.io/guilhermedevito/ npm run test:e2e  (testa o site publicado)
 */
const { chromium, firefox, webkit, devices } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

const ROOT = path.resolve(__dirname, '..', '..');
const ENGINE = { chromium, firefox, webkit }[process.env.BROWSER || 'chromium'];
const MIME = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.json': 'application/json' };

// Servidor estático mínimo (o app não precisa de backend)
function startServer() {
  const server = http.createServer((req, res) => {
    let file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (file.endsWith(path.sep) || file.endsWith('/')) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, () => resolve(server)));
}

const results = [];
async function test(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`  ✔ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  ✘ ${name}\n      ${String(err.message).split('\n').join('\n      ')}`);
  }
}

(async () => {
  const server = process.env.BASE_URL ? null : await startServer();
  const BASE = process.env.BASE_URL || `http://localhost:${server.address().port}/`;
  const browser = await ENGINE.launch();
  console.log(`\nSuperLista E2E — ${process.env.BROWSER || 'chromium'} — ${BASE}\n`);

  // Cria uma página limpa (sem dados salvos) e coleta erros de JS e de rede
  async function freshPage(contextOptions = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...contextOptions });
    const page = await context.newPage();
    page.setDefaultTimeout(5000); // falha rápido se um elemento não existir
    page.problems = [];
    page.on('pageerror', e => page.problems.push(`Erro JS: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') page.problems.push(`console.error: ${m.text()}`); });
    page.on('requestfailed', r => page.problems.push(`Falha de rede: ${r.url()}`));
    page.on('response', r => { if (r.status() >= 400) page.problems.push(`HTTP ${r.status()}: ${r.url()}`); });
    // Respostas pré-programadas para confirm/prompt/alert
    page.dialogAnswers = [];
    page.dialogLog = [];
    page.on('dialog', d => {
      page.dialogLog.push({ type: d.type(), message: d.message() });
      const next = page.dialogAnswers.shift();
      if (next === false) d.dismiss(); else d.accept(next === true || next === undefined ? undefined : next);
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    return page;
  }

  const itemNames = page => page.$$eval('#items-container .item-title', els => els.map(e => e.textContent.trim()));
  const toastText = page => page.textContent('#app-toast');
  const addText = async (page, text) => { await page.fill('#item-quick-input', text); await page.press('#item-quick-input', 'Enter'); };
  const isHidden = (page, sel) => page.$eval(sel, el => el.classList.contains('hidden') || getComputedStyle(el).display === 'none');

  // ---------------------------------------------------------------- Carregamento
  console.log('Carregamento e navegação');
  await test('abre sem erros de JavaScript nem recursos quebrados (tudo local, sem CDN)', async () => {
    const page = await freshPage();
    await page.waitForTimeout(300);
    assert.deepEqual(page.problems, []);
    const external = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(u => !u.startsWith(location.origin)));
    assert.deepEqual(external, [], 'Não deve depender de servidores externos');
    assert.equal(await page.title(), 'SuperLista Pro — Lista de Compras Inteligente');
    await page.context().close();
  });

  await test('fontes e ícones carregam de verdade', async () => {
    const page = await freshPage();
    const fonts = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family); });
    assert.ok(fonts.some(f => f.includes('Plus Jakarta Sans')), 'fonte principal');
    assert.ok(fonts.some(f => f.includes('Font Awesome')), 'ícones');
    await page.context().close();
  });

  await test('todo botão tem nome acessível (texto, aria-label ou title)', async () => {
    const page = await freshPage();
    const unnamed = await page.$$eval('button', btns => btns.filter(b => !(b.textContent.trim() || b.getAttribute('aria-label') || b.getAttribute('title'))).map(b => b.outerHTML.slice(0, 80)));
    assert.deepEqual(unnamed, []);
    const ids = await page.$$eval('[id]', els => els.map(e => e.id));
    assert.equal(new Set(ids).size, ids.length, 'IDs duplicados no HTML');
    await page.context().close();
  });

  // ---------------------------------------------------------------- Formulário de adicionar
  console.log('\nFormulário de adicionar itens');
  await test('campo vazio não adiciona nada (validação "required")', async () => {
    const page = await freshPage();
    const before = (await itemNames(page)).length;
    await page.click('#quick-add-form button[type=submit]');
    assert.equal((await itemNames(page)).length, before);
    assert.equal(await page.$eval('#item-quick-input', el => el.validity.valueMissing), true);
    await addText(page, '    ');
    assert.equal((await itemNames(page)).length, before, 'só espaços também não adiciona');
    await page.context().close();
  });

  await test('interpreta linguagem natural e mostra prévia antes de adicionar', async () => {
    const page = await freshPage();
    await page.fill('#item-quick-input', 'dois quilos de tomate R$ 6,90');
    const preview = (await page.textContent('#parse-preview')).replace(/\s+/g, ' ');
    assert.match(preview, /Tomate • 2 kg • Hortifruti/);
    assert.match(preview, /R\$ 6,90/);
    await page.press('#item-quick-input', 'Enter');
    assert.ok((await itemNames(page)).includes('Tomate'));
    assert.equal(await page.inputValue('#item-quick-input'), '', 'campo limpo após adicionar');
    await page.context().close();
  });

  await test('item repetido soma quantidade em vez de duplicar', async () => {
    const page = await freshPage();
    await addText(page, '2 kg tomate');
    await addText(page, '1 kg de tomate');
    assert.equal((await itemNames(page)).filter(n => n === 'Tomate').length, 1);
    assert.match(await toastText(page), /agora 3 kg/);
    await page.context().close();
  });

  await test('vários itens de uma vez separados por ";"', async () => {
    const page = await freshPage();
    await addText(page, 'Água sanitária; 3 caixas de leite; pão de queijo');
    const names = await itemNames(page);
    for (const n of ['Água sanitária', 'Leite', 'Pão de queijo']) assert.ok(names.includes(n), n);
    assert.match(await toastText(page), /3 itens adicionados/);
    await page.context().close();
  });

  await test('painel "Detalhes": ajuste manual de quantidade, preço e corredor é respeitado', async () => {
    const page = await freshPage();
    await page.click('#btn-toggle-details');
    assert.equal(await page.getAttribute('#btn-toggle-details', 'aria-expanded'), 'true');
    await page.fill('#item-quick-input', 'Caderno');
    await page.fill('#detail-qty', '4');
    await page.fill('#detail-price', '12,5');
    await page.selectOption('#detail-category', 'Pet & Bazar');
    await page.fill('#item-quick-input', 'Caderno espiral'); // digitar de novo não apaga o ajuste manual
    assert.equal(await page.inputValue('#detail-qty'), '4');
    await page.press('#item-quick-input', 'Enter');
    const card = page.locator('.item-card', { hasText: 'Caderno espiral' });
    await assert.doesNotReject(card.waitFor());
    assert.match(await card.textContent(), /4 un/);
    assert.match(await card.textContent(), /R\$ 50,00/);
    assert.match(await card.textContent(), /Pet & Bazar/);
    assert.equal(await page.inputValue('#detail-qty'), '1', 'detalhes resetados para o próximo item');
    await page.context().close();
  });

  await test('chips de sugestão adicionam com um toque', async () => {
    const page = await freshPage();
    await page.click('.suggestion-chip[data-item="Feijão Carioca 1kg"]');
    assert.ok((await itemNames(page)).includes('Feijão Carioca 1kg'));
    await page.context().close();
  });

  await test('desfazer remove o item recém-adicionado', async () => {
    const page = await freshPage();
    await addText(page, 'Item de teste');
    await page.click('#app-toast button');
    assert.ok(!(await itemNames(page)).includes('Item de teste'));
    await page.context().close();
  });

  // ---------------------------------------------------------------- Lista
  console.log('\nLista de itens');
  await test('marcar/desmarcar atualiza contadores, barra e aria-pressed', async () => {
    const page = await freshPage();
    const before = Number(await page.textContent('#metric-checked-count'));
    const btn = page.locator('.btn-toggle-check', { hasText: 'Banana Prata' });
    await btn.click();
    assert.equal(Number(await page.textContent('#metric-checked-count')), before + 1);
    assert.equal(await page.locator('.btn-toggle-check', { hasText: 'Banana Prata' }).getAttribute('aria-pressed'), 'true');
    await page.locator('.btn-toggle-check', { hasText: 'Banana Prata' }).click();
    assert.equal(Number(await page.textContent('#metric-checked-count')), before);
    await page.context().close();
  });

  await test('excluir item e desfazer devolve na mesma posição', async () => {
    const page = await freshPage();
    const before = await itemNames(page);
    await page.locator('.item-card', { hasText: 'Arroz' }).locator('.btn-delete-item').click();
    assert.ok(!(await itemNames(page)).includes('Arroz Tipo 1 (5kg)'));
    await page.click('#app-toast button');
    assert.deepEqual(await itemNames(page), before);
    await page.context().close();
  });

  await test('abas Todos/Pendentes/No Carrinho filtram corretamente', async () => {
    const page = await freshPage();
    await page.click('[data-status=checked]');
    assert.deepEqual(await itemNames(page), ['Leite Integral']);
    assert.equal(await page.getAttribute('[data-status=checked]', 'aria-selected'), 'true');
    await page.click('[data-status=pending]');
    assert.ok(!(await itemNames(page)).includes('Leite Integral'));
    await page.click('[data-status=all]');
    assert.equal((await itemNames(page)).length, 4);
    await page.context().close();
  });

  await test('busca ignora acentos e mostra estado vazio quando não acha', async () => {
    const page = await freshPage();
    await addText(page, 'Feijão preto');
    await page.fill('#search-input', 'feijao');
    assert.deepEqual(await itemNames(page), ['Feijão preto']);
    await page.fill('#search-input', 'xyzxyz');
    assert.equal(await isHidden(page, '#empty-state'), false);
    assert.match(await page.textContent('#empty-state-title'), /Nenhum item encontrado/);
    await page.context().close();
  });

  await test('alternar visão por corredor / lista plana', async () => {
    const page = await freshPage();
    assert.ok((await page.$$('#items-container section')).length > 1);
    await page.click('#btn-toggle-view-mode');
    assert.equal(await page.textContent('#view-mode-label'), 'Lista Plana');
    assert.equal((await page.$$('#items-container section')).length, 0);
    await page.context().close();
  });

  await test('limpar comprados remove só os marcados, com desfazer', async () => {
    const page = await freshPage();
    await page.click('#btn-clear-checked');
    assert.ok(!(await itemNames(page)).includes('Leite Integral'));
    assert.equal((await itemNames(page)).length, 3);
    await page.click('#app-toast button');
    assert.equal((await itemNames(page)).length, 4);
    await page.context().close();
  });

  // ---------------------------------------------------------------- Edição
  console.log('\nFormulário de edição e modais');
  await test('editar item: nome obrigatório, salva preço com vírgula e preço real vazio = estimado', async () => {
    const page = await freshPage();
    await page.locator('.item-card', { hasText: 'Detergente' }).locator('.btn-edit-item').click();
    assert.equal(await isHidden(page, '#modal-edit-item'), false);
    await page.fill('#edit-item-name', '');
    await page.click('#form-edit-item button[type=submit]');
    assert.equal(await isHidden(page, '#modal-edit-item'), false, 'não fecha com nome vazio');
    await page.fill('#edit-item-name', 'Detergente Ypê');
    await page.fill('#edit-item-est-price', '3,10');
    await page.fill('#edit-item-act-price', '');
    await page.fill('#edit-item-notes', 'Limão');
    await page.click('#form-edit-item button[type=submit]');
    assert.equal(await isHidden(page, '#modal-edit-item'), true);
    const card = page.locator('.item-card', { hasText: 'Detergente Ypê' });
    assert.match(await card.textContent(), /R\$ 6,20/); // 2 un × 3,10
    assert.match(await card.textContent(), /Limão/);
    await page.context().close();
  });

  await test('modais fecham pelo X, por Esc, por clique no fundo e por Cancelar', async () => {
    const page = await freshPage();
    const open = () => page.locator('.btn-edit-item').first().click();
    await open(); await page.click('#modal-edit-item .modal-close-btn >> nth=0');
    assert.equal(await isHidden(page, '#modal-edit-item'), true, 'X');
    await open(); await page.keyboard.press('Escape');
    assert.equal(await isHidden(page, '#modal-edit-item'), true, 'Esc');
    await open(); await page.mouse.click(5, 5);
    assert.equal(await isHidden(page, '#modal-edit-item'), true, 'fundo');
    await open(); await page.click('#modal-edit-item button:has-text("Cancelar")');
    assert.equal(await isHidden(page, '#modal-edit-item'), true, 'Cancelar');
    await page.context().close();
  });

  await test('teto de gastos: rejeita valor inválido e aceita "100,50"', async () => {
    const page = await freshPage();
    page.dialogAnswers.push('abc');
    await page.click('#btn-edit-budget-quick');
    assert.match(await toastText(page), /Valor inválido/);
    assert.equal(await page.textContent('#metric-budget-limit'), 'R$ 250,00');
    page.dialogAnswers.push('100,50');
    await page.click('#btn-edit-budget-quick');
    assert.equal(await page.textContent('#metric-budget-limit'), 'R$ 100,50');
    page.dialogAnswers.push('0');
    await page.click('#btn-edit-budget-quick');
    assert.equal(await page.textContent('#metric-budget-limit'), 'Sem teto');
    await page.context().close();
  });

  // ---------------------------------------------------------------- Listas
  console.log('\nGerenciamento de listas');
  await test('criar (nome obrigatório), renomear, duplicar, trocar e excluir listas', async () => {
    const page = await freshPage();
    await page.click('#btn-manage-lists');
    await page.click('#form-create-list button[type=submit]');
    assert.equal(await page.$eval('#new-list-title', el => el.validity.valueMissing), true, 'nome obrigatório');
    await page.fill('#new-list-title', 'Churrasco');
    await page.fill('#new-list-budget', '300,00');
    await page.click('#form-create-list button[type=submit]');
    assert.match(await page.textContent('#list-selector option:checked'), /Churrasco/);
    assert.equal(await page.textContent('#metric-budget-limit'), 'R$ 300,00');

    page.dialogAnswers.push('Churrasco do Sábado');
    await page.locator('#lists-manager-container > div', { hasText: 'Churrasco' }).locator('.btn-rename-list').click();
    assert.match(await page.textContent('#lists-manager-container'), /Churrasco do Sábado/);

    await page.locator('#lists-manager-container > div', { hasText: 'Compras da Semana' }).locator('.btn-duplicate-list').click();
    assert.match(await page.textContent('#list-selector option:checked'), /Compras da Semana \(cópia\)/);
    assert.equal(await page.textContent('#metric-checked-count'), '0', 'cópia vem desmarcada');

    await page.locator('#lists-manager-container > div', { hasText: 'Churrasco do Sábado' }).locator('.btn-switch-list').click();
    assert.match(await page.textContent('#list-selector option:checked'), /Churrasco do Sábado/);

    await page.click('#btn-manage-lists');
    page.dialogAnswers.push(true);
    await page.locator('#lists-manager-container > div', { hasText: 'Churrasco do Sábado' }).locator('.btn-delete-list').click();
    assert.ok(!(await page.textContent('#lists-manager-container')).includes('Churrasco'));
    assert.equal(await page.$$eval('#list-selector option', o => o.length), 2);
    await page.context().close();
  });

  await test('seletor de lista no topo troca a lista ativa', async () => {
    const page = await freshPage();
    await page.click('#btn-manage-lists');
    await page.fill('#new-list-title', 'Farmácia');
    await page.click('#form-create-list button[type=submit]');
    await page.keyboard.press('Escape');
    const firstId = await page.$eval('#list-selector option', o => o.value);
    await page.selectOption('#list-selector', firstId);
    assert.equal((await itemNames(page)).length, 4);
    await page.context().close();
  });

  // ---------------------------------------------------------------- Exportação, backup, tema, som
  console.log('\nMenu, exportação, backup, tema e som');
  await test('WhatsApp copia texto formatado; CSV baixa arquivo; imprimir chama window.print', async () => {
    const page = await freshPage({ permissions: ['clipboard-read', 'clipboard-write'] });
    await page.click('#btn-export-menu');
    assert.equal(await page.getAttribute('#btn-export-menu', 'aria-expanded'), 'true');
    await page.click('#btn-export-whatsapp');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(clip, /\*SuperLista: Compras da Semana\*/);
    assert.match(clip, /Banana Prata - 1,5 kg/);

    await page.click('#btn-export-menu');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export-csv')]);
    assert.equal(download.suggestedFilename(), 'superlista-compras-da-semana.csv');
    const csv = fs.readFileSync(await download.path(), 'utf8');
    assert.match(csv, /"Banana Prata";1,5;kg/);

    await page.evaluate(() => { window.__printed = false; window.print = () => { window.__printed = true; }; });
    await page.click('#btn-export-menu');
    await page.click('#btn-print-list');
    assert.equal(await page.evaluate(() => window.__printed), true);
    await page.context().close();
  });

  await test('backup: baixa .json, recusa JSON inválido e restaura válido (com desfazer)', async () => {
    const page = await freshPage();
    await page.click('#btn-export-menu');
    await page.click('#btn-open-backup-modal');
    const json = await page.inputValue('#backup-json-textarea');
    assert.ok(JSON.parse(json).lists.length >= 1);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btn-download-backup-json')]);
    assert.match(download.suggestedFilename(), /^superlista-backup-\d{4}-\d{2}-\d{2}\.json$/);

    await page.fill('#backup-json-textarea', '{ isso não é json');
    page.dialogAnswers.push(true, undefined);
    await page.click('#btn-restore-backup-json');
    assert.match(page.dialogLog.at(-1).message, /inválido/);

    await page.fill('#backup-json-textarea', JSON.stringify({ lists: [{ id: 'b1', title: 'Restaurada', items: [{ name: 'Item X' }] }] }));
    page.dialogAnswers.push(true);
    await page.click('#btn-restore-backup-json');
    assert.deepEqual(await itemNames(page), ['Item X']);
    await page.click('#app-toast button');
    assert.equal((await itemNames(page)).length, 4, 'desfazer volta os dados anteriores');
    await page.context().close();
  });

  await test('backup malicioso não executa código (proteção contra XSS)', async () => {
    const page = await freshPage();
    await page.click('#btn-export-menu');
    await page.click('#btn-open-backup-modal');
    const evil = '"><img src=x onerror="window.__xss=1">';
    await page.fill('#backup-json-textarea', JSON.stringify({ lists: [{ id: evil, title: evil, items: [{ id: evil, name: evil, notes: evil }] }] }));
    page.dialogAnswers.push(true);
    await page.click('#btn-restore-backup-json');
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__xss), undefined);
    assert.ok((await itemNames(page))[0].includes('<img'), 'texto aparece literalmente');
    await page.context().close();
  });

  await test('temas: aplica, marca o selecionado e persiste após recarregar', async () => {
    const page = await freshPage();
    await page.click('#btn-export-menu');
    await page.click('[data-theme-option=dark]');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);
    assert.equal(await page.getAttribute('[data-theme-option=dark]', 'aria-pressed'), 'true');
    await page.click('[data-theme-option=emerald]');
    assert.equal(await page.getAttribute('body', 'data-theme'), 'emerald');
    await page.click('[data-theme-option=dark]');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.getAttribute('body', 'data-theme'), 'dark');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);
    await page.context().close();
  });

  await test('botão de som alterna e persiste', async () => {
    const page = await freshPage();
    await page.click('#btn-toggle-sound');
    assert.equal(await page.getAttribute('#btn-toggle-sound', 'aria-pressed'), 'false');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.getAttribute('#btn-toggle-sound', 'aria-pressed'), 'false');
    assert.match(await page.getAttribute('#sound-icon', 'class'), /volume-xmark/);
    await page.context().close();
  });

  // ---------------------------------------------------------------- Modo Mercado
  console.log('\nModo Mercado');
  await test('entrar, marcar, informar preço (com validação), ocultar pegos e concluir', async () => {
    const page = await freshPage();
    await page.click('#btn-open-shopping-mode');
    assert.equal(await isHidden(page, '#shopping-mode-overlay'), false);
    assert.match(await page.textContent('#shopping-items-ratio'), /1\/4 pegos/);

    await page.locator('.btn-shop-toggle', { hasText: 'Banana Prata' }).click();
    assert.match(await page.textContent('#shopping-items-ratio'), /2\/4 pegos/);

    await page.locator('.btn-shop-price').filter({ has: page.locator('xpath=..', { hasText: 'Arroz' }) }).first().click();
    await page.fill('#price-input', 'abc');
    await page.click('#form-price button[type=submit]');
    assert.equal(await isHidden(page, '#modal-price'), false, 'preço inválido mantém o modal aberto');
    await page.fill('#price-input', '25,99');
    await page.click('#form-price button[type=submit]');
    assert.equal(await isHidden(page, '#modal-price'), true);
    assert.match(await page.textContent('#shopping-items-ratio'), /3\/4 pegos/, 'informar preço marca como pego');

    await page.click('#btn-shopping-hide-checked');
    assert.equal(await page.$$eval('.shopping-card', c => c.length), 1);
    await page.click('#btn-shopping-hide-checked');

    await page.click('#btn-shopping-finish');
    assert.match(await page.textContent('#finish-summary'), /Total pago/);
    await page.click('#btn-finish-uncheck');
    assert.equal(await isHidden(page, '#shopping-mode-overlay'), true);
    assert.equal(await page.textContent('#metric-checked-count'), '0');
    await page.context().close();
  });

  await test('Esc sai do Modo Mercado; lista vazia não entra', async () => {
    const page = await freshPage();
    await page.click('#btn-open-shopping-mode');
    await page.keyboard.press('Escape');
    assert.equal(await isHidden(page, '#shopping-mode-overlay'), true);
    page.dialogAnswers.push(true);
    await page.evaluate(() => {});
    await page.click('#btn-clear-checked');
    for (const id of await page.$$eval('.btn-delete-item', b => b.map(x => x.dataset.id))) {
      await page.click(`.btn-delete-item[data-id="${id}"]`);
    }
    await page.click('#btn-open-shopping-mode');
    assert.equal(await isHidden(page, '#shopping-mode-overlay'), true);
    assert.match(await toastText(page), /Adicione itens/);
    await page.context().close();
  });

  // ---------------------------------------------------------------- Teclado
  console.log('\nTeclado e acessibilidade');
  await test('atalho "/" foca o campo e Enter/Espaço marcam itens pelo teclado', async () => {
    const page = await freshPage();
    await page.keyboard.press('/');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'item-quick-input');
    await page.focus('.btn-toggle-check >> nth=0');
    const before = await page.textContent('#metric-checked-count');
    await page.keyboard.press('Enter');
    assert.notEqual(await page.textContent('#metric-checked-count'), before);
    await page.context().close();
  });

  // ---------------------------------------------------------------- Responsividade
  console.log('\nResponsividade');
  for (const [label, opts] of [
    ['celular pequeno 320px', { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true }],
    ['Android (Pixel 7)', devices['Pixel 7']],
    ['iPhone 13 (perfil)', devices['iPhone 13']],
    ['tablet 768px', { viewport: { width: 768, height: 1024 } }],
    ['desktop 1440px', { viewport: { width: 1440, height: 900 } }]
  ]) {
    await test(`${label}: sem rolagem horizontal e com botão de Modo Mercado visível`, async () => {
      const { defaultBrowserType, ...ctxOpts } = opts;
      const page = await freshPage(ctxOpts);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `rolagem horizontal de ${overflow}px`);
      const width = page.viewportSize().width;
      const visibleCta = width < 640 ? '#btn-open-shopping-mode-mobile' : '#btn-open-shopping-mode';
      assert.ok(await page.isVisible(visibleCta), `${visibleCta} visível`);
      // Alvos de toque principais com pelo menos 40px de altura
      for (const sel of ['#quick-add-form button[type=submit]', '#btn-export-menu', '#btn-toggle-sound', '#list-selector']) {
        const h = await page.$eval(sel, el => el.getBoundingClientRect().height);
        assert.ok(h >= 40, `${sel} com ${h}px de altura`);
      }
      await page.click(visibleCta);
      assert.equal(await isHidden(page, '#shopping-mode-overlay'), false);
      assert.deepEqual(page.problems, []);
      await page.context().close();
    });
  }

  // ---------------------------------------------------------------- Offline (PWA)
  console.log('\nPWA / offline');
  await test('service worker instala e o app abre sem internet', async () => {
    if ((process.env.BROWSER || 'chromium') !== 'chromium') return; // SW em contexto de teste é estável no Chromium
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: 'networkidle' }); // SW passa a controlar a página
    await context.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.textContent('h1 >> nth=0').then(t => t.includes('SuperLista')), true);
    assert.ok((await itemNames(page)).length > 0, 'lista renderizada offline');
    const iconFont = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some(f => f.family.includes('Font Awesome') && f.status === 'loaded'); });
    assert.ok(iconFont, 'ícones disponíveis offline');
    await context.close();
  });

  // ---------------------------------------------------------------- Resumo
  await browser.close();
  server?.close();
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} testes passaram${failed.length ? ` — ${failed.length} falharam` : ''}\n`);
  process.exit(failed.length ? 1 : 0);
})();
