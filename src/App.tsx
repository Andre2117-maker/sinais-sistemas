import { useState, useEffect, useRef, useMemo } from "react";
import { create, all } from "mathjs";
import Plotly from "plotly.js-basic-dist";
import "./App.css";

const math = create(all, {});

math.import(
  {
    u: function (valor: number) {
      const vArredondado = parseFloat(valor.toFixed(4));
      return vArredondado >= 0 ? 1 : 0;
    },
  },
  { override: true },
);

function sanitizarExpressao(expr: string): string {
  if (!expr) return "0";
  let limpa = expr.replace(/\[/g, "(").replace(/\]/g, ")").replace(/·/g, "*");

  limpa = limpa
    .replace(/(\d)(\()/g, "$1*$2")
    .replace(/(\))(\()/g, "$1*$2")
    .replace(/(\d)([a-z_u])/g, "$1*$2")
    .replace(/(\))([a-z_u])/g, "$1*$2");

  return limpa;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"transform" | "operations">(
    "transform",
  );
  const [isDiscrete, setIsDiscrete] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Estados - Aba 1: Transformações
  const [equation, setEquation] = useState<string>(
    "-u(t+2) + 2u(t+1) + 2u(t) - u(t-1) - 3u(t-2) + 2u(t-3) - u(t-4)",
  );
  const [k, setK] = useState<number>(2);
  const [a, setA] = useState<number>(-1);
  const [b, setB] = useState<number>(2);

  // Estados - Aba 2: Operações
  const [eq1, setEq1] = useState<string>("sin(t)");
  const [eq2, setEq2] = useState<string>("u(t) - u(t-4)");
  const [operation, setOperation] = useState<"add" | "sub" | "mul" | "div">(
    "mul",
  );

  // NOVOS ESTADOS: Controle de visibilidade dos gráficos na Aba de Operações
  const [showSignal1, setShowSignal1] = useState<boolean>(true);
  const [showSignal2, setShowSignal2] = useState<boolean>(true);
  const [showResult, setShowResult] = useState<boolean>(true);

  const chartDiv = useRef<HTMLDivElement>(null);

  // Sentença Pronta (Transformações)
  const derivedEquation = useMemo(() => {
    const varUsed = equation.includes("n") ? "n" : "t";

    let transfArg = "";
    if (a === 1 && b === 0) transfArg = varUsed;
    else if (a === 1) transfArg = `${varUsed} + ${b}`;
    else if (a === -1 && b === 0) transfArg = `-${varUsed}`;
    else if (b === 0) transfArg = `${a}*${varUsed}`;
    else {
      const opB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      transfArg = `${a}*${varUsed} ${opB}`;
    }

    const regex = new RegExp(`\\b${varUsed}\\b`, "g");
    let newEq = equation.replace(regex, `(${transfArg})`);

    if (k !== 1) {
      newEq = `${k} * (${newEq})`;
    }

    return newEq;
  }, [equation, k, a, b]);

  // Lógica da Aba 1: Transformações
  const transformData = useMemo(() => {
    const tValues: number[] = [];
    const yOriginal: number[] = [];
    const yTransformed: number[] = [];

    try {
      const expr = math.compile(sanitizarExpressao(equation));
      const step = isDiscrete ? 1 : 0.1;
      const varUsed = equation.includes("n") ? "n" : "t";

      for (let t = -10; t <= 10; t += step) {
        tValues.push(t);
        yOriginal.push(expr.evaluate({ [varUsed]: t }));

        const transformedT = a * t + b;

        if (isDiscrete && !Number.isInteger(transformedT)) {
          yTransformed.push(0);
        } else {
          const valTransformed = expr.evaluate({ [varUsed]: transformedT });
          yTransformed.push(k * valTransformed);
        }
      }
    } catch (err) {
      // Erro silencioso
    }
    return { tValues, yOriginal, yTransformed };
  }, [equation, k, a, b, isDiscrete]);

  // Lógica da Aba 2: Operações
  const operationData = useMemo(() => {
    const tValues: number[] = [];
    const y1: number[] = [];
    const y2: number[] = [];
    const yResult: number[] = [];

    try {
      const expr1 = math.compile(sanitizarExpressao(eq1));
      const expr2 = math.compile(sanitizarExpressao(eq2));
      const step = isDiscrete ? 1 : 0.1;
      const varUsed1 = eq1.includes("n") ? "n" : "t";
      const varUsed2 = eq2.includes("n") ? "n" : "t";

      for (let t = -10; t <= 10; t += step) {
        tValues.push(t);
        const val1 = expr1.evaluate({ [varUsed1]: t });
        const val2 = expr2.evaluate({ [varUsed2]: t });
        y1.push(val1);
        y2.push(val2);

        let res = 0;
        if (operation === "add") res = val1 + val2;
        else if (operation === "sub") res = val1 - val2;
        else if (operation === "mul") res = val1 * val2;
        else if (operation === "div") res = val2 !== 0 ? val1 / val2 : null;

        yResult.push(res);
      }
    } catch (err) {
      // Erro silencioso
    }
    return { tValues, y1, y2, yResult };
  }, [eq1, eq2, operation, isDiscrete]);

  // Efeito Visual
  useEffect(() => {
    if (!chartDiv.current) return;

    const gridColor = isDarkMode ? "#374151" : "#e5e7eb";
    const textColor = isDarkMode ? "#f3f4f6" : "#1f2937";
    const paperBg = isDarkMode ? "#1f2937" : "transparent";
    const plotBg = isDarkMode ? "#111827" : "#fafafa";

    let traces: any[] = [];

    if (activeTab === "transform") {
      const formulaResultante = isDiscrete
        ? `y[n] = ${k}·x[${a}n + ${b}]`
        : `y(t) = ${k}·x(${a}t + ${b})`;

      traces = [
        {
          x: transformData.tValues,
          y: transformData.yOriginal,
          type: isDiscrete ? "bar" : "scatter",
          mode: isDiscrete ? "markers" : "lines",
          name: isDiscrete ? "Original x[n]" : "Original x(t)",
          ...(isDiscrete
            ? { marker: { color: "rgba(150, 150, 150, 0.7)" }, width: 0.1 }
            : { line: { color: "rgba(150, 150, 150, 0.7)", dash: "dash" } }),
        },
        {
          x: transformData.tValues,
          y: transformData.yTransformed,
          type: isDiscrete ? "bar" : "scatter",
          mode: isDiscrete ? "markers" : "lines",
          name: formulaResultante,
          ...(isDiscrete
            ? { marker: { color: "#3b82f6" }, width: 0.1 }
            : { line: { color: "#3b82f6", width: 2.5 } }),
        },
      ];
    } else {
      const opSymbol = { add: "+", sub: "-", mul: "·", div: "/" }[operation];

      // Adiciona apenas os traços cujos checkboxes estiverem marcados
      if (showSignal1) {
        traces.push({
          x: operationData.tValues,
          y: operationData.y1,
          type: isDiscrete ? "bar" : "scatter",
          mode: isDiscrete ? "markers" : "lines",
          name: "Sinal 1",
          ...(isDiscrete
            ? { marker: { color: "rgba(239, 68, 68, 0.6)" }, width: 0.1 }
            : { line: { color: "rgba(239, 68, 68, 0.6)", dash: "dot" } }),
        });
      }

      if (showSignal2) {
        traces.push({
          x: operationData.tValues,
          y: operationData.y2,
          type: isDiscrete ? "bar" : "scatter",
          mode: isDiscrete ? "markers" : "lines",
          name: "Sinal 2",
          ...(isDiscrete
            ? { marker: { color: "rgba(16, 185, 129, 0.6)" }, width: 0.1 }
            : { line: { color: "rgba(16, 185, 129, 0.6)", dash: "dot" } }),
        });
      }

      if (showResult) {
        traces.push({
          x: operationData.tValues,
          y: operationData.yResult,
          type: isDiscrete ? "bar" : "scatter",
          mode: isDiscrete ? "markers" : "lines",
          name: `Resultado (${opSymbol})`,
          ...(isDiscrete
            ? { marker: { color: "#3b82f6" }, width: 0.1 }
            : { line: { color: "#3b82f6", width: 2.5 } }),
        });
      }
    }

    const layout: any = {
      title: {
        text:
          activeTab === "transform"
            ? "Transformações na Variável Independente"
            : "Operações Matemáticas",
        font: { color: textColor },
      },
      autosize: true,
      font: { color: textColor },
      xaxis: {
        title: isDiscrete ? "Amostras [n]" : "Tempo (t)",
        gridcolor: gridColor,
        zerolinecolor: textColor,
      },
      yaxis: {
        title: "Amplitude",
        gridcolor: gridColor,
        zerolinecolor: textColor,
      },
      paper_bgcolor: paperBg,
      plot_bgcolor: plotBg,
      margin: { t: 50, r: 20, l: 40, b: 40 },
    };

    Plotly.react(chartDiv.current, traces, layout);
  }, [
    activeTab,
    transformData,
    operationData,
    isDiscrete,
    k,
    a,
    b,
    operation,
    showSignal1,
    showSignal2,
    showResult,
    isDarkMode,
  ]);

  const handleNumberInput = (val: string) => (val === "" ? 0 : parseFloat(val));

  return (
    <div className={`app-wrapper ${isDarkMode ? "dark" : ""}`}>
      <div className="container">
        <div className="header-actions">
          <h1>Análise de Sinais e Sistemas</h1>
          <button
            className="theme-btn"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? "☀️ Modo Claro" : "🌙 Modo Escuro"}
          </button>
        </div>

        <div className="global-controls">
          <div className="radio-group">
            <label>
              <input
                type="radio"
                checked={!isDiscrete}
                onChange={() => setIsDiscrete(false)}
              />
              Tempo Contínuo (t)
            </label>
            <label>
              <input
                type="radio"
                checked={isDiscrete}
                onChange={() => setIsDiscrete(true)}
              />
              Tempo Discreto [n]
            </label>
          </div>
        </div>

        <div className="tabs">
          <button
            className={activeTab === "transform" ? "active" : ""}
            onClick={() => setActiveTab("transform")}
          >
            Transformações
          </button>
          <button
            className={activeTab === "operations" ? "active" : ""}
            onClick={() => setActiveTab("operations")}
          >
            Operações entre Sinais
          </button>
        </div>

        {activeTab === "transform" && (
          <div className="panel">
            <div className="info-box">
              <p>
                <strong>💡 Como usar:</strong> Escreva a equação usando{" "}
                <strong>t</strong> (contínuo) ou <strong>n</strong> (discreto).
                O sistema detecta a letra automaticamente!
              </p>
            </div>

            <div className="input-group">
              <label>Função Original: x(t) ou x[n]</label>
              <input
                type="text"
                value={equation}
                onChange={(e) => setEquation(e.target.value)}
              />
            </div>

            <div className="controls-grid">
              <div className="input-group">
                <label>Amplitude (K):</label>
                <input
                  type="number"
                  step="0.5"
                  value={k}
                  onChange={(e) => setK(handleNumberInput(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label>Compressão/Inversão (a):</label>
                <input
                  type="number"
                  step={isDiscrete ? "1" : "0.5"}
                  value={a}
                  onChange={(e) => setA(handleNumberInput(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label>Deslocamento (b):</label>
                <input
                  type="number"
                  step={isDiscrete ? "1" : "0.5"}
                  value={b}
                  onChange={(e) => setB(handleNumberInput(e.target.value))}
                />
              </div>
            </div>

            <div className="derived-equation-box">
              <label>
                Sentença Pronta para Computador (Copie e cole nas Operações):
              </label>
              <div className="equation-output">{derivedEquation}</div>
            </div>
          </div>
        )}

        {activeTab === "operations" && (
          <div className="panel">
            <div className="info-box">
              <p>
                <strong>💡 Dica:</strong> Cole a sentença gerada na aba de
                transformações diretamente em um dos sinais abaixo!
              </p>
            </div>

            <div className="controls-grid">
              <div className="input-group">
                <label>Sinal 1: x₁(t)</label>
                <input
                  type="text"
                  value={eq1}
                  onChange={(e) => setEq1(e.target.value)}
                  placeholder="Cole a sentença aqui..."
                />
              </div>

              <div className="input-group">
                <label>Operação</label>
                <select
                  value={operation}
                  onChange={(e) => setOperation(e.target.value as any)}
                  className="operation-select"
                >
                  <option value="add">Somar (+)</option>
                  <option value="sub">Subtrair (-)</option>
                  <option value="mul">Multiplicar (×)</option>
                  <option value="div">Dividir (÷)</option>
                </select>
              </div>

              <div className="input-group">
                <label>Sinal 2: x₂(t)</label>
                <input
                  type="text"
                  value={eq2}
                  onChange={(e) => setEq2(e.target.value)}
                  placeholder="Cole a sentença aqui..."
                />
              </div>
            </div>

            {/* NOVOS CHECKBOXES PARA EXIBIÇÃO DOS SINAIS */}
            <div className="visibility-controls">
              <label className="checkbox-visibility">
                <input
                  type="checkbox"
                  checked={showSignal1}
                  onChange={(e) => setShowSignal1(e.target.checked)}
                />
                <span className="dot red"></span> Mostrar Sinal 1
              </label>
              <label className="checkbox-visibility">
                <input
                  type="checkbox"
                  checked={showSignal2}
                  onChange={(e) => setShowSignal2(e.target.checked)}
                />
                <span className="dot green"></span> Mostrar Sinal 2
              </label>
              <label className="checkbox-visibility">
                <input
                  type="checkbox"
                  checked={showResult}
                  onChange={(e) => setShowResult(e.target.checked)}
                />
                <span className="dot blue"></span> Mostrar Resultado
              </label>
            </div>
          </div>
        )}

        <div className="chart-container">
          <div
            ref={chartDiv}
            style={{ width: "100%", minHeight: "400px" }}
          ></div>
        </div>
      </div>
    </div>
  );
}
