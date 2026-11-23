# SuperLista Pro (V2) 🛒✨

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

## 🚀 Como Executar

A aplicação é puramente estática e moderna (zero build tools necessários):

1. **Abrir no navegador**: Dê um duplo clique no arquivo [`index.html`](index.html) em qualquer navegador moderno (Chrome, Edge, Safari, Firefox).
2. **Servidor local (recomendado)**: necessário para o modo offline/instalação (Service Worker não funciona em `file://`):
   ```bash
   npx serve .
   ```

---

## 🧪 Testes Automatizados (TDD)

O núcleo da aplicação foi desenvolvido seguindo estritamente Test-Driven Development (TDD) com o Node.js Test Runner nativo:

```bash
node --test tests/*.test.mjs
```

### Cobertura dos Testes:
- **`tests/parser.test.mjs`**: Numerais com vírgula/ponto e por extenso, unidades faladas, meia dúzia, preço embutido, quantidade no final e categorização por núcleo do nome.
- **`tests/store.test.mjs`**: Múltiplas listas (criar, duplicar, desmarcar), orçamento e previsão, mesclagem de duplicados, remover/desfazer, agrupamento por corredores, exportação WhatsApp/CSV e importação de backup com higienização.

---

## 📁 Estrutura de Arquivos

```text
superlista-v2/
├── index.html                   # Estrutura HTML5 moderna com Modo Mercado
├── style.css                    # Estilos CSS, temas visuais e animações
├── js/
│   ├── store.mjs                # Estado reativo, orçamento, persistência e exportação
│   ├── parser.mjs               # Interpretador de linguagem natural e voz
│   ├── audio.mjs                # Sintetizador sonoro puro via Web Audio API
│   ├── format.mjs               # Formatação pt-BR (R$, quantidades) e normalização de texto
│   └── app.mjs                  # Controlador da UI, eventos, Wake Lock e Speech API
├── sw.js                        # Service Worker (funcionamento offline)
├── manifest.webmanifest         # Manifesto PWA (instalar na tela inicial)
├── icon.svg                     # Ícone do app
├── tests/
│   ├── store.test.mjs           # Bateria de testes do store
│   └── parser.test.mjs          # Bateria de testes do parser
├── docs/
│   ├── superpowers/specs/       # Especificação técnica do projeto
│   └── superpowers/plans/       # Plano de implementação executado
├── COMPARISON.md                # Comparativo detalhado V1 vs V2
└── README.md                    # Este arquivo
```
