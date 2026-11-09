# SuperLista V2 — Especificação e Design do Aplicativo

## 1. Visão Geral e Intenção
A versão anterior (V1 em `lista-de-supermercado`) supriu necessidades básicas de listar itens com preço estimado e marcação no carrinho, porém apresentou limitações estruturais:
1. Permite apenas uma lista única global (sem como separar churrasco, compras da semana, farmácia, etc.).
2. Não possui "Modo Mercado" (tela de foco para uso real andando pelos corredores do mercado com alvos de toque grandes e tela sempre ativa).
3. Sem gestão ativa de orçamento (apenas soma passiva, sem definição de teto de gastos ou alerta de estouro de orçamento).
4. Entrada de dados exclusivamente manual por múltiplos campos, sem suporte a comandos de voz nem autocompletar inteligente com extração de quantidade e unidade.
5. Sem exportação estruturada (apenas texto de WhatsApp, sem backup JSON nem CSV).
6. Sem feedback sonoro agradável ou interações táteis.

A SuperLista V2 resolve todos esses pontos mantendo a facilidade de execução zero-setup (funciona diretamente no navegador ou celular via PWA / arquivo HTML estático).

## 2. Metas (Goals), Não-Metas (Non-Goals) e Anti-Metas
### Goals:
- Gerenciamento de Múltiplas Listas com alternância instantânea e persistência individual.
- Modo Mercado (In-Store Focus Mode): interface otimizada para uso com uma mão, botões grandes, ordenação automática por corredor (Aisle Order), e Wake Lock API para manter a tela do celular acesa.
- Controle Ativo de Orçamento: teto estipulado (budget limit), barra de progresso visual de gastos (verde <80%, amarelo 80-99%, vermelho >=100%), e suporte a preço estimado vs. preço real pago na gôndola.
- Smart Quick-Add e Voice Parser: reconhecimento de texto/voz que converte "3 kg de alcatra" ou "2 caixas de leite" em `{ name: "Alcatra", qty: 3, unit: "kg" }`.
- Exportação e Backup: exportação para WhatsApp estilizada, exportação/importação de backup em JSON, exportação para CSV/Planilha e impressão.
- Efeitos Sonoros com Web Audio API nativo (sintetizador puro sem arquivos externos pesados) e comemoração de lista concluída.
- Testes unitários automatizados com `node:test` para todo o núcleo de regras de negócio.

### Non-Goals:
- Servidor backend centralizado com banco de dados relacional e login de usuário (o app prioriza privacidade total, offline-first e zero custo/dependência externa com LocalStorage).

### Anti-Goals:
- Complexidade desnecessária de build ou bundlers que impeçam o usuário de abrir o arquivo `index.html` diretamente em seu navegador.

## 3. Arquitetura Técnica
- **`js/store.mjs`**: Núcleo de estado reativo, cálculos financeiros, agrupamento por corredores, persistência no LocalStorage, importação e exportação.
- **`js/parser.mjs`**: Interpretador inteligente de linguagem natural para itens, identificando quantidade, unidade e categoria sugerida.
- **`js/audio.mjs`**: Síntese de áudio leve via Web Audio API (pop sutil ao marcar, acorde harmônico ao concluir lista).
- **`js/app.mjs`**: Controlador de interface, binding de eventos, modal de gerenciamento de listas, modo mercado e integração com Web Speech / Wake Lock APIs.
- **`tests/*.test.mjs`**: Bateria de testes automatizados com o Node.js Test Runner.
- **`index.html` + `style.css`**: Interface moderna, mobile-first, com suporte a temas (Sunset, Noturno, Esmeralda, Violeta e Alta Acessibilidade).
