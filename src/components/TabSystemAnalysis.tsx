import React, { useState } from "react";
import { analisarPropriedadesSistema } from "../utils/mathParser";
import { calcularConvolucaoDiscreta } from "../utils/convolutions";

interface Props {
  defaultEq: string;
  isDiscrete: boolean;
  onPlot: (x: number[], y: number[]) => void;
}

export const TabSystemAnalysis: React.FC<Props> = ({ defaultEq, onPlot }) => {
  const [systemEq, setSystemEq] = useState<string>(defaultEq);
  const [convSig1, setConvSig1] = useState<string>("");
  const [convSig2, setConvSig2] = useState<string>("");
  const [convResult, setConvResult] = useState<number[] | null>(null);

  const propsSistema = analisarPropriedadesSistema(systemEq);

  const executarConvolucao = () => {
    const arrX = convSig1
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n));
    const arrH = convSig2
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n));
    const res = calcularConvolucaoDiscreta(arrX, arrH);
    setConvResult(res);

    const eixosX = Array.from({ length: res.length }, (_, i) => i);
    onPlot(eixosX, res);
  };

  return (
    <div className="panel">
      <h3>🔍 Análise de Propriedades de Sistemas LTI</h3>
      <div
        className="info-box"
        style={{
          background: "rgba(59, 130, 246, 0.1)",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "15px",
        }}
      >
        <p style={{ margin: "0 0 10px 0" }}>
          <strong>💡 Guia de Formatação de Sentenças:</strong>
        </p>
        <ul
          style={{
            margin: "0 0 0 20px",
            fontSize: "0.9rem",
            lineHeight: "1.6",
          }}
        >
          <li>
            <strong>Constantes e Somas:</strong> <code>y(t) = x(t) + 3</code>
          </li>
          <li>
            <strong>Escalonamento/Inversão:</strong> <code>y(t) = x(2t)</code>{" "}
            ou <code>y(t) = x(-t)</code>
          </li>
          <li>
            <strong>Deslocamentos:</strong> <code>y(t) = x(t-2)</code> ou{" "}
            <code>y(t) = x(t+2)</code>
          </li>
          <li>
            <strong>Variável multiplicando:</strong> <code>y(t) = t*x(t)</code>{" "}
            ou <code>y[n] = n x[n]</code>
          </li>
          <li>
            <strong>Potências e Não-Lineares:</strong>{" "}
            <code>y(t) = x(t)^2</code> ou <code>y(t) = cos(x(t))</code>
          </li>
          <li>
            <strong>Derivadas e Integrais:</strong>{" "}
            <code>y(t) = d/dt x(t)</code> ou <code>y(t) = int x(t)</code>
          </li>
        </ul>
      </div>

      <div className="input-group">
        <label>Equação de Saída y(t) ou y[n]:</label>
        <input
          type="text"
          value={systemEq}
          onChange={(e) => setSystemEq(e.target.value)}
        />
      </div>

      <div
        className="properties-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          margin: "1rem 0",
        }}
      >
        <div
          className="prop-card"
          style={{
            padding: "1rem",
            background: "rgba(59, 130, 246, 0.1)",
            borderRadius: "8px",
          }}
        >
          <strong>Memória:</strong>{" "}
          {propsSistema.temMemoria
            ? "O sistema possui Memória (depende de instantes passados/futuros)"
            : "Sistema sem Memória (resposta puramente instantânea)"}
        </div>
        <div
          className="prop-card"
          style={{
            padding: "1rem",
            background: "rgba(16, 185, 129, 0.1)",
            borderRadius: "8px",
          }}
        >
          <strong>Causalidade:</strong>{" "}
          {propsSistema.causal
            ? "Causal (não depende de valores futuros)"
            : "Não-Causal (depende de valores futuros do tempo)"}
        </div>
        <div
          className="prop-card"
          style={{
            padding: "1rem",
            background: "rgba(239, 68, 68, 0.1)",
            borderRadius: "8px",
          }}
        >
          <strong>Linearidade:</strong>{" "}
          {propsSistema.linear
            ? "Linear (satisfaz superposição e homogeneidade)"
            : "Não-Linear"}
        </div>
        <div
          className="prop-card"
          style={{
            padding: "1rem",
            background: "rgba(245, 158, 11, 0.1)",
            borderRadius: "8px",
          }}
        >
          <strong>Invariância no Tempo:</strong>{" "}
          {propsSistema.invarianteNoTempo
            ? "Invariante no tempo"
            : "Variante no tempo"}
        </div>
      </div>

      <hr style={{ margin: "2rem 0", borderColor: "#e5e7eb" }} />

      <h3>⚡ Módulo de Convolução Discreta (Vetores)</h3>
      <div className="controls-grid">
        <div className="input-group">
          <label>Vetor x (separado por vírgula):</label>
          <input
            type="text"
            value={convSig1}
            onChange={(e) => setConvSig1(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>Vetor h (separado por vírgula):</label>
          <input
            type="text"
            value={convSig2}
            onChange={(e) => setConvSig2(e.target.value)}
          />
        </div>
      </div>
      <button
        className="theme-btn"
        onClick={executarConvolucao}
        style={{ marginTop: "1rem", width: "100%" }}
      >
        Calcular y = conv(x, h)
      </button>

      {convResult && (
        <div className="derived-equation-box" style={{ marginTop: "1rem" }}>
          <label>Resultado y:</label>
          <div className="equation-output">y = [{convResult.join(", ")}]</div>
        </div>
      )}
    </div>
  );
};
