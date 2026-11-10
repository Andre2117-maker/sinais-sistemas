import { useState, useEffect, useRef, useMemo } from "react";
import Plotly from "plotly.js-basic-dist";
import { math, sanitizarExpressao } from "./utils/mathParser";
import { TabSystemAnalysis } from "./components/TabSystemAnalysis";
import { ExpressionInput } from "./components/ExpressionInput";
import "./App.css";

/* ------------------------------------------------------------------ */
/* Tipos e constantes                                                  */
/* ------------------------------------------------------------------ */

type Aba = "transform" | "operations" | "system";
type Operacao = "add" | "sub" | "mul" | "div";
type Variavel = "t" | "n";
type Compilado = { evaluate: (scope: Record<string, number>) => unknown };

const ABAS: { id: Aba; icone: string; rotulo: string }[] = [
  { id: "transform", icone: "↔️", rotulo: "Transformações" },
  { id: "operations", icone: "➕", rotulo: "Operações" },
  { id: "system", icone: "🔍", rotulo: "Sistemas & Convolução" },
];

const OPERACOES: { id: Operacao; simbolo: string; nome: string }[] = [
  { id: "add", simbolo: "+", nome: "Somar" },
  { id: "sub", simbolo: "−", nome: "Subtrair" },
  { id: "mul", simbolo: "×", nome: "Multiplicar" },
  { id: "div", simbolo: "÷", nome: "Dividir" },
];

const EXEMPLOS_CONTINUOS = [
  "sin(t)",
  "exp(-abs(t))",
  "t^2",
  "cos(2*pi*t/5)",
  "(t >= 0)",
];
const EXEMPLOS_DISCRETOS = [
  "n",
  "0.8^abs(n)",
  "cos(pi*n/4)",
  "(n >= 0)",
  "n^2",
];

const CORES = {
  original: "rgba(148, 163, 184, 0.9)",
  principal: "#3b82f6",
  sinal1: "rgba(239, 68, 68, 0.75)",
  sinal2: "rgba(16, 185, 129, 0.75)",
  convolucao: "#10b981",
};

const FONTE_GRAFICO =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/* ------------------------------------------------------------------ */
/* Funções auxiliares                                                  */
/* ------------------------------------------------------------------ */

const regexVariavel = (v: Variavel, flags = "") =>
  new RegExp(`(^|[^a-zA-Z_])${v}(?![a-zA-Z_])`, flags);

/** Descobre se a expressão usa t ou n (sem confundir o "n" de "sin"). */
const detectarVariavel = (eq: string, isDiscrete: boolean): Variavel => {
  const usaT = regexVariavel("t").test(eq);
  const usaN = regexVariavel("n").test(eq);
  if (usaN && !usaT) return "n";
  if (usaT && !usaN) return "t";
  return isDiscrete ? "n" : "t";
};

/** Eixo de -10 a 10 sem acumular erro de ponto flutuante. */
const gerarEixo = (isDiscrete: boolean) => {
  const passo = isDiscrete ? 1 : 0.05;
  const total = Math.round(20 / passo);
  return Array.from({ length: total + 1 }, (_, i) =>
    Number((-10 + i * passo).toFixed(4)),
  );
};

const paraNumero = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v === "boolean") return v ? 1 : 0; // permite degraus como (t >= 0)
  if (v && typeof v === "object" && "re" in v && "im" in v) {
    const c = v as { re: number; im: number };
    return Math.abs(c.im) < 1e-12 ? c.re : NaN;
  }
  return NaN;
};

