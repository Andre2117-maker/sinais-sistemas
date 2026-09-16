import { create, all } from "mathjs";

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

export function sanitizarExpressao(expr: string): string {
  if (!expr) return "0";
  let limpa = expr.replace(/\[/g, "(").replace(/\]/g, ")").replace(/·/g, "*");

  limpa = limpa
    .replace(/(\d)(\()/g, "$1*$2")
    .replace(/(\))(\()/g, "$1*$2")
    .replace(/(\d)([a-z_u])/g, "$1*$2")
    .replace(/(\))([a-z_u])/g, "$1*$2");

  return limpa;
}

export function analisarPropriedadesSistema(expr: string) {
  const limpa = expr.toLowerCase();

  // 1. Causalidadade: Detecta termos de avanço (futuro) como t+2 ou n+1
  const temFuturo =
    /[t|n]\s*\+\s*[1-9]/.test(limpa) || /[t|n]\s*\+\s*0\.[1-9]/.test(limpa);

  // 2. Memória: Se depende de t ou n e possui deslocamentos ou operações dinâmicas
  const temTempo = limpa.includes("t") || limpa.includes("n");
  const temMemoria =
    temTempo &&
    (limpa.includes("+") ||
      limpa.includes("-") ||
      limpa.includes("*") ||
      limpa.includes("/"));

  // 3. Linearidade: Sistemas com potências (ex: t^2, n^2), funções não-lineares (sin, cos, exp) ou produtos cruzados são Não-Lineares
  const ehNaoLinear =
    limpa.includes("^") ||
    limpa.includes("sin") ||
    limpa.includes("cos") ||
    limpa.includes("exp") ||
    limpa.includes("log") ||
    limpa.includes("sqrt");
  const linear = !ehNaoLinear;

  // 4. Invariância no Tempo: Se a variável independente (t ou n) aparece multiplicada por um fator externo (ex: 2*t ou -t), o sistema é variante no tempo
  // Exemplo variante: y(t) = t * u(t) ou y[n] = n * x[n]
  const varianteNoTempo =
    /\b[2-9]\s*\*\s*[tn]\b|\b[2-9][tn]\b|^\s*[tn]\s*\*/.test(limpa);
  const invarianteNoTempo = !varianteNoTempo;

  return {
    temMemoria,
    causal: !temFuturo,
    linear,
    invarianteNoTempo,
  };
}

export { math };
