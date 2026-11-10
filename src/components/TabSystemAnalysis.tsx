import React, { useMemo, useState } from "react";
import { analisarPropriedadesSistema } from "../utils/mathParser";
import { calcularConvolucaoDiscreta } from "../utils/convolutions";

interface Props {
  defaultEq: string;
  isDiscrete: boolean;
  onPlot: (x: number[], y: number[]) => void;
}

const GUIA: { titulo: string; continuo: string[]; discreto: string[] }[] = [
  {
    titulo: "Constantes e somas",
    continuo: ["y(t) = x(t) + 3"],
    discreto: ["y[n] = x[n] + 3"],
  },
  {
    titulo: "Escalonamento / inversão",
    continuo: ["y(t) = x(2t)", "y(t) = x(-t)"],
    discreto: ["y[n] = x[2n]", "y[n] = x[-n]"],
  },
  {
    titulo: "Deslocamentos",
    continuo: ["y(t) = x(t-2)", "y(t) = x(t+2)"],
    discreto: ["y[n] = x[n-2]", "y[n] = x[n+2]"],
  },
  {
    titulo: "Variável multiplicando",
    continuo: ["y(t) = t*x(t)"],
    discreto: ["y[n] = n x[n]"],
  },
  {
    titulo: "Potências e não lineares",
    continuo: ["y(t) = x(t)^2", "y(t) = cos(x(t))"],
    discreto: ["y[n] = x[n]^2", "y[n] = cos(x[n])"],
  },
  {
    titulo: "Derivadas e integrais",
    continuo: ["y(t) = d/dt x(t)", "y(t) = int x(t)"],
    discreto: ["y[n] = x[n] - x[n-1]"],
  },
];

const lerVetor = (
  texto: string,
): { valores: number[]; erro: string | null } => {
  const partes = texto.split(/[;,\s]+/).filter((p) => p !== "");
  if (partes.length === 0) {
    return { valores: [], erro: "Informe ao menos um valor." };
  }
  const valores = partes.map(Number);
  const invalido = partes.find((_, i) => Number.isNaN(valores[i]));
  if (invalido !== undefined) {
    return {
      valores: [],
      erro: `Valor inválido: "${invalido}". Use ponto para decimais (ex.: 0.5).`,
    };
  }
  return { valores, erro: null };
};

const arredondar = (v: number) => Number(v.toFixed(6));

