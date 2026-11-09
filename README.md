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

## 🚀 Como Executar

A aplicação é puramente estática e moderna (zero build tools necessários):

1. **Abrir no navegador**: Dê um duplo clique no arquivo [`index.html`](index.html) em qualquer navegador moderno (Chrome, Edge, Safari, Firefox).
2. **Servidor local (opcional)**: Você também pode usar a extensão *Live Server* ou rodar:
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
- **`tests/parser.test.mjs`**: Validação de regex, numerais com vírgula/ponto, unidades de medida e categorização semântica.
- **`tests/store.test.mjs`**: Ciclo de vida de múltiplas listas, cálculos de orçamento e teto, agrupamento por corredores, exportação WhatsApp/CSV e migração de backup JSON.

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
│   └── app.mjs                  # Controlador da UI, eventos, Wake Lock e Speech API
├── tests/
│   ├── store.test.mjs           # Bateria de testes do store
│   └── parser.test.mjs          # Bateria de testes do parser
├── docs/
│   ├── superpowers/specs/       # Especificação técnica do projeto
│   └── superpowers/plans/       # Plano de implementação executado
├── COMPARISON.md                # Comparativo detalhado V1 vs V2
└── README.md                    # Este arquivo
```