const compilar = (
  eq: string,
): { expr: Compilado | null; erro: string | null } => {
  if (!eq.trim()) return { expr: null, erro: null };
  try {
    const expr = math.compile(sanitizarExpressao(eq)) as Compilado;
    expr.evaluate({ t: 1, n: 1 }); // detecta símbolos desconhecidos já aqui
    return { expr, erro: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return {
      expr: null,
      erro: msg.includes("Undefined symbol")
        ? `Símbolo desconhecido: ${msg.replace("Undefined symbol", "").trim()}`
        : "Expressão inválida. Confira parênteses e operadores.",
    };
  }
};

const avaliar = (expr: Compilado, x: number) => {
  try {
    return paraNumero(expr.evaluate({ t: x, n: x }));
  } catch {
    return NaN;
  }
};

const fmt = (x: number) => String(Number(x.toFixed(4)));

/**
 * Monta o argumento a·v + b em três estilos:
 * - "parser":   2*t - 1   (para o mathjs)
 * - "legivel":  2t − 1    (para mostrar ao usuário)
 * - "compacto": 2t-1      (formato do guia de sistemas)
 */
const argumento = (
  a: number,
  b: number,
  v: Variavel,
  estilo: "parser" | "legivel" | "compacto",
) => {
  if (a === 0) return fmt(b);
  const mult = estilo === "parser" ? "*" : "";
  let s = a === 1 ? v : a === -1 ? `-${v}` : `${fmt(a)}${mult}${v}`;
  if (b !== 0) {
    const sinal = b > 0 ? "+" : estilo === "legivel" ? "−" : "-";
    s +=
      estilo === "compacto"
        ? `${sinal}${fmt(Math.abs(b))}`
        : ` ${sinal} ${fmt(Math.abs(b))}`;
  }
  return s;
};

const sinalDe = (v: Variavel, arg: string) =>
  v === "n" ? `x[${arg}]` : `x(${arg})`;

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

function useMediaQuery(query: string) {
  const [match, setMatch] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const atualizar = () => setMatch(mq.matches);
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, [query]);
  return match;
}

