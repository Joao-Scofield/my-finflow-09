export type TxType = "income" | "expense" | "transfer";
export type TxStatus = "paid" | "pending";

export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  color: string; // hex or css color
  icon: string; // lucide name
  type: TxType; // income or expense
  subcategories: Subcategory[];
}

export type PaymentMethod =
  | "pix"
  | "credito"
  | "debito"
  | "dinheiro"
  | "vr"
  | "va"
  | "boleto"
  | "transferencia"
  | "investimento"
  | "outro";

export const paymentMethods: { value: PaymentMethod; label: string; color: string }[] = [
  { value: "pix", label: "PIX", color: "#10b981" },
  { value: "credito", label: "Crédito", color: "#6366f1" },
  { value: "debito", label: "Débito", color: "#0ea5e9" },
  { value: "dinheiro", label: "Dinheiro", color: "#f59e0b" },
  { value: "vr", label: "VR (Refeição)", color: "#ec4899" },
  { value: "va", label: "VA (Alimentação)", color: "#a855f7" },
  { value: "boleto", label: "Boleto", color: "#64748b" },
  { value: "transferencia", label: "Transferência", color: "#14b8a6" },
  { value: "investimento", label: "Investimento", color: "#8b5cf6" },
  { value: "outro", label: "Outro", color: "#94a3b8" },
];

export const paymentMethodLabel = (m: string) =>
  paymentMethods.find((p) => p.value === m)?.label ?? "Outro";
export const paymentMethodColor = (m: string) =>
  paymentMethods.find((p) => p.value === m)?.color ?? "#94a3b8";

export type AccountKind =
  | "dinheiro"
  | "conta_corrente"
  | "poupanca"
  | "investimento"
  | "carteira_digital"
  | "vr"
  | "outro";

export const accountKinds: { value: AccountKind; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro físico" },
  { value: "conta_corrente", label: "Conta corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "investimento", label: "Investimento" },
  { value: "carteira_digital", label: "Carteira digital" },
  { value: "vr", label: "VR / VA" },
  { value: "outro", label: "Outro" },
];

export const accountKindLabel = (k: string) =>
  accountKinds.find((a) => a.value === k)?.label ?? "Outro";

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  /** saldo inicial informado pelo usuário */
  initialBalance: number;
  /** saldo atual = inicial + entradas - saídas lançadas nessa conta */
  balance: number;
  color: string;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  date: string; // ISO yyyy-mm-dd
  categoryId: string;
  subcategoryId?: string;
  description: string;
  status: TxStatus;
  paymentMethod: PaymentMethod;
  /** conta de origem (na transferência) ou conta do lançamento */
  accountId?: string;
  /** conta de destino — usado apenas quando type === "transfer" */
  transferAccountId?: string;
}

/** transferências entre saldos não entram no fluxo de caixa */
export const isCashflow = (t: { type: TxType }) => t.type !== "transfer";

export interface Recurring {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  accountId?: string;
  paymentMethod: PaymentMethod;
  dayOfMonth: number;
  startDate: string; // yyyy-mm-dd
  endDate?: string;
  active: boolean;
}

