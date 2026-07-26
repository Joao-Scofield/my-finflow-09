## Plano

### 1. Ativar backend e autenticação
- Habilitar Lovable Cloud para ter banco de dados e login reais.
- Criar autenticação simples por usuário/senha no servidor.
- Criar os usuários iniciais de teste:
  - `rebeka` / `123`
  - `joao` / `123`
- Criar uma tela pública de login e proteger o painel financeiro para exigir sessão.
- Incluir opção de sair da conta no cabeçalho.

### 2. Criar estrutura de dados persistente por usuário
Como você escolheu dados **individuais**, cada usuário verá somente sua própria base, sincronizada entre dispositivos.

Criar tabelas no banco para:
- Perfis de usuário: username, nome exibido e preferências básicas.
- Categorias.
- Subcategorias.
- Transações.
- Regras de categorização automática.

As tabelas terão políticas de segurança para cada usuário ler e alterar apenas os próprios dados.

### 3. Migrar o app do localStorage para banco de dados
O problema atual confirmado no código é que os dados ficam no `localStorage` do navegador (`finance-app:v1`), então eles só existem naquele aparelho/navegador. Vou substituir essa camada por persistência no banco.

- Carregar transações, categorias, subcategorias e regras do banco ao abrir o app.
- Salvar no banco ao criar, editar, importar Excel ou excluir dados.
- Manter a experiência atual do painel, mas com dados sincronizados por login.
- Inicializar categorias e regras padrão para cada usuário quando ele entrar pela primeira vez.

### 4. Adaptar recursos existentes
- Importação de Excel passará a inserir as linhas no banco.
- Criação automática de categorias/subcategorias durante importação continuará funcionando.
- Motor de regras continuará categorizando transações novas e importadas.
- Reaplicar regras atualizará as transações salvas no banco.
- Tabela, cards e gráficos continuarão usando o mesmo visual e filtros.

### 5. Validação e segurança
- Validar entradas no cliente e no servidor antes de gravar.
- Não deixar senha hardcoded no frontend.
- Armazenar senha de teste de forma segura no backend, não em código visível ao navegador.
- Verificar que `rebeka` e `joao` não conseguem ver dados um do outro.

### Observação importante
A senha `123` é aceitável só para teste. Se esse app virar uso real, recomendo trocar por senhas fortes e/ou login gerenciado com recuperação de senha.