export type TxType = "income" | "expense";
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

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  date: string; // ISO yyyy-mm-dd
  categoryId: string;
  subcategoryId?: string;
  description: string;
  status: TxStatus;
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

function d(year: number, month: number, day: number) {
  const m = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${m}-${dd}`;
}

function seedForMonth(year: number, month: number): Transaction[] {
  return [
    {
      id: uid(),
      type: "income",
      amount: 8500,
      date: d(year, month, 5),
      categoryId: "cat-salary",
      subcategoryId: "sub-salary-clt",
      description: "Salário mensal",
      status: "paid",
    },
    {
      id: uid(),
      type: "income",
      amount: 1800,
      date: d(year, month, 12),
      categoryId: "cat-freelance",
      subcategoryId: "sub-free-dev",
      description: "Projeto landing page",
      status: "paid",
    },
    {
      id: uid(),
      type: "income",
      amount: 420,
      date: d(year, month, 20),
      categoryId: "cat-invest",
      subcategoryId: "sub-inv-div",
      description: "Dividendos ITSA4",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 2400,
      date: d(year, month, 10),
      categoryId: "cat-housing",
      subcategoryId: "sub-house-rent",
      description: "Aluguel apartamento",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 180,
      date: d(year, month, 15),
      categoryId: "cat-housing",
      subcategoryId: "sub-house-energy",
      description: "Conta de energia",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 129,
      date: d(year, month, 8),
      categoryId: "cat-housing",
      subcategoryId: "sub-house-internet",
      description: "Fibra 500MB",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 780,
      date: d(year, month, 7),
      categoryId: "cat-food",
      subcategoryId: "sub-food-market",
      description: "Compra mensal",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 220,
      date: d(year, month, 14),
      categoryId: "cat-food",
      subcategoryId: "sub-food-rest",
      description: "Jantar aniversário",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 96,
      date: d(year, month, 18),
      categoryId: "cat-food",
      subcategoryId: "sub-food-delivery",
      description: "iFood",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 340,
      date: d(year, month, 9),
      categoryId: "cat-transport",
      subcategoryId: "sub-tr-fuel",
      description: "Gasolina",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 145,
      date: d(year, month, 22),
      categoryId: "cat-transport",
      subcategoryId: "sub-tr-uber",
      description: "Corridas do mês",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 55,
      date: d(year, month, 3),
      categoryId: "cat-leisure",
      subcategoryId: "sub-le-stream",
      description: "Netflix + Spotify",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 180,
      date: d(year, month, 21),
      categoryId: "cat-leisure",
      subcategoryId: "sub-le-cinema",
      description: "Cinema + jantar",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 520,
      date: d(year, month, 5),
      categoryId: "cat-health",
      subcategoryId: "sub-he-plan",
      description: "Plano de saúde",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 120,
      date: d(year, month, 16),
      categoryId: "cat-health",
      subcategoryId: "sub-he-gym",
      description: "Academia",
      status: "paid",
    },
    {
      id: uid(),
      type: "expense",
      amount: 89,
      date: d(year, month, 25),
      categoryId: "cat-health",
      subcategoryId: "sub-he-pharm",
      description: "Farmácia",
      status: "pending",
    },
    {
      id: uid(),
      type: "expense",
      amount: 249,
      date: d(year, month, 11),
      categoryId: "cat-edu",
      subcategoryId: "sub-ed-course",
      description: "Curso online",
      status: "pending",
    },
  ];
}

export function generateSeedTransactions(): Transaction[] {
  const now = new Date();
  const tx: Transaction[] = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    tx.push(...seedForMonth(dt.getFullYear(), dt.getMonth() + 1));
  }
  return tx;
}

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