export const TabSystemAnalysis: React.FC<Props> = ({
  defaultEq,
  isDiscrete,
  onPlot,
}) => {
  const [systemEq, setSystemEq] = useState<string>(defaultEq);
  const [convSig1, setConvSig1] = useState<string>("");
  const [convSig2, setConvSig2] = useState<string>("");
  const [convResult, setConvResult] = useState<number[] | null>(null);
  const [erroX, setErroX] = useState<string | null>(null);
  const [erroH, setErroH] = useState<string | null>(null);
  const [guiaAberto, setGuiaAberto] = useState<boolean>(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 769px)").matches,
  );

  const propsSistema = useMemo(() => {
    if (!systemEq.trim()) return null;
    try {
      return analisarPropriedadesSistema(systemEq);
    } catch {
      return null;
    }
  }, [systemEq]);

  const cards = propsSistema
    ? [
        {
          titulo: "Memória",
          valor: propsSistema.temMemoria,
          sim: "Com memória",
          nao: "Sem memória",
          descSim: "Depende de instantes passados ou futuros.",
          descNao: "Resposta puramente instantânea.",
          cor: "blue",
        },
        {
          titulo: "Causalidade",
          valor: propsSistema.causal,
          sim: "Causal",
          nao: "Não causal",
          descSim: "Não depende de valores futuros.",
          descNao: "Depende de valores futuros do tempo.",
          cor: "green",
        },
        {
          titulo: "Linearidade",
          valor: propsSistema.linear,
          sim: "Linear",
          nao: "Não linear",
          descSim: "Satisfaz superposição e homogeneidade.",
          descNao: "Não satisfaz a superposição.",
          cor: "red",
        },
        {
          titulo: "Invariância no tempo",
          valor: propsSistema.invarianteNoTempo,
          sim: "Invariante",
          nao: "Variante",
          descSim: "Atrasar a entrada só atrasa a saída.",
          descNao: "O comportamento muda ao longo do tempo.",
          cor: "amber",
        },
      ]
    : [];

  const executarConvolucao = (e?: React.FormEvent) => {
    e?.preventDefault();
    const x = lerVetor(convSig1);
    const h = lerVetor(convSig2);
    setErroX(x.erro);
    setErroH(h.erro);
    if (x.erro || h.erro) return;

    (document.activeElement as HTMLElement | null)?.blur();
    const res = calcularConvolucaoDiscreta(x.valores, h.valores).map(
      arredondar,
    );
    setConvResult(res);
    onPlot(
      Array.from({ length: res.length }, (_, i) => i),
      res,
    );
  };

  const carregarExemplo = () => {
    setConvSig1("1, 2, 3");
    setConvSig2("1, 1, 1");
    setErroX(null);
    setErroH(null);
  };

  const limparConvolucao = () => {
    setConvSig1("");
    setConvSig2("");
    setConvResult(null);
    setErroX(null);
    setErroH(null);
    onPlot([], []);
  };

  const v = isDiscrete ? "n" : "t";
  const saida = isDiscrete ? "y[n]" : "y(t)";

  return (
    <div className="panel">
      <h2 className="panel-title">🔍 Propriedades de sistemas</h2>

      <details
        className="info-box"
        open={guiaAberto}
        onToggle={(e) => setGuiaAberto(e.currentTarget.open)}
      >
        <summary>💡 Guia de formatação — toque num exemplo para usar</summary>
        <ul className="guide-list">
          {GUIA.map((item) => (
            <li key={item.titulo}>
              <strong>{item.titulo}</strong>
              <div className="guide-chips">
                {(isDiscrete ? item.discreto : item.continuo).map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    className="chip chip-example mono"
                    onClick={() => setSystemEq(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </details>

      <div className="input-group">
        <label htmlFor="system-eq">Equação de saída {saida}</label>
        <div className="input-wrap">
          <input
            id="system-eq"
            type="text"
            className="mono"
            value={systemEq}
            placeholder={isDiscrete ? "y[n] = x[n-1]" : "y(t) = x(t-2)"}
            onChange={(e) => setSystemEq(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
          />
          {systemEq && (
            <button
              type="button"
              className="clear-btn"
              aria-label="Limpar equação"
              onClick={() => setSystemEq("")}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {propsSistema ? (
        <div className="properties-grid" aria-live="polite">
          {cards.map((c) => (
            <div key={c.titulo} className={`prop-card ${c.cor}`}>
              <div className="prop-head">
                <span className="prop-title">{c.titulo}</span>
                <span className={`badge ${c.valor ? "yes" : "no"}`}>
                  {c.valor ? "✓" : "✗"} {c.valor ? c.sim : c.nao}
                </span>
              </div>
              <p>{c.valor ? c.descSim : c.descNao}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">
          Digite uma sentença válida (ex.: <code>{`y(${v}) = x(${v}-2)`}</code>)
          para ver as propriedades.
        </p>
      )}

      <hr className="divider" />

      <h2 className="panel-title">⚡ Convolução discreta</h2>
      <p className="muted small">
        Separe os valores por vírgula ou espaço. O primeiro valor é a amostra n
        = 0.
      </p>

      <form onSubmit={executarConvolucao} noValidate>
        <div className="controls-grid">
          <div className="input-group">
            <label htmlFor="conv-x">Vetor x[n]</label>
            <input
              id="conv-x"
              type="text"
              className={`mono ${erroX ? "invalid" : ""}`}
              value={convSig1}
              placeholder="1, 2, 3"
              onChange={(e) => setConvSig1(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="next"
              aria-invalid={!!erroX}
            />
            {erroX && <p className="field-error">{erroX}</p>}
          </div>
          <div className="input-group">
            <label htmlFor="conv-h">Vetor h[n]</label>
            <input
              id="conv-h"
              type="text"
              className={`mono ${erroH ? "invalid" : ""}`}
              value={convSig2}
              placeholder="1, 1, 1"
              onChange={(e) => setConvSig2(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              aria-invalid={!!erroH}
            />
            {erroH && <p className="field-error">{erroH}</p>}
          </div>
        </div>

        <div className="button-row">
          <button type="submit" className="btn-primary">
            Calcular y = x * h
          </button>
          <button type="button" className="btn-ghost" onClick={carregarExemplo}>
            Exemplo
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={limparConvolucao}
          >
            Limpar
          </button>
        </div>
      </form>

      {convResult && (
        <div className="derived-equation-box">
          <label>
            Resultado y[n]{" "}
            <span className="muted small">({convResult.length} amostras)</span>
          </label>
          <div className="result-vector">
            {convResult.map((val, i) => (
              <div className="result-cell" key={i}>
                <span className="result-index">n={i}</span>
                <span className="result-value mono">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
