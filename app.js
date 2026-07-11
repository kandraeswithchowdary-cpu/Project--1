const expressionInput = document.querySelector("#expression");
const resultOutput = document.querySelector("#result");
const statusLine = document.querySelector("#status");
const historyList = document.querySelector("#history");
const clearHistoryButton = document.querySelector("#clearHistory");
const modeButtons = document.querySelectorAll("[data-angle]");

let angleMode = "rad";
const history = [];

const localFunctions = {
  abs: Math.abs,
  acos: (x) => fromRadians(Math.acos(x)),
  asin: (x) => fromRadians(Math.asin(x)),
  atan: (x) => fromRadians(Math.atan(x)),
  ceil: Math.ceil,
  cos: (x) => Math.cos(toRadians(x)),
  degrees: (x) => (x * 180) / Math.PI,
  exp: Math.exp,
  factorial: (x) => {
    const integer = requireInteger(x);
    if (integer < 0) {
      throw new Error("Invalid input for factorial.");
    }
    let total = 1;
    for (let value = 2; value <= integer; value += 1) {
      total *= value;
    }
    return total;
  },
  floor: Math.floor,
  gcd: (a, b) => {
    let left = Math.abs(requireInteger(a));
    let right = Math.abs(requireInteger(b));
    while (right !== 0) {
      const next = left % right;
      left = right;
      right = next;
    }
    return left;
  },
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

const localConstants = {
  e: Math.E,
  pi: Math.PI,
  tau: Math.PI * 2,
};

function insertText(text) {
  const start = expressionInput.selectionStart ?? expressionInput.value.length;
  const end = expressionInput.selectionEnd ?? expressionInput.value.length;
  const before = expressionInput.value.slice(0, start);
  const after = expressionInput.value.slice(end);

  expressionInput.value = `${before}${text}${after}`;
  expressionInput.focus();
  expressionInput.setSelectionRange(start + text.length, start + text.length);
  clearStatus();
}

function backspace() {
  const start = expressionInput.selectionStart ?? expressionInput.value.length;
  const end = expressionInput.selectionEnd ?? expressionInput.value.length;

  if (start !== end) {
    expressionInput.value = `${expressionInput.value.slice(0, start)}${expressionInput.value.slice(end)}`;
    expressionInput.setSelectionRange(start, start);
    return;
  }

  if (start > 0) {
    expressionInput.value = `${expressionInput.value.slice(0, start - 1)}${expressionInput.value.slice(start)}`;
    expressionInput.setSelectionRange(start - 1, start - 1);
  }
}

function clearCalculator() {
  expressionInput.value = "";
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
  return Number.parseFloat(value.toPrecision(12)).toString();
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
        expressionInput.value = entry.result;
        expressionInput.focus();
      });

      item.append(expression, result);
      return item;
    })
  );
}

async function calculate() {
  const expression = expressionInput.value.trim();
  if (!expression) {
    resultOutput.textContent = "0";
    return;
  }

  clearStatus();

  try {
    const rawResult = window.location.protocol === "file:" ? localEvaluate(expression) : await backendEvaluate(expression);
    const result = formatResult(rawResult);
    resultOutput.textContent = result;
    addHistory(expression, result, angleMode);
  } catch (error) {
    if (window.location.protocol !== "file:" && error instanceof TypeError) {
      try {
        const result = formatResult(localEvaluate(expression));
        resultOutput.textContent = result;
        addHistory(expression, result, angleMode);
        return;
      } catch (fallbackError) {
        setError(fallbackError.message);
        return;
      }
    }
    setError(error.message);
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

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    angleMode = button.dataset.angle;
    modeButtons.forEach((modeButton) => modeButton.classList.toggle("is-active", modeButton === button));
    expressionInput.focus();
  });
});

clearHistoryButton.addEventListener("click", () => {
  history.length = 0;
  renderHistory();
});

expressionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    calculate();
  }
});

expressionInput.focus();
