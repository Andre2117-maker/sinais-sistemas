import React, { useRef } from "react";

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  exemplos?: string[];
  variavel?: "t" | "n";
  erro?: string | null;
}

/**
 * Campo de expressão matemática pensado para o celular:
 * - barra de símbolos (evita caçar "^", "(" e "*" no teclado do celular)
 * - exemplos prontos com um toque
 * - botão de limpar e mensagem de erro logo abaixo do campo
 */
export const ExpressionInput: React.FC<Props> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  exemplos = [],
  variavel = "t",
  erro,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const simbolos = [
    variavel,
    "(",
    ")",
    "^",
    "*",
    "/",
    "+",
    "-",
    "pi",
    "sin(",
    "cos(",
    "exp(",
    "abs(",
    "sqrt(",
  ];

  const inserir = (trecho: string) => {
    const el = inputRef.current;
    const focado = el !== null && document.activeElement === el;
    const inicio = focado && el ? (el.selectionStart ?? value.length) : value.length;
    const fim = focado && el ? (el.selectionEnd ?? value.length) : value.length;

    // Funções já entram com o parêntese fechado e o cursor fica dentro
    const texto = trecho.endsWith("(") ? `${trecho})` : trecho;
    onChange(value.slice(0, inicio) + texto + value.slice(fim));

    const pos = inicio + trecho.length;
    requestAnimationFrame(() => {
      if (el && focado) el.setSelectionRange(pos, pos);
    });
  };

  // Impede que o toque no botão tire o foco do campo (o teclado não fecha)
  const manterFoco = (e: React.PointerEvent) => e.preventDefault();

  return (
    <div className="input-group expression-input">
      <label htmlFor={id}>{label}</label>

      <div className={`input-wrap ${erro ? "has-error" : ""}`}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="mono"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-invalid={!!erro}
          aria-describedby={erro ? `${id}-erro` : undefined}
        />
        {value && (
          <button
            type="button"
            className="clear-btn"
            aria-label={`Limpar ${label}`}
            onPointerDown={manterFoco}
            onClick={() => onChange("")}
          >
            ×
          </button>
        )}
      </div>

      <div className="symbol-bar" role="toolbar" aria-label="Inserir símbolo">
        {simbolos.map((s) => (
          <button
            key={s}
            type="button"
            className="chip mono"
            onPointerDown={manterFoco}
            onClick={() => inserir(s)}
          >
            {s.endsWith("(") ? `${s})` : s}
          </button>
        ))}
      </div>

      {erro && (
        <p className="field-error" id={`${id}-erro`} role="alert">
          {erro}
        </p>
      )}

      {exemplos.length > 0 && (
        <div className="examples">
          <span>Exemplos:</span>
          {exemplos.map((ex) => (
            <button
              key={ex}
              type="button"
              className="chip chip-example mono"
              onClick={() => onChange(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
