"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
};

type SaleItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

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

type DebtItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

type Debt = {
  id: string;
  timestamp: number;
  customerName: string;
  items: DebtItem[];
  total: number;
};

const PRODUCTS: Product[] = [
  { id: "cerveza", name: "Cerveza", price: 2 },
  { id: "tinto", name: "Tinto", price: 2 },
  { id: "refresco", name: "Refresco", price: 1.5 },
  { id: "cubata", name: "Cubata", price: 5 },
  { id: "plus", name: "+ Extra", price: 1 },
  { id: "chupito", name: "Chupito", price: 1.5 },
  { id: "chupito_premium", name: "Chupito premium", price: 2 },
  { id: "agua_15", name: "Botella de agua 1,5L", price: 1.5 },
];

function eur(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

const STORAGE_KEY = "tpv_matet_v1";

function safeParse<T>(v: string | null): T | null {
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadInitialState() {
  if (typeof window === "undefined") {
    return {
      cart: {} as Record<string, number>,
      colorMode: "dark" as "dark" | "color",
      sales: [] as Sale[],
      debts: [] as Debt[],
    };
  }

  const saved = safeParse<{
    cart: Record<string, number>;
    colorMode: "dark" | "color";
    sales: Sale[];
    debts: Debt[];
  }>(localStorage.getItem(STORAGE_KEY));

  return {
    cart: saved?.cart && typeof saved.cart === "object" ? saved.cart : {},
    colorMode: saved?.colorMode === "dark" || saved?.colorMode === "color" ? saved.colorMode : "dark",
    sales: Array.isArray(saved?.sales) ? saved!.sales : [],
    debts: Array.isArray(saved?.debts) ? saved!.debts : [],
  };
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

  useEffect(() => {
    const payload = {
      cart,
      colorMode,
      sales,
      debts,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [cart, colorMode, sales, debts]);

  const lines = useMemo(() => {
    return PRODUCTS.map((p) => {
      const qty = cart[p.id] ?? 0;
      return {
        ...p,
        qty,
        lineTotal: qty * p.price,
      };
    }).filter((l) => l.qty > 0);
  }, [cart]);

  const total = useMemo(() => {
    return lines.reduce((acc, l) => acc + l.lineTotal, 0);
  }, [lines]);

  const add = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };

  const dec = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      const cur = next[id] ?? 0;
      const v = cur - 1;
      if (v <= 0) delete next[id];
      else next[id] = v;
      return next;
    });
  };

  const remove = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

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
      default: return "bg-zinc-300 hover:bg-zinc-400 text-zinc-900";
    }
  };

  const paidNumber = useMemo(() => {
    if (!paid) return 0;
    const normalized = paid.replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }, [paid]);

  const change = useMemo(() => {
    return paidNumber - total;
  }, [paidNumber, total]);

  const appendPaid = (v: string) => {
    setPaid((prev) => {
      if (v === ".") {
        if (!prev) return "0.";
        if (prev.includes(".")) return prev;
        return prev + ".";
      }
      if (v === "00") {
        if (!prev) return "0";
        return prev + "00";
      }
      if (prev === "0" && v !== ".") return v;
      return prev + v;
    });
  };

  const backspacePaid = () => {
    setPaid((prev) => prev.slice(0, -1));
  };

  const clearPaid = () => setPaid("");

  const finishPay = () => {
    if (total <= 0) return;
    if (paidNumber < total) return;

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

  const closePay = () => {
    setPayOpen(false);
    setPaid("");
  };

  const openFiar = () => {
    if (total <= 0) return;
    setFiarName("");
    setFiarOpen(true);
  };

  const closeFiar = () => {
    setFiarOpen(false);
    setFiarName("");
  };

  const confirmFiar = () => {
    if (total <= 0) return;
    const name = fiarName.trim();
    if (!name) return;

    const items: DebtItem[] = lines.map((l) => ({
      id: l.id,
      name: l.name,
      qty: l.qty,
      price: l.price,
    }));

    const debt: Debt = {
      id: newId(),
      timestamp: Date.now(),
      customerName: name,
      items,
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
    setDebts((prev) => prev.filter((x) => x.id !== id));
  };

  const saleItemsSummary = (items: SaleItem[]) => {
    const parts = items.map((it) => `${it.qty}×${it.name}`);
    const joined = parts.join(", ");
    if (joined.length <= 60) return joined;
    return joined.slice(0, 57) + "…";
  };

  return (
    <div className={`min-h-screen transition-colors ${colorMode === "color" ? "bg-white text-zinc-900" : "bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50"}`}>
      <main className="mx-auto w-full max-w-7xl px-3 py-4 md:px-6 md:py-6">
        <div className="flex flex-col gap-2">
          <h1 className={`text-2xl md:text-3xl font-semibold tracking-tight ${colorMode === "color" ? "text-zinc-900" : ""}`}>TPV Comisión Matet</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs ${colorMode === "color" ? "text-black" : "text-zinc-600"}`}>Modo pantalla</span>
            <button
              onClick={() => setColorMode(colorMode === "dark" ? "color" : "dark")}
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              {colorMode === "dark" ? "Negro" : "Colores"}
            </button>
          </div>
          <p className={`text-sm ${colorMode === "color" ? "text-black" : "text-zinc-600 dark:text-zinc-400"}`}>
            Pulsa productos para añadir. Ajusta cantidades y cobra.
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:mt-6 md:grid-cols-[1fr_420px]">
          <section className={`rounded-2xl border p-4 md:p-5 shadow-sm transition-colors ${colorMode === "color" ? "border-zinc-300 bg-white" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"}`}>
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-base font-semibold">Productos</h2>
              <div className={`text-xs ${colorMode === "color" ? "text-black" : "text-zinc-600 dark:text-zinc-400"}`}>Precios según lista</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {PRODUCTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p.id)}
                  className={`flex flex-col justify-between rounded-xl border border-zinc-200 p-4 md:min-h-[96px] md:p-5 text-left transition active:scale-[0.99] ${colorMode === "color" ? productColor(p.id) : "bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900"}`}
                >
                  <div className="text-base font-semibold leading-snug md:text-lg">{p.name}</div>
                  <div className={`mt-2 text-sm md:text-base ${colorMode === "color" ? "text-black" : "text-zinc-600 dark:text-zinc-400"}`}>{eur(p.price)}</div>
                </button>
              ))}
            </div>
          </section>

          <aside className={`rounded-2xl border p-4 shadow-sm transition-colors md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-auto ${colorMode === "color" ? "border-zinc-300 bg-white" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"}`}>
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-base font-semibold">Cuenta</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setHistoryTab("sales"); setHistoryOpen(true); }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    colorMode === "color"
                      ? "border-zinc-300 text-black hover:bg-zinc-100"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  }`}
                >
                  Historial
                </button>
                <button
                  type="button"
                  onClick={openFiar}
                  disabled={total <= 0}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-100 ${
                    colorMode === "color"
                      ? "border-zinc-300 text-black hover:bg-zinc-100 disabled:bg-zinc-100"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  }`}
                >
                  Fiar
                </button>
                <button
                  onClick={clear}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    colorMode === "color"
                      ? "border-zinc-300 text-black hover:bg-zinc-100"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  }`}
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {lines.length === 0 ? (
                <div className={`rounded-xl border border-dashed p-4 text-sm ${colorMode === "color" ? "border-zinc-300 text-black" : "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"}`}>
                  Sin productos.
                </div>
              ) : (
                lines.map((l) => (
                  <div
                    key={l.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${colorMode === "color" ? "border-zinc-300 bg-zinc-100" : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"}`}
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

            <div className={`mt-4 rounded-xl border p-3 transition-colors ${colorMode === "color" ? "border-zinc-300 bg-zinc-100" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"}`}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Total</div>
                <div className="text-3xl md:text-4xl font-semibold tabular-nums">{eur(total)}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                onClick={cobrar}
                disabled={total <= 0}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-100 ${
                  colorMode === "color"
                    ? "bg-zinc-900 text-white enabled:hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-black"
                    : "bg-zinc-900 text-white enabled:hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:enabled:hover:bg-zinc-200"
                }`}
                type="button"
              >
                Cobrar
              </button>
              <button
                onClick={clear}
                disabled={total <= 0}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-100 ${
                  colorMode === "color"
                    ? "border-zinc-300 text-black enabled:hover:bg-zinc-100 disabled:bg-zinc-100"
                    : "border-zinc-200 text-zinc-800 enabled:hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:enabled:hover:bg-zinc-900"
                }`}
              >
                Borrar todo
              </button>
            </div>

            <div className={`mt-3 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-600 dark:text-zinc-400"}`}>
              Nota: “+ Extra” suma 1€ al total para energéticas u otros suplementos.
            </div>
          </aside>

        </div>
        {payOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={closePay}
            />

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
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    colorMode === "color"
                      ? "border-zinc-300 text-black hover:bg-zinc-100"
                      : "border-zinc-800 text-zinc-200 hover:bg-zinc-900"
                  }`}
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
                  <div
                    className={`text-2xl font-semibold tabular-nums ${
                      paid && paidNumber < total ? "text-red-500" : ""
                    }`}
                  >
                    {paid ? eur(Math.max(change, 0)) : "—"}
                  </div>
                </div>
                {paid && paidNumber < total ? (
                  <div className="mt-1 text-xs text-red-500">
                    Falta {eur(total - paidNumber)}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <button type="button" onClick={() => setPaid("5")} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>5€</button>
                <button type="button" onClick={() => setPaid("10")} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>10€</button>
                <button type="button" onClick={() => setPaid("20")} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>20€</button>
                <button type="button" onClick={() => setPaid("50")} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>50€</button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => appendPaid("1")} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>1</button>
                <button type="button" onClick={() => appendPaid("2")} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>2</button>
                <button type="button" onClick={() => appendPaid("3")} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>3</button>

                <button type="button" onClick={() => appendPaid("4")} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>4</button>
                <button type="button" onClick={() => appendPaid("5")} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>5</button>
                <button type="button" onClick={() => appendPaid("6")} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>6</button>

                <button type="button" onClick={() => appendPaid("7")} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>7</button>
                <button type="button" onClick={() => appendPaid("8")} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>8</button>
                <button type="button" onClick={() => appendPaid("9")} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>9</button>

                <button type="button" onClick={() => appendPaid(".")} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>.</button>
                <button type="button" onClick={() => appendPaid("0")} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>0</button>
                <button type="button" onClick={backspacePaid} className={`rounded-xl border px-3 py-4 text-lg font-semibold transition ${colorMode === "color" ? "border-zinc-300 text-black hover:bg-zinc-100" : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"}`}>⌫</button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={clearPaid}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    colorMode === "color"
                      ? "border-zinc-300 text-black hover:bg-zinc-100"
                      : "border-zinc-800 text-zinc-50 hover:bg-zinc-900"
                  }`}
                >
                  Borrar
                </button>
                <button
                  type="button"
                  onClick={finishPay}
                  disabled={!paid || paidNumber < total}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-100 ${
                    colorMode === "color"
                      ? "bg-zinc-900 text-white enabled:hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-black"
                      : "bg-white text-zinc-900 enabled:hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-400"
                  }`}
                >
                  Confirmar cobro
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {fiarOpen ? (
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
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    colorMode === "color"
                      ? "border-zinc-300 text-black hover:bg-zinc-100"
                      : "border-zinc-800 text-zinc-200 hover:bg-zinc-900"
                  }`}
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
                  onClick={() => { setFiarName(""); }}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    colorMode === "color"
                      ? "border-zinc-300 text-black hover:bg-zinc-100"
                      : "border-zinc-800 text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  Borrar nombre
                </button>
                <button
                  type="button"
                  onClick={confirmFiar}
                  disabled={fiarName.trim().length === 0}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-100 ${
                    colorMode === "color"
                      ? "bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-black"
                      : "bg-white text-zinc-900 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-400"
                  }`}
                >
                  Guardar fiado
                </button>
              </div>
            </div>
          </div>
        ) : null}
      {historyOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setHistoryOpen(false)}
          />

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
                  Cobros de esta sesión.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setSales([]); setDebts([]); }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    colorMode === "color"
                      ? "border-zinc-300 text-black hover:bg-zinc-100"
                      : "border-zinc-800 text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  Vaciar
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    colorMode === "color"
                      ? "border-zinc-300 text-black hover:bg-zinc-100"
                      : "border-zinc-800 text-zinc-200 hover:bg-zinc-900"
                  }`}
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
                    ? (colorMode === "color" ? "border-zinc-300 bg-zinc-100 text-black" : "border-zinc-800 bg-black/20 text-zinc-50")
                    : (colorMode === "color" ? "border-zinc-300 bg-white text-black hover:bg-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900")
                }`}
              >
                Cobros
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab("debts")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  historyTab === "debts"
                    ? (colorMode === "color" ? "border-zinc-300 bg-zinc-100 text-black" : "border-zinc-800 bg-black/20 text-zinc-50")
                    : (colorMode === "color" ? "border-zinc-300 bg-white text-black hover:bg-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900")
                }`}
              >
                Fiados
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
                          colorMode === "color"
                            ? "border-zinc-300 bg-white"
                            : "border-zinc-800 bg-zinc-900/40"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {s.source === "debt" && s.customerName ? (
                              <>
                                <span className="mr-2">
                                  {new Date(s.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                                  colorMode === "color"
                                    ? "border-zinc-300 bg-zinc-100 text-black"
                                    : "border-zinc-800 bg-black/20 text-zinc-200"
                                }`}>
                                  Fiado: {s.customerName}
                                </span>
                              </>
                            ) : (
                              new Date(s.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                            )}
                          </div>
                          <div className={`mt-0.5 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-400"}`}>
                            {s.source === "debt" ? (
                              <>Total {eur(s.total)} · Pagado (fiado)</>
                            ) : (
                              <>Total {eur(s.total)} · Paga {eur(s.paid)} · Cambio {eur(s.change)}</>
                            )}
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
                    <div className="text-xl font-semibold tabular-nums">
                      {eur(debts.reduce((acc, d) => acc + d.total, 0))}
                    </div>
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
                          colorMode === "color"
                            ? "border-zinc-300 bg-white"
                            : "border-zinc-800 bg-zinc-900/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{d.customerName}</div>
                            <div className={`mt-0.5 text-xs ${colorMode === "color" ? "text-black" : "text-zinc-400"}`}>
                              {new Date(d.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
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
                            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                              colorMode === "color"
                                ? "border-zinc-300 text-black hover:bg-zinc-100"
                                : "border-zinc-800 text-zinc-200 hover:bg-zinc-900"
                            }`}
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
      ) : null}
    </main>
  </div>
);
}