export interface Rule {
  id: string;
  name: string;
  keywords: string[]; // matches if any keyword is a case-insensitive substring of description
  categoryId: string;
  subcategoryId?: string;
  priority: number; // higher runs first
  enabled: boolean;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const defaultRules: Rule[] = [
  {
    id: "rule-vr",
    name: "Vale Refeição / VR",
    keywords: ["sodexo", "vr benef", "ticket rest", "alelo refei", "vr aliment", "vr "],
    categoryId: "cat-food",
    subcategoryId: "sub-food-rest",
    priority: 90,
    enabled: true,
  },
  {
    id: "rule-salary",
    name: "Salário",
    keywords: ["salario", "salário", "folha pagto", "pagamento salario"],
    categoryId: "cat-salary",
    subcategoryId: "sub-salary-clt",
    priority: 100,
    enabled: true,
  },
  {
    id: "rule-uber",
    name: "Apps de transporte",
    keywords: ["uber", "99app", "99 app", "indriver", "cabify"],
    categoryId: "cat-transport",
    subcategoryId: "sub-tr-uber",
    priority: 80,
    enabled: true,
  },
  {
    id: "rule-ifood",
    name: "Delivery de comida",
    keywords: ["ifood", "rappi", "james delivery"],
    categoryId: "cat-food",
    subcategoryId: "sub-food-delivery",
    priority: 80,
    enabled: true,
  },
  {
    id: "rule-stream",
    name: "Streaming",
    keywords: ["netflix", "spotify", "disney", "hbo", "prime video", "youtube premium", "deezer"],
    categoryId: "cat-leisure",
    subcategoryId: "sub-le-stream",
    priority: 70,
    enabled: true,
  },
  {
    id: "rule-fuel",
    name: "Combustível",
    keywords: ["posto", "shell", "ipiranga", "petrobras", "gasolina", "br mania"],
    categoryId: "cat-transport",
    subcategoryId: "sub-tr-fuel",
    priority: 70,
    enabled: true,
  },
  {
    id: "rule-market",
    name: "Supermercado",
    keywords: ["mercado", "supermerc", "carrefour", "extra", "assai", "atacadao", "pao de acucar"],
    categoryId: "cat-food",
    subcategoryId: "sub-food-market",
    priority: 60,
    enabled: true,
  },
  {
    id: "rule-pharma",
    name: "Farmácia",
    keywords: ["farmacia", "drogaria", "drogasil", "raia", "pacheco"],
    categoryId: "cat-health",
    subcategoryId: "sub-he-pharm",
    priority: 60,
    enabled: true,
  },
];

export const defaultCategories: Category[] = [
  {
    id: "cat-salary",
    name: "Salário",
    color: "#10b981",
    icon: "Briefcase",
    type: "income",
    subcategories: [
      { id: "sub-salary-clt", name: "CLT" },
      { id: "sub-salary-bonus", name: "Bônus" },
    ],
  },
  {
    id: "cat-freelance",
    name: "Freelance",
    color: "#06b6d4",
    icon: "Laptop",
    type: "income",
    subcategories: [
      { id: "sub-free-design", name: "Design" },
      { id: "sub-free-dev", name: "Desenvolvimento" },
    ],
  },
  {
    id: "cat-invest",
    name: "Investimentos",
    color: "#8b5cf6",
    icon: "TrendingUp",
    type: "income",
    subcategories: [
      { id: "sub-inv-div", name: "Dividendos" },
      { id: "sub-inv-rf", name: "Renda Fixa" },
    ],
  },
  {
    id: "cat-housing",
    name: "Moradia",
    color: "#6366f1",
    icon: "Home",
    type: "expense",
    subcategories: [
      { id: "sub-house-rent", name: "Aluguel" },
      { id: "sub-house-energy", name: "Energia" },
      { id: "sub-house-water", name: "Água" },
      { id: "sub-house-internet", name: "Internet" },
    ],
  },
  {
    id: "cat-food",
    name: "Alimentação",
    color: "#f59e0b",
    icon: "UtensilsCrossed",
    type: "expense",
    subcategories: [
      { id: "sub-food-market", name: "Supermercado" },
      { id: "sub-food-rest", name: "Restaurantes" },
      { id: "sub-food-delivery", name: "Delivery" },
    ],
  },
  {
    id: "cat-transport",
    name: "Transporte",
    color: "#0ea5e9",
    icon: "Car",
    type: "expense",
    subcategories: [
      { id: "sub-tr-fuel", name: "Combustível" },
      { id: "sub-tr-uber", name: "App / Uber" },
      { id: "sub-tr-public", name: "Transporte Público" },
    ],
  },
  {
    id: "cat-leisure",
    name: "Lazer",
    color: "#ec4899",
    icon: "Music",
    type: "expense",
    subcategories: [
      { id: "sub-le-cinema", name: "Cinema" },
      { id: "sub-le-stream", name: "Streaming" },
      { id: "sub-le-trips", name: "Viagens" },
    ],
  },
  {
    id: "cat-health",
    name: "Saúde",
    color: "#ef4444",
    icon: "HeartPulse",
    type: "expense",
    subcategories: [
      { id: "sub-he-plan", name: "Plano de Saúde" },
      { id: "sub-he-pharm", name: "Farmácia" },
      { id: "sub-he-gym", name: "Academia" },
    ],
  },
  {
    id: "cat-edu",
    name: "Educação",
    color: "#14b8a6",
    icon: "GraduationCap",
    type: "expense",
    subcategories: [
      { id: "sub-ed-course", name: "Cursos" },
      { id: "sub-ed-books", name: "Livros" },
    ],
  },
];

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const monthNamesPt = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
