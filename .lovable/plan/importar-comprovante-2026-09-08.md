# Importar Comprovante

Nova aba no app (ao lado de Painel, Saldos, Frota, Lista) para lançar uma despesa a partir da foto de um comprovante.

## Como vai funcionar

1. **Enviar a foto** — área de upload com clique ou arrastar-e-soltar, aceitando JPG e PNG (limite ~8 MB). Mostra a imagem escolhida imediatamente.
2. **Leitura automática** — a foto é analisada por inteligência artificial (já incluída no plano, sem chave extra) e devolve: data, valor, estabelecimento, descrição sugerida, forma de pagamento e uma sugestão de categoria.
3. **Enquanto processa** — indicador de carregamento sobre a imagem e botão desativado.
4. **Revisar antes de salvar** — a tela fica dividida: à esquerda o comprovante (com zoom ao clicar), à direita o formulário já preenchido e totalmente editável: tipo (despesa/receita), valor, data, descrição, estabelecimento, categoria, subcategoria, conta/saldo e forma de pagamento.
5. **Confirmar e Salvar** — grava a transação normalmente, atualizando saldos e o painel; mostra aviso de sucesso e limpa a tela para o próximo comprovante.

Casos de erro tratados: arquivo inválido, imagem ilegível (formulário abre em branco para preenchimento manual), falha ou limite da IA (mensagem clara em português, sem repetir a chamada automaticamente).

## Detalhes técnicos

- Nova rota `src/routes/comprovante.tsx` + item "Comprovante" em `src/components/layout/AppHeader.tsx` e no menu suspenso do painel (`src/routes/index.tsx`).
- Server function `src/lib/receipt.functions.ts` (`createServerFn`, protegida por `requireSupabaseAuth`) que recebe a imagem em base64 e chama o Lovable AI Gateway (`google/gemini-3.8-flash`, entrada multimodal `image_url` com data URL) pedindo JSON estruturado. Tratamento de status 402/429/5xx conforme o contrato do gateway.
- Chamada feita do componente via `useServerFn` (não no loader), já que a rota é protegida.
- Componentes novos em `src/components/finance/ReceiptUpload.tsx` e `ReceiptForm.tsx`, reutilizando shadcn/ui e os campos já existentes do `TransactionModal`.
- Salvamento usa `addTransaction` do `finance-store`, então as regras de categorização, saldos e gráficos continuam funcionando sem mudança de banco.
- A imagem não é armazenada no banco (apenas usada na leitura). Se quiser guardar o comprovante anexado à transação, é um passo extra a combinar depois.
- `head()` próprio na rota com título e descrição específicos.
