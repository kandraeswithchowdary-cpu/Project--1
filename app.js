const expressionInput = document.querySelector("#expression");
const resultOutput = document.querySelector("#result");
const statusLine = document.querySelector("#status");
const historyList = document.querySelector("#history");
const clearHistoryButton = document.querySelector("#clearHistory");
const modeButtons = document.querySelectorAll("[data-angle]");

let angleMode = "rad";
const history = [];

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
    const response = await fetch("/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression, angle_mode: angleMode }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Calculation failed.");
    }

    const result = formatResult(payload.result);
    resultOutput.textContent = result;
    addHistory(expression, result, payload.angle_mode);
  } catch (error) {
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
