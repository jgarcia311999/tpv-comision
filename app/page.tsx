"use client";

import { useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; price: number };
type SaleItem = { id: string; name: string; qty: number; price: number };
type Sale = {
  id: string;
  timestamp: number;
  total: number;
  paid: number;
  change: number;
  items: SaleItem[];
  customerName?: string;
  source?: "direct" | "debt";
};
type DebtItem = { id: string; name: string; qty: number; price: number };
type Debt = {
  id: string;
  timestamp: number;
  customerName: string;
  items: DebtItem[];
  total: number;
};

type CajaSession = {
  openedAt: number;
  float: number;
};

type Category = "bebidas" | "comidas" | "mercha";

const CATEGORY_LABELS: Record<Category, string> = {
  bebidas: "Bebidas",
  comidas: "Comidas",
  mercha: "Mercha",
};

const PRODUCTS_BY_CATEGORY: Record<Category, Product[]> = {
  bebidas: [
    { id: "cerveza", name: "Cerveza", price: 2 },
    { id: "tinto", name: "Tinto", price: 2 },
    { id: "refresco", name: "Refresco", price: 1.5 },
    { id: "cubata", name: "Cubata", price: 5 },
    { id: "plus", name: "+ Extra", price: 1 },
    { id: "chupito", name: "Chupito", price: 1.5 },
    { id: "chupito_premium", name: "Chupito premium", price: 2 },
    { id: "agua_15", name: "Botella de agua 1,5L", price: 1.5 },
  ],
  comidas: [
    { id: "pipas", name: "Pipas", price: 1 },
    { id: "papas", name: "Papas", price: 1 },
    { id: "panini", name: "Panini", price: 3 },
    { id: "pintxo", name: "Pintxo", price: 1.5 },
    { id: "sandwich", name: "Sandwich", price: 3 },
    { id: "chuches", name: "Chuches", price: 1 },
    { id: "chuches_2", name: "Chuches 2", price: 1.5 },
  ],
  mercha: [
    { id: "llavero", name: "Llavero", price: 5 },
    { id: "camiseta", name: "Camiseta", price: 15 },
    { id: "abrechapas", name: "Abrechapas", price: 5 },
    { id: "vino", name: "Vino", price: 5 },
    { id: "bandera", name: "Bandera", price: 10 },
  ],
};

const ALL_PRODUCTS: Product[] = Object.values(PRODUCTS_BY_CATEGORY).flat();

