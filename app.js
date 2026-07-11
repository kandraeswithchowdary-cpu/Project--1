if (typeof document === "undefined") {
  console.log("app.js is a browser file. Open index.html or run: python server.py");
} else {
  const expressionInput = document.querySelector("#expression");
  const resultOutput = document.querySelector("#result");
  const statusLine = document.querySelector("#status");
  const historyList = document.querySelector("#history");
  const clearHistoryButton = document.querySelector("#clearHistory");
  const modeInputs = document.querySelectorAll("input[name='angleMode']");

  let angleMode = "deg";
  let lastAnswer = "0";
  let memory = 0;
  const history = [];

  const localConstants = {
    e: Math.E,
    pi: Math.PI,
    tau: Math.PI * 2,
  };

  const localFunctions = {
    abs: Math.abs,
    acos: (x) => fromRadians(Math.acos(x)),
    asin: (x) => fromRadians(Math.asin(x)),
    atan: (x) => fromRadians(Math.atan(x)),
    ceil: Math.ceil,
    cos: (x) => Math.cos(toRadians(x)),
    degrees: (x) => (x * 180) / Math.PI,
    exp: Math.exp,
    factorial,
    floor: Math.floor,
    gcd,
    hypot: Math.hypot,
    ln: Math.log,
    log: Math.log10,
    log10: Math.log10,
    log2: Math.log2,
    max: Math.max,
    min: Math.min,
    pow: Math.pow,
    radians: (x) => (x * Math.PI) / 180,
    round: Math.round,
    sin: (x) => Math.sin(toRadians(x)),
    sqrt: Math.sqrt,
    tan: (x) => Math.tan(toRadians(x)),
  };

  function setExpression(value) {
    expressionInput.value = value || "0";
  }

  function getExpression() {
    return expressionInput.value === "0" ? "" : expressionInput.value;
  }

  function insertText(text) {
    const currentValue = getExpression();
    const start = expressionInput.selectionStart ?? currentValue.length;
    const end = expressionInput.selectionEnd ?? currentValue.length;
    const before = currentValue.slice(0, start);
    const after = currentValue.slice(end);

    setExpression(`${before}${text}${after}`);
    expressionInput.focus();
    expressionInput.setSelectionRange(start + text.length, start + text.length);
    clearStatus();
  }

  function backspace() {
    const currentValue = getExpression();
    const start = expressionInput.selectionStart ?? currentValue.length;
    const end = expressionInput.selectionEnd ?? currentValue.length;

    if (start !== end) {
      setExpression(`${currentValue.slice(0, start)}${currentValue.slice(end)}`);
      expressionInput.setSelectionRange(start, start);
      return;
    }

    if (start > 0) {
      setExpression(`${currentValue.slice(0, start - 1)}${currentValue.slice(start)}`);
      expressionInput.setSelectionRange(start - 1, start - 1);
    }
  }

  function clearCalculator() {
    setExpression("0");
    resultOutput.textContent = "0";
    clearStatus();
    expressionInput.focus();
  }

  function clearStatus() {
    statusLine.textContent = "";
  }

  function setError(message) {
    statusLine.textContent = message;
  }

  function formatResult(value) {
    return Number.parseFloat(Number(value).toPrecision(12)).toString();
  }

  function toRadians(value) {
    return angleMode === "deg" ? (value * Math.PI) / 180 : value;
  }

  function fromRadians(value) {
    return angleMode === "deg" ? (value * 180) / Math.PI : value;
  }

  function requireInteger(value) {
    if (!Number.isInteger(value)) {
      throw new Error("Expected an integer value.");
    }
    return value;
  }

  function factorial(value) {
    const integer = requireInteger(value);
    if (integer < 0) {
      throw new Error("Invalid input for factorial.");
    }
    let total = 1;
    for (let number = 2; number <= integer; number += 1) {
      total *= number;
    }
    return total;
  }

  function gcd(leftValue, rightValue) {
    let left = Math.abs(requireInteger(leftValue));
    let right = Math.abs(requireInteger(rightValue));
    while (right !== 0) {
      const next = left % right;
      left = right;
      right = next;
    }
    return left;
  }

  function localEvaluate(expression) {
    const normalized = expression.replaceAll("^", "**");
    const identifiers = normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    const allowedNames = new Set([...Object.keys(localFunctions), ...Object.keys(localConstants)]);

    if (!/^[0-9A-Za-z_+\-*/%().,\s^]*$/.test(expression)) {
      throw new Error("Invalid expression.");
    }

    for (const identifier of identifiers) {
      if (!allowedNames.has(identifier)) {
        throw new Error(`Unknown name: ${identifier}.`);
      }
    }

    const scope = { ...localFunctions, ...localConstants };
    const names = Object.keys(scope);
    const values = Object.values(scope);
    const result = Function(...names, `"use strict"; return (${normalized});`)(...values);

    if (!Number.isFinite(result)) {
      throw new Error("Result is not finite.");
    }

    return result;
  }

  async function backendEvaluate(expression) {
    const response = await fetch("/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression, angle_mode: angleMode }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Calculation failed.");
    }

    return payload.result;
  }

  function addHistory(expression, result, mode) {
    history.unshift({ expression, result, mode });
    history.splice(8);
    renderHistory();
  }

  function renderHistory() {
    historyList.replaceChildren(
      ...history.map((entry) => {
        const item = document.createElement("li");
        const expression = document.createElement("span");
        const result = document.createElement("button");

        expression.className = "history-expression";
        expression.textContent = `${entry.expression} (${entry.mode.toUpperCase()})`;
        result.className = "history-result";
        result.type = "button";
        result.textContent = entry.result;
        result.addEventListener("click", () => {
          setExpression(entry.result);
          expressionInput.focus();
        });

        item.append(expression, result);
        return item;
      })
    );
  }

  async function calculate() {
    const expression = getExpression().trim();
    if (!expression) {
      resultOutput.textContent = "0";
      return 0;
    }

    clearStatus();

    try {
      const rawResult = window.location.protocol === "file:" ? localEvaluate(expression) : await backendEvaluate(expression);
      const result = formatResult(rawResult);
      resultOutput.textContent = result;
      lastAnswer = result;
      addHistory(expression, result, angleMode);
      return Number(result);
    } catch (error) {
      if (window.location.protocol !== "file:" && error instanceof TypeError) {
        try {
          const result = formatResult(localEvaluate(expression));
          resultOutput.textContent = result;
          lastAnswer = result;
          addHistory(expression, result, angleMode);
          return Number(result);
        } catch (fallbackError) {
          setError(fallbackError.message);
          return NaN;
        }
      }
      setError(error.message);
      return NaN;
    }
  }

  function toggleSign() {
    const expression = getExpression();
    if (!expression) {
      setExpression("-");
      return;
    }

    setExpression(expression.startsWith("-") ? expression.slice(1) : `-${expression}`);
    expressionInput.focus();
  }

  async function memoryAdd() {
    const value = await calculate();
    if (Number.isFinite(value)) {
      memory += value;
    }
  }

  async function memorySubtract() {
    const value = await calculate();
    if (Number.isFinite(value)) {
      memory -= value;
    }
  }

  function runAction(action) {
    if (action === "calculate") {
      calculate();
    }
    if (action === "clear") {
      clearCalculator();
    }
    if (action === "backspace") {
      backspace();
      expressionInput.focus();
    }
    if (action === "ans") {
      insertText(lastAnswer);
    }
    if (action === "toggleSign") {
      toggleSign();
    }
    if (action === "memoryAdd") {
      memoryAdd();
    }
    if (action === "memorySubtract") {
      memorySubtract();
    }
    if (action === "memoryRecall") {
      insertText(formatResult(memory));
    }
  }

  document.querySelector(".keypad").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }

    if (button.dataset.insert) {
      insertText(button.dataset.insert);
      return;
    }

    runAction(button.dataset.action);
  });

  modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      angleMode = input.value;
      expressionInput.focus();
    });
  });

  clearHistoryButton.addEventListener("click", () => {
    history.length = 0;
    renderHistory();
  });

  expressionInput.addEventListener("focus", () => {
    if (expressionInput.value === "0") {
      expressionInput.select();
    }
  });

  expressionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      calculate();
    }
  });

  expressionInput.focus();
  expressionInput.select();
}
