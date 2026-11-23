# SuperLista Pro (V2) 🛒✨

**▶ Acesse o app:** https://jao0097.github.io/guilhermedevito/ · 📄 [Relatório das etapas 8 a 11](docs/RELATORIO.md)

Uma evolução completa da aplicação de lista de supermercado, projetada para velocidade, controle financeiro ativo e excelente usabilidade mobile durante as compras no supermercado.

---

## 🌟 Principais Recursos e Novidades

1. 🗂️ **Múltiplas Listas**: Crie, renomeie e alterne entre listas dedicadas (ex: *Compras da Semana*, *Churrasco com Amigos*, *Farmácia & Higiene*, *Mensal*).
2. 🎯 **Modo Mercado (In-Store Focus Mode)**:
   - Interface imersiva de toque único com botões e cartões gigantes para uso com uma mão.
   - **Screen Wake Lock API**: Mantém a tela do celular sempre acesa enquanto você anda pelos corredores do mercado.
   - Ordenação automática pelo fluxo real dos corredores de supermercado.
3. 💰 **Teto de Gastos e Orçamento Dinâmico**:
   - Defina um limite financeiro para cada lista.
   - Alertas visuais e sonoros: verde (dentro do teto), amarelo (alerta de 80%) e vermelho (estourou o orçamento).
   - Acompanhamento do gasto real no caixa vs. preço estimado.
4. 🎙️ **Parser Inteligente e Entrada por Voz**:
   - Reconhecimento de voz (Web Speech API pt-BR): fale *"2 quilos de tomate"* ou *"3 caixas de leite"*.
   - Interpretação inteligente em tempo real de quantidade, fração/decimal, unidade de medida (`kg`, `g`, `L`, `un`, `pct`, `cx`, `dz`) e classificação automática no corredor correto.
5. ⚡ **Sugestões Rápidas (Chips)**: Toque nos produtos mais populares para preenchimento com 1 clique (Pão, Leite, Café, Ovos, Arroz, Feijão, Banana, Detergente).
6. 🔊 **Síntese de Áudio Tátil (Web Audio API)**:
   - Som harmônico sutil ao marcar itens, som descendente ao desmarcar, alerta de teto e fanfarra de vitória com chuva de confetes ao completar 100%.
   - Botão para silenciar/ativar com persistência.
7. 📦 **Exportação & Backup Completo**:
   - Cópia formatada para WhatsApp organizada por corredores e totais.
   - Exportação para planilha CSV.
   - Visualização otimizada para impressão em folha de papel.
   - Backup e Restauração completos em formato JSON.
8. 🎨 **5 Temas Visuais Modernos**: Pôr do Sol (Sunset), Esmeralda (Mercado Fresh), Nórdico (Clean), Violeta e Escuro OLED.

---

## 🆕 Novidades da versão 2.1

- 🗣️ **Parser entende fala natural**: *"dois quilos de tomate"*, *"meia dúzia de ovos"* (vira 6 un), *"3 caixas de leite"*, *"meio quilo de carne moída"*, *"Sabonete x3"* e preço junto: *"café R$ 18,90"*.
- 🧠 **Categorias mais espertas**: prioriza o núcleo do nome — *"Suco de laranja"* é Bebida, *"Água sanitária"* é Limpeza, *"Molho de tomate"* é Mercearia — e entende plurais (*"Tomates"*).
- ➕ **Sem duplicados**: adicionar "leite" de novo soma a quantidade no item pendente existente.
- 📋 **Vários itens de uma vez**: separe por `;` ou nova linha, ou fale *"arroz e feijão e café"*.
- ↩️ **Desfazer** ao excluir item, limpar comprados, adicionar ou restaurar backup.
- 🏷️ **Preço no caixa direto do Modo Mercado**: toque no preço do item, digite o valor da etiqueta (unitário ou total) e ele já é marcado como pego.
- 📈 **Previsão da compra**: mostra quanto a compra vai custar no total (carrinho + pendentes) e avisa *antes* de estourar o teto.
- ✅ **Concluir compra com escolha**: desmarcar tudo para reusar a lista, remover os comprados ou manter.
- 📑 **Renomear e duplicar listas** (ótimo para a lista do mês).
- 📴 **Funciona offline (PWA)**: instalável na tela inicial e com cache via Service Worker — mercado costuma ter sinal ruim.
- 🌙 **Tema escuro corrigido**: os componentes seguem o tema escolhido no app, não o do sistema operacional.
- 🔒 **Backup seguro**: dados importados são validados e higienizados (sem injeção de HTML), e o CSV abre certo no Excel pt-BR (vírgula decimal, proteção contra fórmulas).
- ♿ **Acessibilidade**: itens são botões reais (teclado/leitor de tela), `Esc` fecha modais, `/` foca o campo de adicionar, zoom liberado, respeita "reduzir movimento".

