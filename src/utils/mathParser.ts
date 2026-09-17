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
  const limpa = expr.toLowerCase().replace(/\s+/g, "").replace(/[−–]/g, "-");

  const argInternos = limpa.match(/\([^)]+\)|\[[^\]]+\]/g) || [];
  const arg = argInternos.join("");

  const foraDoArg = limpa
    .replace(/\([^)]+\)|\[[^\]]+\]/g, "")
    .replace(/d\/d[tn]/g, "")
    .replace(/(sin|cos|tan|exp|log|sqrt|int|tau|y|=|x)/g, "");

  const avancoTempo = /[tn]\+[0-9]+/.test(arg);
  const escalaTempo =
    /[0-9]+\*?[tn]/.test(arg) || /\-[tn]/.test(arg) || /[tn]\/[0-9]+/.test(arg);
  const instZero = arg.includes("0");

  const integral = limpa.includes("∫") || limpa.includes("int");
  const integralFuturo = integral && limpa.includes("t+");

  const temFuturo = avancoTempo || escalaTempo || instZero || integralFuturo;

  const deslocamento = /[tn][\+\-][0-9]+/.test(arg);
  const temMemoria = deslocamento || escalaTempo || instZero || integral;

  const somaConstante =
    /[\+\-][0-9]+$/.test(foraDoArg) || /^[0-9]+[\+\-]/.test(foraDoArg);

  const somaSinaisDistintos =
    (limpa.includes("x(t)") || limpa.includes("x[n]")) &&
    (limpa.includes("x(0)") || limpa.includes("x[0]"));

  const naoLinear =
    limpa.includes("^") ||
    limpa.includes("exp") ||
    limpa.includes("log") ||
    limpa.includes("sqrt") ||
    limpa.includes("sin") ||
    limpa.includes("cos") ||
    somaConstante ||
    somaSinaisDistintos;

  const tempoFora = /[tn]/.test(foraDoArg);
  const invariante = !(tempoFora || escalaTempo || instZero);

  return {
    temMemoria,
    causal: !temFuturo,
    linear: !naoLinear,
    invarianteNoTempo: invariante,
  };
}

export { math };
