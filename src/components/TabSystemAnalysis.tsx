import React, { useState } from "react";
import { analisarPropriedadesSistema } from "../utils/mathParser";
import { calcularConvolucao } from "../utils/convolutions";

interface Props {
  defaultEq: string;
  isDiscrete: boolean;
}

export const TabSystemAnalysis: React.FC<Props> = ({
  defaultEq,
  isDiscrete,
}) => {
  const [systemEq, setSystemEq] = useState<string>(defaultEq);
  const [convSig1, setConvSig1] = useState<string>("u(t)");
  const [convSig2, setConvSig2] = useState<string>("u(t) - u(t-2)");
  const [convResult, setConvResult] = useState<any>(null);

  const propsSistema = analisarPropriedadesSistema(systemEq);

  const executarConvolucao = () => {
    const res = calcularConvolucao(convSig1, convSig2, isDiscrete);
    setConvResult(res);
  };

  return (
    <div className="panel">
      <h3>🔍 Análise de Propriedades de Sistemas LTI</h3>
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

      <h3>⚡ Módulo de Convolução</h3>
      <div className="controls-grid">
        <div className="input-group">
          <label>Sinal x(t):</label>
          <input
            type="text"
            value={convSig1}
            onChange={(e) => setConvSig1(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>Resposta ao Impulso h(t):</label>
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
        Calcular Convolução dos Sinais
      </button>

      {convResult && (
        <div className="derived-equation-box" style={{ marginTop: "1rem" }}>
          <label>Status:</label>
          <div className="equation-output">
            Convolução calculada com sucesso! (Verifique o gráfico principal
            gerado).
          </div>
        </div>
      )}
    </div>
  );
};