---

## 🆕 Novidades da versão 2.2 (UI/UX e publicação)

- 📱 **Layout mobile-first**: cabeçalho compacto, botão fixo **"Ir ao mercado"** ao alcance do polegar, alvos de toque ≥ 44 px.
- 🎨 Menu **"Mais"** com temas por amostras de cor; contraste de todos os temas ajustado para ≥ 4,5:1.
- 📦 **Zero CDNs**: Tailwind compilado e Font Awesome/fonte servidos de `vendor/`. O app inteiro funciona offline.
- 🧪 **35 testes de ponta a ponta** (Playwright) cobrindo todos os botões, formulários, 5 tamanhos de tela e modo offline.

Capturas de antes e depois em [`docs/RELATORIO.md`](docs/RELATORIO.md).

---

## 🚀 Como Executar

- **Online**: https://jao0097.github.io/guilhermedevito/ (instalável no celular, funciona offline).
- **Local**: sirva a pasta com qualquer servidor estático (o Service Worker não funciona em `file://`):
  ```bash
  npx serve .
  ```
- **Alterou classes do Tailwind no HTML/JS?** Recompile o CSS:
  ```bash
  npm install && npm run build:css
  ```

---

## 🧪 Testes Automatizados

```bash
npm test            # 22 testes unitários (Node.js Test Runner)
npm run test:e2e    # 35 testes de ponta a ponta no navegador (Playwright)
```

Para outros navegadores: `npx playwright install firefox webkit` e depois `BROWSER=firefox npm run test:e2e` ou `BROWSER=webkit npm run test:e2e`.

- **`tests/parser.test.mjs`**: unidades faladas, números por extenso, meia dúzia, preço embutido e categorização.
- **`tests/store.test.mjs`**: listas, orçamento e previsão, duplicados, desfazer, exportações e higienização de backup.
- **`tests/e2e/run.cjs`**: todos os botões e formulários, validações, modais, Modo Mercado, temas, teclado, responsividade (320 px a 1440 px) e offline.

---

## 📁 Estrutura de Arquivos

```text
├── index.html                # Página do app
├── manifest.webmanifest      # PWA (instalar na tela inicial)
├── sw.js                     # Service Worker (offline)
├── css/                      # tailwind.css (compilado), style.css (temas e tokens)
├── js/
│   ├── app.mjs               # Controlador da UI, eventos, Wake Lock e voz
│   ├── store.mjs             # Estado, listas, orçamento, persistência e exportação
│   ├── parser.mjs            # Linguagem natural e voz
│   ├── format.mjs            # Formatação pt-BR (R$, quantidades)
│   ├── ui.mjs                # Toast, confete, escape de HTML
│   └── audio.mjs             # Sons via Web Audio API
├── assets/icon.svg
├── vendor/                   # Font Awesome 6.5.1 e Plus Jakarta Sans (licenças incluídas)
├── tests/                    # Unitários + E2E
└── docs/                     # Relatório, capturas, especificação, plano e comparativo V1×V2
```
