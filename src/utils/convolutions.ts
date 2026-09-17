import { math, sanitizarExpressao } from "./mathParser";

export function calcularConvolucao(
  eq1: string,
  eq2: string,
  isDiscrete: boolean,
) {
  const expr1 = math.compile(sanitizarExpressao(eq1));
  const expr2 = math.compile(sanitizarExpressao(eq2));
  const varUsed1 = eq1.includes("n") ? "n" : "t";
  const varUsed2 = eq2.includes("n") ? "n" : "t";

  const range = 5;
  const step = isDiscrete ? 1 : 0.2;
  const tValues: number[] = [];
  const yConv: number[] = [];

  const inputs1: number[] = [];
  const inputs2: number[] = [];
  const domain: number[] = [];

  for (let t = -range; t <= range; t += step) {
    domain.push(t);
    inputs1.push(expr1.evaluate({ [varUsed1]: t }));
    inputs2.push(expr2.evaluate({ [varUsed2]: t }));
  }

  const N = domain.length;
  for (let i = 0; i < N; i++) {
    let sum = 0;
    for (let j = 0; j < N; j++) {
      const k = i - j;
      if (k >= 0 && k < N) {
        sum += inputs1[j] * inputs2[k];
      }
    }
    tValues.push(domain[i]);
    yConv.push(sum * (isDiscrete ? 1 : step));
  }

  return { tValues, yConv };
}

export function calcularConvolucaoDiscreta(vetorX: number[], vetorH: number[]) {
  const lenX = vetorX.length;
  const lenH = vetorH.length;
  const lenY = lenX + lenH - 1;
  const y = new Array(lenY).fill(0);

  for (let i = 0; i < lenX; i++) {
    for (let j = 0; j < lenH; j++) {
      y[i + j] += vetorX[i] * vetorH[j];
    }
  }

  return y;
}
