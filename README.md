# 📊 Simulador de Sinais e Sistemas

Um aplicativo web interativo desenvolvido em **React**, **TypeScript** e **Vite** para visualização, transformação e operações com sinais de tempo contínuo e tempo discreto. O projeto foi construído para auxiliar estudantes na análise de conceitos fundamentais da disciplina de Sinais e Sistemas.

---

## 🚀 Funcionalidades

- **📈 Dualidade de Domínios:** Alternância instantânea entre **Tempo Contínuo ($t$)** e **Tempo Discreto ($n$)**.
- **🔄 Transformações na Variável Independente:**
  - Ajuste de **Amplitude ($K$)** para amplificação ou rebatimento vertical.
  - **Compressão/Inversão ($a$)** e **Deslocamento ($b$)** no tempo.
  - **Gerador Automático de Sentença:** Converte a transformação aplicada em uma expressão matemática pronta para uso.
- **➕ Operações Matemáticas entre Sinais:**
  - Permite inserir dois sinais distintos ($x_1$ e $x_2$) e realizar operações de **Soma (+)**, **Subtração (-)**, **Multiplicação ($\times$)** e **Divisão ($\div$)**.
  - Sistema de **visibilidade modular** (Checkboxes para ligar/desligar a exibição individual do Sinal 1, Sinal 2 e do Resultado).
- **📐 Suporte a Degrau Unitário (`u`):** Avaliação precisa do degrau unitário customizado para criar sinais em escada e recortes temporais.
- **🌙 Tema Escuro (Dark Mode):** Alternância fluida entre Modo Claro e Modo Escuro com adaptação automática das cores dos gráficos.

---

## 🛠️ Tecnologias Utilizadas

- **React** (Biblioteca de interface)
- **TypeScript** (Tipagem estática)
- **Vite** (Empacotador e servidor de desenvolvimento ultrarrápido)
- **Math.js** (Motor de avaliação e compilação matemática com suporte a funções customizadas)
- **Plotly.js** (Renderização nativa de gráficos de alta performance)

---

## ⚙️ Como Executar o Projeto Localmente

Certifique-se de ter o **Node.js** instalado em sua máquina. Siga os passos abaixo:

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/SEU-USUARIO/simulador-sinais-sistemas.git](https://github.com/SEU-USUARIO/simulador-sinais-sistemas.git)
   ```