function temaInicial(): boolean {
  try {
    const salvo = localStorage.getItem("tema");
    if (salvo) return salvo === "escuro";
  } catch {
    /* localStorage indisponível */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/* ------------------------------------------------------------------ */
/* Campo numérico com botões − / + (bom para o polegar)                */
/* ------------------------------------------------------------------ */

interface StepperProps {
  id: string;
  label: string;
  dica?: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}

function NumberStepper({
  id,
  label,
  dica,
  value,
  step,
  onChange,
}: StepperProps) {
  // Texto local: permite digitar "-" ou "0." sem o valor virar 0 no meio
  const [texto, setTexto] = useState(String(value));

  useEffect(() => {
    setTexto((t) =>
      parseFloat(t.replace(",", ".")) === value ? t : String(value),
    );
  }, [value]);

  const digitar = (s: string) => {
    setTexto(s);
    const v = parseFloat(s.replace(",", "."));
    if (!Number.isNaN(v)) onChange(v);
  };

  const passo = (dir: 1 | -1) => {
    const v = Number((value + dir * step).toFixed(6));
    onChange(v);
    setTexto(String(v));
  };

  return (
    <div className="input-group">
      <label htmlFor={id}>
        {label} {dica && <span>{dica}</span>}
      </label>
      <div className="stepper">
        <button
          type="button"
          onClick={() => passo(-1)}
          aria-label={`Diminuir ${label}`}
        >
          −
        </button>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className="mono"
          value={texto}
          onChange={(e) => digitar(e.target.value)}
          onBlur={() => setTexto(String(value))}
          onFocus={(e) => e.currentTarget.select()}
          enterKeyHint="done"
        />
        <button
          type="button"
          onClick={() => passo(1)}
          aria-label={`Aumentar ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const [activeTab, setActiveTab] = useState<Aba>("transform");
  const [isDiscrete, setIsDiscrete] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(temaInicial);

  const [equation, setEquation] = useState<string>("");
  const [k, setK] = useState<number>(1);
  const [a, setA] = useState<number>(1);
  const [b, setB] = useState<number>(0);

  const [eq1, setEq1] = useState<string>("");
  const [eq2, setEq2] = useState<string>("");
  const [operation, setOperation] = useState<Operacao>("add");

  const [showSignal1, setShowSignal1] = useState<boolean>(true);
  const [showSignal2, setShowSignal2] = useState<boolean>(true);
  const [showResult, setShowResult] = useState<boolean>(true);

  const [systemPlotData, setSystemPlotData] = useState<{
    x: number[];
    y: number[];
  } | null>(null);

  const [copiado, setCopiado] = useState(false);
  const [graficoVisivel, setGraficoVisivel] = useState(true);

  const chartDiv = useRef<HTMLDivElement>(null);
  const chartContainer = useRef<HTMLDivElement>(null);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const varDominio: Variavel = isDiscrete ? "n" : "t";
  const exemplos = isDiscrete ? EXEMPLOS_DISCRETOS : EXEMPLOS_CONTINUOS;

  /* ---------- Tema: salva escolha e pinta a barra do navegador ---------- */
  useEffect(() => {
    try {
      localStorage.setItem("tema", isDarkMode ? "escuro" : "claro");
    } catch {
      /* ignora */
    }
    const fundo = isDarkMode ? "#0b1120" : "#f1f5f9";
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
    document.body.style.backgroundColor = fundo;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", fundo);
  }, [isDarkMode]);

  /* ---------- Fórmulas derivadas ---------- */
  const varEquacao = detectarVariavel(equation, isDiscrete);

  const derivedEquation = useMemo(() => {
    if (!equation.trim()) return "";
    const arg = argumento(a, b, varEquacao, "parser");
    let nova =
      a === 1 && b === 0
        ? equation
        : equation.replace(
            regexVariavel(varEquacao, "g"),
            (_m, prefixo) => `${prefixo}(${arg})`,
          );
    if (k !== 1) nova = `${fmt(k)} * (${nova})`;
    return nova;
  }, [equation, k, a, b, varEquacao]);

  const formulaLegivel = useMemo(() => {
    const saida = varDominio === "n" ? "y[n]" : "y(t)";
    const ganho = k === 1 ? "" : k === -1 ? "−" : `${fmt(k)}·`;
    return `${saida} = ${ganho}${sinalDe(varDominio, argumento(a, b, varDominio, "legivel"))}`;
  }, [k, a, b, varDominio]);

  /** Sentença no formato do guia de sistemas, ex.: y(t) = 2*x(2t-1) */
  const sentencaSistema = useMemo(() => {
    const saida = varDominio === "n" ? "y[n]" : "y(t)";
    const ganho = k === 1 ? "" : `${fmt(k)}*`;
    return `${saida} = ${ganho}${sinalDe(varDominio, argumento(a, b, varDominio, "compacto"))}`;
  }, [k, a, b, varDominio]);

  /* ---------- Dados ---------- */
  const transformData = useMemo(() => {
    const tValues = gerarEixo(isDiscrete);
    const { expr, erro } = compilar(equation);
    if (!expr)
      return {
        tValues,
        yOriginal: [] as number[],
        yTransformed: [] as number[],
        erro,
      };

    const yOriginal = tValues.map((t) => avaliar(expr, t));
    const yTransformed = tValues.map((t) => {
      const tt = Number((a * t + b).toFixed(9));
      if (isDiscrete && !Number.isInteger(tt)) return 0;
      return k * avaliar(expr, tt);
    });
    return { tValues, yOriginal, yTransformed, erro: null };
  }, [equation, k, a, b, isDiscrete]);

  const operationData = useMemo(() => {
    const tValues = gerarEixo(isDiscrete);
    const c1 = compilar(eq1);
    const c2 = compilar(eq2);
    const vazio = {
      tValues,
      y1: [] as number[],
      y2: [] as number[],
      yResult: [] as number[],
    };

    const y1 = c1.expr ? tValues.map((t) => avaliar(c1.expr!, t)) : [];
    const y2 = c2.expr ? tValues.map((t) => avaliar(c2.expr!, t)) : [];
    if (!c1.expr || !c2.expr)
      return { ...vazio, y1, y2, erro1: c1.erro, erro2: c2.erro };

    const yResult = tValues.map((_, i) => {
      const v1 = y1[i];
      const v2 = y2[i];
      switch (operation) {
        case "add":
          return v1 + v2;
        case "sub":
          return v1 - v2;
        case "mul":
          return v1 * v2;
        case "div":
          return v2 !== 0 ? v1 / v2 : NaN;
      }
    });
    return { tValues, y1, y2, yResult, erro1: null, erro2: null };
  }, [eq1, eq2, operation, isDiscrete]);

  /* ---------- Gráfico ---------- */
  useEffect(() => {
    const el = chartDiv.current;
    if (!el) return;

    const cores = isDarkMode
      ? {
          grade: "#334155",
          texto: "#e2e8f0",
          suave: "#94a3b8",
          fundo: "#0f172a",
        }
      : {
          grade: "#e2e8f0",
          texto: "#0f172a",
          suave: "#64748b",
          fundo: "#f8fafc",
        };

    // Discreto vira gráfico de hastes (haste fina + bolinha); contínuo vira linha
    const criarTraces = (
      x: number[],
      y: number[],
      nome: string,
      cor: string,
      discreto: boolean,
      estilo: { tracejado?: "dash" | "dot"; largura?: number } = {},
    ): any[] => {
      if (!y.length) return [];
      const eixo = discreto ? "n" : "t";
      const hover = `${eixo}=%{x}<br>%{y:.4g}<extra>${nome}</extra>`;
      if (discreto) {
        return [
          {
            x,
            y,
            type: "bar",
            width: 0.06,
            marker: { color: cor },
            name: nome,
            legendgroup: nome,
            hoverinfo: "skip",
          },
          {
            x,
            y,
            type: "scatter",
            mode: "markers",
            marker: { color: cor, size: isMobile ? 6 : 8 },
            name: nome,
            legendgroup: nome,
            showlegend: false,
            hovertemplate: hover,
          },
        ];
      }
      return [
        {
          x,
          y,
          type: "scatter",
          mode: "lines",
          name: nome,
          hovertemplate: hover,
          line: {
            color: cor,
            width: estilo.largura ?? 2,
            dash: estilo.tracejado ?? "solid",
          },
        },
      ];
    };

    let traces: any[] = [];
    if (activeTab === "transform") {
      const { tValues, yOriginal, yTransformed } = transformData;
      traces = [
        ...criarTraces(
          tValues,
          yOriginal,
          isDiscrete ? "Original x[n]" : "Original x(t)",
          CORES.original,
          isDiscrete,
          { tracejado: "dash" },
        ),
        ...criarTraces(
          tValues,
          yTransformed,
          formulaLegivel,
          CORES.principal,
          isDiscrete,
          { largura: 2.5 },
        ),
      ];
    } else if (activeTab === "operations") {
      const { tValues, y1, y2, yResult } = operationData;
      const simbolo = OPERACOES.find((o) => o.id === operation)?.simbolo;
      if (showSignal1)
        traces.push(
          ...criarTraces(tValues, y1, "Sinal 1", CORES.sinal1, isDiscrete, {
            tracejado: "dot",
          }),
        );
      if (showSignal2)
        traces.push(
          ...criarTraces(tValues, y2, "Sinal 2", CORES.sinal2, isDiscrete, {
            tracejado: "dot",
          }),
        );
      if (showResult)
        traces.push(
          ...criarTraces(
            tValues,
            yResult,
            `Resultado (${simbolo})`,
            CORES.principal,
            isDiscrete,
            { largura: 2.5 },
          ),
        );
    } else if (systemPlotData && systemPlotData.x.length) {
      traces = criarTraces(
        systemPlotData.x,
        systemPlotData.y,
        "y[n] = x[n] * h[n]",
        CORES.convolucao,
        true,
      );
    }

    const vazio = traces.length === 0;
    const mensagemVazia =
      activeTab === "system"
        ? "Calcule uma convolução para ver y[n]"
        : "Digite uma função para ver o gráfico";

    const tituloX =
      isDiscrete || activeTab === "system" ? "Amostras [n]" : "Tempo (t)";

    const layout: any = {
      autosize: true,
      height: isMobile ? 320 : 420,
      font: {
        color: cores.texto,
        family: FONTE_GRAFICO,
        size: isMobile ? 11 : 13,
      },
      showlegend: !vazio,
      legend: { orientation: "h", x: 0, y: 1.02, yanchor: "bottom" },
      margin: {
        t: isMobile ? 36 : 44,
        r: 12,
        l: isMobile ? 36 : 50,
        b: isMobile ? 40 : 48,
      },
      xaxis: {
        title: { text: tituloX },
        gridcolor: cores.grade,
        zerolinecolor: cores.suave,
        visible: !vazio,
        fixedrange: isMobile, // no celular o arraste rola a página, não dá zoom sem querer
      },
      yaxis: {
        title: { text: "Amplitude" },
        gridcolor: cores.grade,
        zerolinecolor: cores.suave,
        visible: !vazio,
        fixedrange: isMobile,
      },
      barmode: "overlay",
      dragmode: isMobile ? false : "zoom",
      hovermode: "closest",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: vazio ? "rgba(0,0,0,0)" : cores.fundo,
      uirevision: `${activeTab}-${isDiscrete}`, // mantém o zoom ao editar valores
      annotations: vazio
        ? [
            {
              text: mensagemVazia,
              showarrow: false,
              xref: "paper",
              yref: "paper",
              x: 0.5,
              y: 0.5,
              font: { size: 14, color: cores.suave },
            },
          ]
        : [],
    };

    const config: any = {
      responsive: true,
      displaylogo: false,
      scrollZoom: false,
      displayModeBar: isMobile ? false : "hover",
      modeBarButtonsToRemove: ["lasso2d", "select2d"],
      locale: "pt-BR",
    };

    Plotly.react(el, traces, layout, config);
  }, [
    activeTab,
    transformData,
    operationData,
    isDiscrete,
    formulaLegivel,
    operation,
    showSignal1,
    showSignal2,
    showResult,
    systemPlotData,
    isDarkMode,
    isMobile,
  ]);

  // Libera a memória do Plotly ao desmontar
  useEffect(() => {
    const el = chartDiv.current;
    return () => {
      if (el) Plotly.purge(el);
    };
  }, []);

  /* ---------- Botão flutuante "Ver gráfico" no celular ---------- */
  useEffect(() => {
    const el = chartContainer.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(
      ([entrada]) => setGraficoVisivel(entrada.isIntersecting),
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const irParaGrafico = () => {
    (document.activeElement as HTMLElement | null)?.blur(); // fecha o teclado
    chartContainer.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /* ---------- Ações ---------- */
  const restaurarTransformacao = () => {
    setK(1);
    setA(1);
    setB(0);
  };

  const copiarSentenca = async () => {
    try {
      await navigator.clipboard.writeText(derivedEquation);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* sem permissão de área de transferência */
    }
  };

  /* ---------- Interface ---------- */
  return (
    <div className={`app-wrapper ${isDarkMode ? "dark" : ""}`}>
      <div className="container">
        <header className="app-header">
          <div>
            <h1>Análise de Sinais e Sistemas</h1>
            <p className="subtitle">Transformações, operações e convolução</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setIsDarkMode((d) => !d)}
            aria-label={isDarkMode ? "Ativar modo claro" : "Ativar modo escuro"}
            title={isDarkMode ? "Modo claro" : "Modo escuro"}
          >
            <span aria-hidden="true">{isDarkMode ? "☀️" : "🌙"}</span>
            <span className="hide-mobile">
              {isDarkMode ? "Modo claro" : "Modo escuro"}
            </span>
          </button>
        </header>

        <div
          className="segmented"
          role="radiogroup"
          aria-label="Domínio do tempo"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!isDiscrete}
            className={!isDiscrete ? "active" : ""}
            onClick={() => setIsDiscrete(false)}
          >
            Contínuo <span className="mono">x(t)</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isDiscrete}
            className={isDiscrete ? "active" : ""}
            onClick={() => setIsDiscrete(true)}
          >
            Discreto <span className="mono">x[n]</span>
          </button>
        </div>

        <nav className="tabs" role="tablist" aria-label="Seções">
          {ABAS.map((aba) => (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={activeTab === aba.id}
              className={activeTab === aba.id ? "active" : ""}
              onClick={() => setActiveTab(aba.id)}
            >
              <span aria-hidden="true">{aba.icone}</span> {aba.rotulo}
            </button>
          ))}
        </nav>

        {activeTab === "transform" && (
          <div className="panel">
            <ExpressionInput
              id="eq-transform"
              label={`Função original ${varDominio === "n" ? "x[n]" : "x(t)"}`}
              value={equation}
              onChange={setEquation}
              placeholder={isDiscrete ? "ex.: 0.8^abs(n)" : "ex.: sin(t)"}
              exemplos={exemplos}
              variavel={varDominio}
              erro={transformData.erro}
            />

            <div className="controls-grid">
              <NumberStepper
                id="k"
                label="Amplitude (K)"
                value={k}
                step={0.5}
                onChange={setK}
              />
              <NumberStepper
                id="a"
                label="Escala (a)"
                dica="a < 0 inverte"
                value={a}
                step={isDiscrete ? 1 : 0.5}
                onChange={setA}
              />
              <NumberStepper
                id="b"
                label="Deslocamento (b)"
                value={b}
                step={isDiscrete ? 1 : 0.5}
                onChange={setB}
              />
            </div>

            <div className="button-row">
              <button
                type="button"
                className="btn-ghost"
                onClick={restaurarTransformacao}
              >
                ↺ Restaurar K, a e b
              </button>
            </div>

            <div className="derived-equation-box">
              <div className="derived-header">
                <label>Sentença pronta</label>
                {derivedEquation && (
                  <button
                    type="button"
                    className="btn-ghost small"
                    onClick={copiarSentenca}
                  >
                    {copiado ? "✓ Copiado" : "Copiar"}
                  </button>
                )}
              </div>
              <p className="formula-caption mono">{formulaLegivel}</p>
              <div className="equation-output">
                {derivedEquation || (
                  <span className="muted">Digite uma função acima</span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "operations" && (
          <div className="panel">
            <ExpressionInput
              id="eq1"
              label="Sinal 1"
              value={eq1}
              onChange={setEq1}
              placeholder={isDiscrete ? "ex.: n" : "ex.: sin(t)"}
              exemplos={exemplos}
              variavel={varDominio}
              erro={operationData.erro1}
            />

            <div className="input-group">
              <label id="op-label">Operação</label>
              <div
                className="op-picker"
                role="radiogroup"
                aria-labelledby="op-label"
              >
                {OPERACOES.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    role="radio"
                    aria-checked={operation === op.id}
                    aria-label={op.nome}
                    title={op.nome}
                    className={operation === op.id ? "active" : ""}
                    onClick={() => setOperation(op.id)}
                  >
                    {op.simbolo}
                  </button>
                ))}
              </div>
            </div>

            <ExpressionInput
              id="eq2"
              label="Sinal 2"
              value={eq2}
              onChange={setEq2}
              placeholder={isDiscrete ? "ex.: (n >= 0)" : "ex.: exp(-abs(t))"}
              exemplos={exemplos}
              variavel={varDominio}
              erro={operationData.erro2}
            />

            <div
              className="visibility-controls"
              aria-label="Mostrar no gráfico"
            >
              {[
                {
                  rotulo: "Sinal 1",
                  cor: "red",
                  ativo: showSignal1,
                  set: setShowSignal1,
                },
                {
                  rotulo: "Sinal 2",
                  cor: "green",
                  ativo: showSignal2,
                  set: setShowSignal2,
                },
                {
                  rotulo: "Resultado",
                  cor: "blue",
                  ativo: showResult,
                  set: setShowResult,
                },
              ].map((item) => (
                <label
                  key={item.rotulo}
                  className={`toggle-chip ${item.ativo ? "on" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={item.ativo}
                    onChange={(e) => item.set(e.target.checked)}
                  />
                  <span className={`dot ${item.cor}`} /> {item.rotulo}
                </label>
              ))}
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <TabSystemAnalysis
            key={sentencaSistema}
            defaultEq={sentencaSistema}
            isDiscrete={isDiscrete}
            onPlot={(x, y) => setSystemPlotData({ x, y })}
          />
        )}

        <div className="chart-container" ref={chartContainer}>
          <div ref={chartDiv} className="chart" />
        </div>
      </div>

      {isMobile && !graficoVisivel && (
        <button type="button" className="fab" onClick={irParaGrafico}>
          📈 Ver gráfico
        </button>
      )}
    </div>
  );
}
