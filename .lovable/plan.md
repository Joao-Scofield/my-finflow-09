# Redesign visual + otimização de desempenho

## Novo visual: Emerald Prestige

Identidade nova aplicada em todas as páginas (Painel, Saldos, Frota, Lista, Login):

- **Cores**: verde esmeralda profundo como base, verde médio como primária e dourado como acento (destaques, valores, badges). Fundo claro creme e modo escuro esmeralda-escuro, ambos com bom contraste.
- **Tipografia**: Libre Baskerville nos títulos (ar sério, financeiro) e IBM Plex Sans no corpo/números. Números tabulares para alinhar valores em tabelas.
- **Textura**: cards com bordas suaves, sombra discreta em camadas, gradiente sutil nos cards de destaque e linha dourada fina nos títulos de seção.

## Layout bento no Painel

Reorganização da home em uma grade bento (cards de tamanhos diferentes) em vez de blocos empilhados iguais:

- Faixa superior: saldo total em card grande com gradiente, receitas e despesas em cards menores ao lado.
- Bloco central: despesas por categoria (maior) + receitas por categoria e métodos de pagamento em cards menores.
- Comparativo mensal em card largo, tabela de transações em card full-width.
- No celular a grade vira coluna única com a mesma ordem de prioridade.

As páginas Saldos, Frota e Lista recebem os mesmos cards, cabeçalho e espaçamentos para ficarem coerentes.

## Otimização

Foco nos dois pontos citados: abertura inicial lenta e troca de abas/mês lenta.

- **Carregamento inicial**: buscar os dados do usuário em paralelo (hoje várias consultas acontecem em sequência), mostrar o painel assim que os dados essenciais chegam e carregar o resto em segundo plano. Fontes carregadas via `<link>` com `preconnect` e `display=swap` para não bloquear a pintura.
- **Troca de mês/abas**: memorizar os agrupamentos por mês uma única vez (índice mês → transações) em vez de refiltrar a lista inteira a cada mudança; mesma ideia nos gráficos, que hoje recalculam tudo a cada render.
- **Navegação entre páginas**: pré-carregar a rota ao passar o mouse/tocar no item do menu, para a troca ser instantânea.
- Manter skeletons e lazy loading já existentes, ajustando-os ao visual novo.

## Detalhes técnicos

- `src/styles.css`: substituir os tokens `:root` e `.dark` por paleta oklch derivada de #064e3b / #0d7a5f / #c9a84c / #f5f0e0, novos `--chart-1..8` harmonizados, tokens `--font-display`/`--font-sans` em `@theme`, e utilitários para gradiente/sombra do bento.
- `src/routes/__root.tsx`: `<link>` do Google Fonts (Libre Baskerville + IBM Plex Sans) em `head().links` com preconnect.
- `src/routes/index.tsx`: reestruturar o `<main>` em `grid` bento (`lg:grid-cols-6` com `col-span` variados), extrair o cabeçalho compartilhado para `src/components/layout/AppHeader.tsx` e reutilizar em saldos/frota/lista; `preload="intent"` nos `<Link>`.
- `src/components/finance/SummaryCards.tsx` e `Charts.tsx`: variantes de card (destaque/normal) e paleta nova nos gráficos.
- `src/lib/finance-store.tsx`: paralelizar as consultas iniciais com `Promise.all`, expor um índice `transactionsByMonth` memoizado; sem mudança de schema nem de regras de negócio.