const NUM_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function eur(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

function formatTimestamp(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return isToday
    ? time
    : `${d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })} ${time}`;
}

const STORAGE_KEY = "tpv_matet_v1";

function safeParse<T>(v: string | null): T | null {
  if (!v) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadInitialState() {
  if (typeof window === "undefined") {
    return { cart: {} as Record<string, number>, colorMode: "dark" as "dark" | "color", sales: [] as Sale[], debts: [] as Debt[], cajaSession: null as CajaSession | null };
  }
  const saved = safeParse<{ cart: Record<string, number>; colorMode: "dark" | "color"; sales: Sale[]; debts: Debt[]; cajaSession: CajaSession | null }>(
    localStorage.getItem(STORAGE_KEY)
  );
  return {
    cart: saved?.cart && typeof saved.cart === "object" ? saved.cart : {},
    colorMode: saved?.colorMode === "dark" || saved?.colorMode === "color" ? saved.colorMode : "dark",
    sales: Array.isArray(saved?.sales) ? saved!.sales : [],
    debts: Array.isArray(saved?.debts) ? saved!.debts : [],
    cajaSession: saved?.cajaSession?.openedAt && saved?.cajaSession?.float != null ? saved.cajaSession : null,
  };
}

function borderBtn(cm: "dark" | "color") {
  return cm === "color"
    ? "border-zinc-300 text-black hover:bg-zinc-100"
    : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900";
}
function modalBorderBtn(cm: "dark" | "color") {
  return cm === "color"
    ? "border-zinc-300 text-black hover:bg-zinc-100"
    : "border-zinc-800 text-zinc-200 hover:bg-zinc-900";
}
function numKey(cm: "dark" | "color") {
  return cm === "color"
    ? "border-zinc-300 text-black hover:bg-zinc-100"
    : "border-zinc-800 text-zinc-50 hover:bg-zinc-900";
}

export default function Home() {
  const initial = useMemo(() => loadInitialState(), []);
  const [cart, setCart] = useState<Record<string, number>>(() => initial.cart);
  const [colorMode, setColorMode] = useState<"dark" | "color">(() => initial.colorMode);
  const [payOpen, setPayOpen] = useState(false);
  const [paid, setPaid] = useState<string>("");
  const [sales, setSales] = useState<Sale[]>(() => initial.sales);
  const [debts, setDebts] = useState<Debt[]>(() => initial.debts);
  const [fiarOpen, setFiarOpen] = useState(false);
  const [fiarName, setFiarName] = useState("");
  const [historyTab, setHistoryTab] = useState<"sales" | "debts">("sales");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [category, setCategory] = useState<Category>("bebidas");
  const [cajaSession, setCajaSession] = useState<CajaSession | null>(() => initial.cajaSession);
  const [cajaModalOpen, setCajaModalOpen] = useState(false);
  const [cajaFloatInput, setCajaFloatInput] = useState("");

  // Fix: sync dark class with colorMode so dark: Tailwind variants work
  useEffect(() => {
    document.documentElement.classList.toggle("dark", colorMode === "dark");
  }, [colorMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cart, colorMode, sales, debts, cajaSession }));
  }, [cart, colorMode, sales, debts, cajaSession]);

  const lines = useMemo(
    () =>
      ALL_PRODUCTS.map((p) => {
        const qty = cart[p.id] ?? 0;
        return { ...p, qty, lineTotal: qty * p.price };
      }).filter((l) => l.qty > 0),
    [cart]
  );

  const total = useMemo(() => lines.reduce((acc, l) => acc + l.lineTotal, 0), [lines]);
  const pendingDebtTotal = useMemo(() => debts.reduce((a, d) => a + d.total, 0), [debts]);

  const add = (id: string) => setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));

  const dec = (id: string) =>
    setCart((prev) => {
      const next = { ...prev };
      const v = (next[id] ?? 0) - 1;
      if (v <= 0) delete next[id];
      else next[id] = v;
      return next;
    });

  const remove = (id: string) =>
    setCart((prev) => { const next = { ...prev }; delete next[id]; return next; });

  const clear = () => setCart({});

  const cobrar = () => {
    if (total <= 0) return;
    setPaid("");
    setPayOpen(true);
  };

  const productColor = (id: string) => {
    if (colorMode !== "color") return "";
    switch (id) {
      case "cerveza": return "bg-amber-300 hover:bg-amber-400 text-zinc-900";
      case "tinto": return "bg-rose-300 hover:bg-rose-400 text-zinc-900";
      case "refresco": return "bg-sky-300 hover:bg-sky-400 text-zinc-900";
      case "cubata": return "bg-purple-300 hover:bg-purple-400 text-white";
      case "plus": return "bg-lime-300 hover:bg-lime-400 text-zinc-900";
      case "chupito": return "bg-orange-300 hover:bg-orange-400 text-zinc-900";
      case "chupito_premium": return "bg-fuchsia-300 hover:bg-fuchsia-400 text-white";
      case "agua_15": return "bg-cyan-300 hover:bg-cyan-400 text-zinc-900";
      // comidas
      case "pipas": return "bg-yellow-200 hover:bg-yellow-300 text-zinc-900";
      case "papas": return "bg-yellow-300 hover:bg-yellow-400 text-zinc-900";
      case "panini": return "bg-orange-200 hover:bg-orange-300 text-zinc-900";
      case "pintxo": return "bg-emerald-300 hover:bg-emerald-400 text-zinc-900";
      case "sandwich": return "bg-amber-200 hover:bg-amber-300 text-zinc-900";
      case "chuches": return "bg-pink-300 hover:bg-pink-400 text-zinc-900";
      case "chuches_2": return "bg-pink-400 hover:bg-pink-500 text-white";
      // mercha
      case "llavero": return "bg-indigo-300 hover:bg-indigo-400 text-zinc-900";
      case "camiseta": return "bg-blue-300 hover:bg-blue-400 text-zinc-900";
      case "abrechapas": return "bg-zinc-400 hover:bg-zinc-500 text-white";
      case "vino": return "bg-purple-300 hover:bg-purple-400 text-zinc-900";
      case "bandera": return "bg-red-300 hover:bg-red-400 text-zinc-900";
      default: return "bg-zinc-300 hover:bg-zinc-400 text-zinc-900";
    }
  };

  const paidNumber = useMemo(() => {
    if (!paid) return 0;
    const n = Number(paid.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [paid]);

  const change = useMemo(() => paidNumber - total, [paidNumber, total]);

  const appendPaid = (v: string) => {
    setPaid((prev) => {
      if (v === ".") {
        if (!prev) return "0.";
        if (prev.includes(".")) return prev;
        return prev + ".";
      }
      if (v === "00") return prev ? prev + "00" : "0";
      if (prev === "0" && v !== ".") return v;
      return prev + v;
    });
  };

  const backspacePaid = () => setPaid((prev) => prev.slice(0, -1));
  const clearPaid = () => setPaid("");

  const finishPay = () => {
    if (total <= 0 || paidNumber < total) return;
    const sale: Sale = {
      id: newId(),
      timestamp: Date.now(),
      total,
      paid: paidNumber,
      change: paidNumber - total,
      items: lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty, price: l.price })),
      source: "direct",
    };
    setSales((prev) => [sale, ...prev]);
    setPayOpen(false);
    setPaid("");
    clear();
  };

  const closePay = () => { setPayOpen(false); setPaid(""); };

  const openFiar = () => {
    if (total <= 0) return;
    setFiarName("");
    setFiarOpen(true);
  };

  const closeFiar = () => { setFiarOpen(false); setFiarName(""); };

  const confirmFiar = () => {
    if (total <= 0) return;
    const name = fiarName.trim();
    if (!name) return;
    const debt: Debt = {
      id: newId(),
      timestamp: Date.now(),
      customerName: name,
      items: lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty, price: l.price })),
      total,
    };
    setDebts((prev) => [debt, ...prev]);
    setFiarOpen(false);
    setFiarName("");
    clear();
  };

  const markDebtPaid = (id: string) => {
    setDebts((prev) => {
      const d = prev.find((x) => x.id === id);
      if (!d) return prev;
      const sale: Sale = {
        id: newId(),
        timestamp: Date.now(),
        total: d.total,
        paid: d.total,
        change: 0,
        items: d.items.map((it) => ({ id: it.id, name: it.name, qty: it.qty, price: it.price })),
        customerName: d.customerName,
        source: "debt",
      };
      setSales((sPrev) => [sale, ...sPrev]);
      return prev.filter((x) => x.id !== id);
    });
  };

  const deleteDebt = (id: string) => {
    if (!window.confirm("¿Borrar este fiado?")) return;
    setDebts((prev) => prev.filter((x) => x.id !== id));
  };

  const saleItemsSummary = (items: SaleItem[]) => {
    const joined = items.map((it) => `${it.qty}×${it.name}`).join(", ");
    return joined.length <= 60 ? joined : joined.slice(0, 57) + "…";
  };

  // Ventas registradas desde que se abrió la caja
  const sessionSales = useMemo(
    () => (cajaSession ? sales.filter((s) => s.timestamp >= cajaSession.openedAt) : []),
    [sales, cajaSession]
  );
  const sessionTotal = useMemo(
    () => sessionSales.reduce((a, s) => a + s.total, 0),
    [sessionSales]
  );

  const cajaFloatNumber = useMemo(() => {
    const n = Number(cajaFloatInput.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [cajaFloatInput]);

  const openCaja = () => {
    if (cajaFloatNumber < 0) return;
    setCajaSession({ openedAt: Date.now(), float: cajaFloatNumber });
    setCajaModalOpen(false);
    setCajaFloatInput("");
  };

  const closeCaja = () => {
    if (!window.confirm("¿Cerrar la caja? Esto finaliza la sesión actual.")) return;
    setCajaSession(null);
    setCajaModalOpen(false);
  };

  return (
    <div
      className={`min-h-screen transition-colors ${
        colorMode === "color"
          ? "bg-white text-zinc-900"
          : "bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50"
      }`}
    >
      <main className="mx-auto w-full max-w-7xl px-3 py-4 md:px-6 md:py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">TPV Comisión Matet</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs ${colorMode === "color" ? "text-black" : "text-zinc-600"}`}>
                Modo pantalla
              </span>
              <button
                onClick={() => setColorMode(colorMode === "dark" ? "color" : "dark")}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                {colorMode === "dark" ? "Cambiar a colores" : "Cambiar a oscuro"}
              </button>
            </div>

            {/* Indicador de caja */}
            {cajaSession ? (
              <button
                type="button"
                onClick={() => setCajaModalOpen(true)}
                className="flex items-center gap-2 rounded-full border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Caja abierta · {eur(cajaSession.float)} cambio
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setCajaFloatInput(""); setCajaModalOpen(true); }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  colorMode === "color"
                    ? "border-zinc-300 text-black hover:bg-zinc-100"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                Abrir caja
              </button>
            )}
          </div>
          <p className={`text-sm ${colorMode === "color" ? "text-black" : "text-zinc-600 dark:text-zinc-400"}`}>
            Pulsa productos para añadir. Ajusta cantidades y cobra.
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:mt-6 md:grid-cols-[1fr_420px]">
          {/* Productos */}
          <section
            className={`rounded-2xl border p-4 md:p-5 shadow-sm transition-colors ${
              colorMode === "color"
                ? "border-zinc-300 bg-white"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            }`}
          >
            {/* Tabs de categoría */}
            <div className="flex gap-2">
              {(Object.keys(PRODUCTS_BY_CATEGORY) as Category[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    category === cat
                      ? colorMode === "color"
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-700 bg-zinc-900 text-white dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-900"
                      : colorMode === "color"
                      ? "border-zinc-300 bg-white text-black hover:bg-zinc-100"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {PRODUCTS_BY_CATEGORY[category].map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p.id)}
                  className={`flex flex-col justify-between rounded-xl border border-zinc-200 p-4 md:min-h-[96px] md:p-5 text-left transition active:scale-[0.99] ${
                    colorMode === "color"
                      ? productColor(p.id)
                      : "bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900"
                  }`}
                >
                  <div className="text-base font-semibold leading-snug md:text-lg">{p.name}</div>
                  <div className={`mt-2 text-sm md:text-base ${colorMode === "color" ? "text-black" : "text-zinc-600 dark:text-zinc-400"}`}>
                    {eur(p.price)}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Cuenta */}
          <aside
            className={`rounded-2xl border p-4 shadow-sm transition-colors md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-auto ${
              colorMode === "color"
                ? "border-zinc-300 bg-white"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            }`}
          >
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-base font-semibold">Cuenta</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setHistoryTab("sales"); setHistoryOpen(true); }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${borderBtn(colorMode)}`}
                >
                  Historial
                </button>
                <button
                  type="button"
                  onClick={openFiar}
                  disabled={total <= 0}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${borderBtn(colorMode)}`}
                >
                  Fiar
                </button>
              </div>
            </div>

            {/* Fix: fiados pendientes visible en pantalla principal */}
            {debts.length > 0 && (
              <button
                type="button"
                onClick={() => { setHistoryTab("debts"); setHistoryOpen(true); }}
                className={`mt-2 w-full rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition ${
                  colorMode === "color"
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-amber-800 bg-amber-950/40 text-amber-400 hover:bg-amber-950/60"
                }`}
              >
                {debts.length} fiado{debts.length !== 1 ? "s" : ""} pendiente{debts.length !== 1 ? "s" : ""} · {eur(pendingDebtTotal)}
              </button>
            )}

            <div className="mt-4 space-y-2">
              {lines.length === 0 ? (
                <div
                  className={`rounded-xl border border-dashed p-4 text-sm ${
                    colorMode === "color"
                      ? "border-zinc-300 text-black"
                      : "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  Sin productos.
                </div>
              ) : (
                lines.map((l) => (
                  <div
                    key={l.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                      colorMode === "color"
                        ? "border-zinc-300 bg-zinc-100"
                        : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{l.name}</div>
                      <div className={`mt-0.5 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-600 dark:text-zinc-400"}`}>
                        {l.qty} × {eur(l.price)} = {eur(l.lineTotal)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => dec(l.id)}
                        className="h-9 w-9 rounded-lg border border-zinc-200 bg-white text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                        aria-label={`Restar ${l.name}`}
                      >
                        −
                      </button>
                      <div className="w-7 text-center text-sm font-semibold tabular-nums">{l.qty}</div>
                      <button
                        onClick={() => add(l.id)}
                        className="h-9 w-9 rounded-lg border border-zinc-200 bg-white text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                        aria-label={`Sumar ${l.name}`}
                        type="button"
                      >
                        +
                      </button>
                      <button
                        onClick={() => remove(l.id)}
                        className="ml-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              className={`mt-4 rounded-xl border p-3 transition-colors ${
                colorMode === "color"
                  ? "border-zinc-300 bg-zinc-100"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Total</div>
                <div className="text-3xl md:text-4xl font-semibold tabular-nums">{eur(total)}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                onClick={cobrar}
                disabled={total <= 0}
                type="button"
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  colorMode === "color"
                    ? "bg-zinc-900 text-white enabled:hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400"
                    : "bg-zinc-900 text-white enabled:hover:bg-zinc-800 disabled:bg-zinc-700 disabled:text-zinc-500 dark:bg-white dark:text-zinc-900 dark:enabled:hover:bg-zinc-200 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                }`}
              >
                Cobrar
              </button>
              {/* Fix: confirm antes de borrar + botón único */}
              <button
                onClick={() => {
                  if (lines.length === 0) return;
                  if (window.confirm("¿Borrar toda la cuenta?")) clear();
                }}
                disabled={total <= 0}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-40 ${
                  colorMode === "color"
                    ? "border-zinc-300 text-black enabled:hover:bg-zinc-100"
                    : "border-zinc-200 text-zinc-800 enabled:hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:enabled:hover:bg-zinc-900"
                }`}
              >
                Borrar todo
              </button>
            </div>

            {category === "bebidas" && (
              <div className={`mt-3 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-600 dark:text-zinc-400"}`}>
                Nota: "+ Extra" suma 1€ al total para energéticas u otros suplementos.
              </div>
            )}
          </aside>
        </div>

        {/* Modal cobro */}
        {payOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
            <div className="absolute inset-0 bg-black/50" onClick={closePay} />
            <div
              className={`relative w-full max-w-md md:max-w-lg max-h-[90vh] overflow-auto rounded-2xl border p-4 shadow-xl transition-colors ${
                colorMode === "color"
                  ? "border-zinc-300 bg-white text-black"
                  : "border-zinc-800 bg-zinc-950 text-zinc-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Cobro</div>
                  <div className={`mt-1 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-400"}`}>
                    Introduce lo que te da el cliente y calcula el cambio.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePay}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${modalBorderBtn(colorMode)}`}
                >
                  Cerrar
                </button>
              </div>

              <div className={`mt-4 rounded-xl border p-3 ${colorMode === "color" ? "border-zinc-300 bg-zinc-100" : "border-zinc-800 bg-black/20"}`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Total</div>
                  <div className="text-xl font-semibold tabular-nums">{eur(total)}</div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">Paga con</div>
                  <div className="text-xl font-semibold tabular-nums">{paid ? eur(paidNumber) : "—"}</div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">Cambio</div>
                  <div className={`text-2xl font-semibold tabular-nums ${paid && paidNumber < total ? "text-red-500" : ""}`}>
                    {paid ? eur(Math.max(change, 0)) : "—"}
                  </div>
                </div>
                {paid && paidNumber < total && (
                  <div className="mt-1 text-xs text-red-500">Falta {eur(total - paidNumber)}</div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {["5", "10", "20", "50"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPaid(v)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${numKey(colorMode)}`}
                  >
                    {v}€
                  </button>
                ))}
              </div>

              {/* Fix: teclado separado en dos filas — dígitos 1-9 y fila de 0/00/./⌫ */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {NUM_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => appendPaid(k)}
                    className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${numKey(colorMode)}`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {([[".", "."], ["0", "0"], ["00", "00"], ["⌫", "backspace"]] as [string, string][]).map(([label, val]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => val === "backspace" ? backspacePaid() : appendPaid(val)}
                    className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${numKey(colorMode)}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={clearPaid}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${modalBorderBtn(colorMode)}`}
                >
                  Borrar
                </button>
                <button
                  type="button"
                  onClick={finishPay}
                  disabled={!paid || paidNumber < total}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    colorMode === "color"
                      ? "bg-zinc-900 text-white enabled:hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400"
                      : "bg-white text-zinc-900 enabled:hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-400"
                  }`}
                >
                  Confirmar cobro
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal fiar */}
        {fiarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
            <div className="absolute inset-0 bg-black/50" onClick={closeFiar} />
            <div
              className={`relative w-full max-w-md md:max-w-lg max-h-[90vh] overflow-auto rounded-2xl border p-4 shadow-xl transition-colors ${
                colorMode === "color"
                  ? "border-zinc-300 bg-white text-black"
                  : "border-zinc-800 bg-zinc-950 text-zinc-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Fiar</div>
                  <div className={`mt-1 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-400"}`}>
                    Guarda una deuda con nombre y detalle.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeFiar}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${modalBorderBtn(colorMode)}`}
                >
                  Cerrar
                </button>
              </div>

              <div className={`mt-4 rounded-xl border p-3 ${colorMode === "color" ? "border-zinc-300 bg-zinc-100" : "border-zinc-800 bg-black/20"}`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Total</div>
                  <div className="text-xl font-semibold tabular-nums">{eur(total)}</div>
                </div>
              </div>

              <div className="mt-3">
                <label className={`block text-xs font-semibold ${colorMode === "color" ? "text-black" : "text-zinc-200"}`}>
                  Nombre
                </label>
                <input
                  value={fiarName}
                  onChange={(e) => setFiarName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && fiarName.trim()) confirmFiar(); }}
                  placeholder="Ej: Juan / Paco / Mesa 3"
                  className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none transition ${
                    colorMode === "color"
                      ? "border-zinc-300 bg-white text-black focus:ring-2 focus:ring-zinc-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-50 focus:ring-2 focus:ring-zinc-700"
                  }`}
                />
              </div>

              <div className={`mt-4 rounded-xl border p-3 ${colorMode === "color" ? "border-zinc-300 bg-white" : "border-zinc-800 bg-zinc-900/40"}`}>
                <div className="text-sm font-semibold">Detalle</div>
                <div className={`mt-2 space-y-1 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-300"}`}>
                  {lines.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-3">
                      <div className="truncate">{l.qty} × {l.name}</div>
                      <div className="tabular-nums">{eur(l.lineTotal)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFiarName("")}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${modalBorderBtn(colorMode)}`}
                >
                  Borrar nombre
                </button>
                <button
                  type="button"
                  onClick={confirmFiar}
                  disabled={fiarName.trim().length === 0}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    colorMode === "color"
                      ? "bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400"
                      : "bg-white text-zinc-900 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-400"
                  }`}
                >
                  Guardar fiado
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal historial */}
        {historyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
            <div className="absolute inset-0 bg-black/50" onClick={() => setHistoryOpen(false)} />
            <div
              className={`relative w-full max-w-md md:max-w-lg max-h-[90vh] overflow-auto rounded-2xl border p-4 shadow-xl transition-colors ${
                colorMode === "color"
                  ? "border-zinc-300 bg-white text-black"
                  : "border-zinc-800 bg-zinc-950 text-zinc-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Historial</div>
                  <div className={`mt-1 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-400"}`}>
                    Cobros registrados en este dispositivo.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Fix: Vaciar solo borra ventas, no fiados. Con confirm. */}
                  {historyTab === "sales" && sales.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("¿Vaciar el historial de cobros?")) setSales([]);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${modalBorderBtn(colorMode)}`}
                    >
                      Vaciar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(false)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${modalBorderBtn(colorMode)}`}
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryTab("sales")}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    historyTab === "sales"
                      ? colorMode === "color" ? "border-zinc-300 bg-zinc-100 text-black" : "border-zinc-800 bg-black/20 text-zinc-50"
                      : colorMode === "color" ? "border-zinc-300 bg-white text-black hover:bg-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  Cobros
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab("debts")}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    historyTab === "debts"
                      ? colorMode === "color" ? "border-zinc-300 bg-zinc-100 text-black" : "border-zinc-800 bg-black/20 text-zinc-50"
                      : colorMode === "color" ? "border-zinc-300 bg-white text-black hover:bg-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  Fiados {debts.length > 0 && `(${debts.length})`}
                </button>
              </div>

              {historyTab === "sales" ? (
                <>
                  <div className={`mt-4 rounded-xl border p-3 ${colorMode === "color" ? "border-zinc-300 bg-zinc-100" : "border-zinc-800 bg-black/20"}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Recaudado</div>
                      <div className="text-xl font-semibold tabular-nums">
                        {eur(sales.reduce((acc, s) => acc + s.total, 0))}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-xs">Tickets</div>
                      <div className="text-xs tabular-nums">{sales.length}</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {sales.length === 0 ? (
                      <div className={`rounded-xl border border-dashed p-4 text-sm ${colorMode === "color" ? "border-zinc-300 text-black" : "border-zinc-800 text-zinc-400"}`}>
                        Sin cobros todavía.
                      </div>
                    ) : (
                      sales.map((s) => (
                        <div
                          key={s.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                            colorMode === "color" ? "border-zinc-300 bg-white" : "border-zinc-800 bg-zinc-900/40"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {s.source === "debt" && s.customerName ? (
                                <>
                                  <span className="mr-2">{formatTimestamp(s.timestamp)}</span>
                                  <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                                    colorMode === "color" ? "border-zinc-300 bg-zinc-100 text-black" : "border-zinc-800 bg-black/20 text-zinc-200"
                                  }`}>
                                    Fiado: {s.customerName}
                                  </span>
                                </>
                              ) : (
                                formatTimestamp(s.timestamp)
                              )}
                            </div>
                            <div className={`mt-0.5 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-400"}`}>
                              {s.source === "debt"
                                ? <>Total {eur(s.total)} · Pagado (fiado)</>
                                : <>Total {eur(s.total)} · Paga {eur(s.paid)} · Cambio {eur(s.change)}</>}
                            </div>
                            <div className={`mt-1 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-400"}`}>
                              {saleItemsSummary(s.items)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold tabular-nums">{eur(s.total)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className={`mt-4 rounded-xl border p-3 ${colorMode === "color" ? "border-zinc-300 bg-zinc-100" : "border-zinc-800 bg-black/20"}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Pendiente</div>
                      <div className="text-xl font-semibold tabular-nums">{eur(pendingDebtTotal)}</div>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-xs">Fiados</div>
                      <div className="text-xs tabular-nums">{debts.length}</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {debts.length === 0 ? (
                      <div className={`rounded-xl border border-dashed p-4 text-sm ${colorMode === "color" ? "border-zinc-300 text-black" : "border-zinc-800 text-zinc-400"}`}>
                        Sin fiados.
                      </div>
                    ) : (
                      debts.map((d) => (
                        <div
                          key={d.id}
                          className={`rounded-xl border p-3 transition-colors ${
                            colorMode === "color" ? "border-zinc-300 bg-white" : "border-zinc-800 bg-zinc-900/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{d.customerName}</div>
                              <div className={`mt-0.5 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-400"}`}>
                                {formatTimestamp(d.timestamp)}
                              </div>
                            </div>
                            <div className="text-sm font-semibold tabular-nums">{eur(d.total)}</div>
                          </div>

                          <div className={`mt-2 space-y-1 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-300"}`}>
                            {d.items.map((it) => (
                              <div key={it.id} className="flex items-center justify-between gap-3">
                                <div className="truncate">{it.qty} × {it.name}</div>
                                <div className="tabular-nums">{eur(it.qty * it.price)}</div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => markDebtPaid(d.id)}
                              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                colorMode === "color"
                                  ? "bg-zinc-900 text-white hover:bg-zinc-800"
                                  : "bg-white text-zinc-900 hover:bg-zinc-200"
                              }`}
                            >
                              Marcar pagado
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteDebt(d.id)}
                              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${modalBorderBtn(colorMode)}`}
                            >
                              Borrar
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {/* Modal caja */}
        {cajaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
            <div className="absolute inset-0 bg-black/50" onClick={() => setCajaModalOpen(false)} />
            <div
              className={`relative w-full max-w-sm rounded-2xl border p-5 shadow-xl transition-colors ${
                colorMode === "color"
                  ? "border-zinc-300 bg-white text-black"
                  : "border-zinc-800 bg-zinc-950 text-zinc-50"
              }`}
            >
              {!cajaSession ? (
                /* ── Abrir caja ── */
                <>
                  <div className="text-base font-semibold">Abrir caja</div>
                  <div className={`mt-1 text-xs ${colorMode === "color" ? "text-zinc-500" : "text-zinc-400"}`}>
                    Introduce el cambio inicial que metes en la caja.
                  </div>

                  <div className="mt-4">
                    <label className={`block text-xs font-semibold ${colorMode === "color" ? "text-black" : "text-zinc-200"}`}>
                      Cambio inicial (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={cajaFloatInput}
                      onChange={(e) => setCajaFloatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") openCaja(); }}
                      placeholder="150"
                      className={`mt-2 w-full rounded-xl border px-4 py-3 text-2xl font-semibold tabular-nums outline-none transition ${
                        colorMode === "color"
                          ? "border-zinc-300 bg-white text-black focus:ring-2 focus:ring-zinc-300"
                          : "border-zinc-800 bg-zinc-900 text-zinc-50 focus:ring-2 focus:ring-zinc-700"
                      }`}
                      autoFocus
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCajaModalOpen(false)}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${modalBorderBtn(colorMode)}`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={openCaja}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        colorMode === "color"
                          ? "bg-zinc-900 text-white hover:bg-zinc-800"
                          : "bg-white text-zinc-900 hover:bg-zinc-200"
                      }`}
                    >
                      Abrir caja
                    </button>
                  </div>
                </>
              ) : (
                /* ── Resumen de caja ── */
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">Resumen de caja</div>
                      <div className={`mt-1 text-xs ${colorMode === "color" ? "text-zinc-500" : "text-zinc-400"}`}>
                        Abierta a las {new Date(cajaSession.openedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCajaModalOpen(false)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${modalBorderBtn(colorMode)}`}
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className={`mt-4 space-y-2 rounded-xl border p-4 ${colorMode === "color" ? "border-zinc-200 bg-zinc-50" : "border-zinc-800 bg-zinc-900/40"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${colorMode === "color" ? "text-zinc-600" : "text-zinc-400"}`}>Cambio puesto</span>
                      <span className="text-sm font-semibold tabular-nums">{eur(cajaSession.float)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${colorMode === "color" ? "text-zinc-600" : "text-zinc-400"}`}>
                        Ventas ({sessionSales.length} tickets)
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{eur(sessionTotal)}</span>
                    </div>
                    <div className={`my-1 border-t ${colorMode === "color" ? "border-zinc-200" : "border-zinc-700"}`} />
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${colorMode === "color" ? "text-zinc-600" : "text-zinc-400"}`}>Total en caja</span>
                      <span className="text-lg font-semibold tabular-nums">{eur(cajaSession.float + sessionTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Ganancias</span>
                      <span className="text-2xl font-bold tabular-nums text-emerald-500">{eur(sessionTotal)}</span>
                    </div>
                  </div>

                  <div className={`mt-3 text-xs ${colorMode === "color" ? "text-zinc-500" : "text-zinc-500"}`}>
                    Total en caja = cambio inicial + ventas · Ganancias = ventas únicamente
                  </div>

                  <button
                    type="button"
                    onClick={closeCaja}
                    className={`mt-4 w-full rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      colorMode === "color"
                        ? "border-red-300 text-red-600 hover:bg-red-50"
                        : "border-red-900 text-red-400 hover:bg-red-950/40"
                    }`}
                  >
                    Cerrar caja y finalizar sesión
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
