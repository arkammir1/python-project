
const API_URL = "https://python-math-engine-api.onrender.com/api";

// =========================================
// DAILY MATHEMATICS AND PHYSICS EQUATIONS
// =========================================

const equations = [
  { expression: "(x - h)² + (y - k)² = r²", note: "Equation of a circle" },
  { expression: "F = ma", note: "Newton's second law of motion" },
  { expression: "e^(iπ) + 1 = 0", note: "Euler's identity" },
  { expression: "v = u + at", note: "First equation of motion" },
  { expression: "a² + b² = c²", note: "Pythagorean theorem" },
  { expression: "E = mc²", note: "Mass-energy equivalence" },
  { expression: "∇ · E = ρ / ε₀", note: "Gauss's law of electricity" },
  { expression: "∫ₐᵇ f(x) dx", note: "Definite integral" },
  { expression: "dy/dx = f'(x)", note: "Derivative of a function" },
  { expression: "PV = nRT", note: "Ideal gas law" },
  { expression: "∇²ψ + k²ψ = 0", note: "Helmholtz equation" },
  { expression: "p = mv", note: "Linear momentum" }
];

// =========================================
// ELEMENTS
// =========================================

const mathInput = document.getElementById("math-input");
const functionInput = document.getElementById("function-input");

const mathModeButton = document.getElementById("math-mode");
const textModeButton = document.getElementById("text-mode");

const operationArea = document.getElementById("operation-area");
const operationButtons = document.querySelectorAll(".operation-button");

const graphRange = document.getElementById("graph-range");
const resultPanel = document.getElementById("result-panel");
const plot = document.getElementById("plot");
const status = document.getElementById("status");

const solveButton = document.getElementById("submit-input");
const clearButton = document.getElementById("clear-input");

const cameraInput = document.getElementById("camera-input");
const imageInput = document.getElementById("image-input");
const imagePreview = document.getElementById("image-preview");
const previewImage = document.getElementById("preview-image");

let activeMode = "math";
let selectedImage = null;
let currentObjectUrl = null;
let isCalculating = false;
let resizeTimeout = null;

// =========================================
// MATHLIVE SETUP
// =========================================

if (mathInput) {
  mathInput.mathVirtualKeyboardPolicy = "auto";
}

// =========================================
// CLOCK
// =========================================

function updateClock() {
  const now = new Date();

  document.getElementById("date").textContent =
    now.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    }).toUpperCase();

  document.getElementById("time").textContent =
    now.toLocaleTimeString("en-IN");
}

function showDailyEquation() {
  const dayNumber = Math.floor(Date.now() / 86400000);
  const item = equations[dayNumber % equations.length];

  document.getElementById("equation").textContent = item.expression;
  document.getElementById("equation-note").textContent = item.note;
}

updateClock();
showDailyEquation();
setInterval(updateClock, 1000);

// =========================================
// INPUT MODE
// =========================================

function getActiveExpression() {
  if (activeMode === "math") {
    return mathInput.getValue("latex").trim();
  }

  return functionInput.value.trim();
}

function getInputFormat() {
  return activeMode === "math" ? "latex" : "text";
}

function switchMode(mode) {
  activeMode = mode;

  const isMath = mode === "math";

  mathInput.hidden = !isMath;
  functionInput.hidden = isMath;

  mathModeButton.classList.toggle("active", isMath);
  textModeButton.classList.toggle("active", !isMath);

  mathModeButton.setAttribute("aria-pressed", String(isMath));
  textModeButton.setAttribute("aria-pressed", String(!isMath));

  updateInputState();

  if (isMath) {
    mathInput.focus();
  } else {
    functionInput.focus();
  }

  resultPanel.hidden = true;
  setStatus("");
}

mathModeButton.addEventListener("click", () => {
  switchMode("math");
});

textModeButton.addEventListener("click", () => {
  switchMode("text");
});

// =========================================
// STATUS
// =========================================

function setStatus(message) {
  status.textContent = message;
}

// =========================================
// INPUT STATE
// =========================================

function updateInputState() {
  const hasText = getActiveExpression().length > 0;

  operationArea.hidden = !hasText;
  clearButton.hidden = !hasText;

  if (!hasText) {
    graphRange.hidden = true;
  }
}

function showOperations() {
  if (!getActiveExpression()) {
    setStatus("Enter an equation first.");

    if (activeMode === "math") {
      mathInput.focus();
    } else {
      functionInput.focus();
    }

    return;
  }

  operationArea.hidden = false;

  operationArea.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

  setStatus("Choose an operation.");
}

// =========================================
// INPUT EVENTS
// =========================================

mathInput.addEventListener("input", () => {
  updateInputState();
  resultPanel.hidden = true;
  setStatus("");
});

mathInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    showOperations();
  }
});

function resizeInput() {
  functionInput.style.height = "auto";

  functionInput.style.height =
    Math.min(functionInput.scrollHeight, 160) + "px";
}

functionInput.addEventListener("input", () => {
  updateInputState();
  resizeInput();
  resultPanel.hidden = true;
  setStatus("");
});

functionInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    showOperations();
  }
});

solveButton.addEventListener("click", showOperations);

// =========================================
// CLEAR INPUT
// =========================================

clearButton.addEventListener("click", () => {
  mathInput.setValue("");
  functionInput.value = "";

  resizeInput();
  updateInputState();
  clearImage();

  resultPanel.hidden = true;
  setStatus("");

  if (activeMode === "math") {
    mathInput.focus();
  } else {
    functionInput.focus();
  }
});

// =========================================
// IMAGE CAPTURE AND UPLOAD
// =========================================

document.getElementById("camera-trigger").addEventListener("click", () => {
  cameraInput.click();
});

document.getElementById("upload-trigger").addEventListener("click", () => {
  imageInput.click();
});

cameraInput.addEventListener("change", handleImageSelection);
imageInput.addEventListener("change", handleImageSelection);

function handleImageSelection(event) {
  const file = event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setStatus("Please select an image file.");
    event.target.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    setStatus("Please select an image smaller than 10 MB.");
    event.target.value = "";
    return;
  }

  clearImage();

  selectedImage = file;
  currentObjectUrl = URL.createObjectURL(file);

  previewImage.src = currentObjectUrl;
  imagePreview.hidden = false;

  document.getElementById("image-status").textContent =
    "Image attached. Handwriting recognition is not connected yet.";

  setStatus("Image attached. Type the equation to continue.");

  event.target.value = "";
}

function clearImage() {
  selectedImage = null;

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  previewImage.removeAttribute("src");
  imagePreview.hidden = true;
}

document.getElementById("remove-image").addEventListener("click", () => {
  clearImage();
  setStatus("Image removed.");
});

// =========================================
// SAFE HTML
// =========================================

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

// =========================================
// DISPLAY ANSWER — IMPROVED RESULTS UI
// =========================================

function renderAnswer(value) {
  const target = document.getElementById("answer");

  if (Array.isArray(value)) {
    if (!value.length) {
      target.innerHTML = `
        <div class="answer-message">
          No finite critical points were found.
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <div class="answer-grid">
        ${value.map((point, index) => `
          <div class="answer-card">
            <div class="answer-card-label">
              CRITICAL POINT ${index + 1}
            </div>

            <div class="answer-coordinate">
              <span>x</span>
              <strong>${escapeHtml(point.x)}</strong>
            </div>

            <div class="answer-coordinate">
              <span>f(x)</span>
              <strong>${escapeHtml(point.y)}</strong>
            </div>

            <div class="answer-classification">
              ${escapeHtml(point.type)}
            </div>
          </div>
        `).join("")}
      </div>
    `;

    return;
  }

  if (value && typeof value === "object") {
    target.innerHTML = `
      <div class="answer-grid">
        ${Object.entries(value).map(([key, val]) => `
          <div class="answer-card">
            <div class="answer-card-label">
              ${escapeHtml(key.replace(/_/g, " "))}
            </div>

            <div class="answer-value">
              ${escapeHtml(val)}
            </div>
          </div>
        `).join("")}
      </div>
    `;

    return;
  }

  target.innerHTML = `
    <div class="answer-main">
      ${escapeHtml(value)}
    </div>
  `;
}

// =========================================
// RENDER SOLUTION STEPS
// =========================================

function renderSteps(steps) {
  const target = document.getElementById("steps");

  target.innerHTML = (steps || []).map((step, index) => `
    <div class="solution-step">
      <div class="step-number">${index + 1}</div>
      <div class="step-content">${escapeHtml(step)}</div>
    </div>
  `).join("");
}

// =========================================
// PLOTLY GRAPH
// =========================================

async function renderGraph(graph) {
  if (!graph || typeof Plotly === "undefined") {
    return;
  }

  if (plot.data) {
    Plotly.purge(plot);
  }

  plot.innerHTML = "";
  plot.style.width = "100%";
  plot.style.maxWidth = "100%";

  await Plotly.newPlot(
    plot,
    [{
      x: graph.x,
      y: graph.y,
      type: "scatter",
      mode: "lines",
      line: {
        color: "#ffffff",
        width: 2
      }
    }],
    {
      autosize: true,
      paper_bgcolor: "#000000",
      plot_bgcolor: "#000000",
      font: {
        color: "#dddddd",
        size: 12
      },
      margin: {
        l: 48,
        r: 18,
        t: 20,
        b: 45,
        pad: 2
      },
      xaxis: {
        gridcolor: "#292929",
        zerolinecolor: "#777777",
        automargin: true
      },
      yaxis: {
        gridcolor: "#292929",
        zerolinecolor: "#777777",
        automargin: true
      }
    },
    {
      responsive: true,
      displayModeBar: false,
      scrollZoom: false
    }
  );

  requestAnimationFrame(() => {
    Plotly.Plots.resize(plot);
  });
}

// =========================================
// CALCULATE
// =========================================

async function calculate(operationName) {
  const expression = getActiveExpression();

  if (!expression) {
    setStatus("Enter an equation first.");
    return;
  }

  if (isCalculating) return;

  const lower = Number(document.getElementById("lower").value);
  const upper = Number(document.getElementById("upper").value);

  if (
    operationName === "graph" &&
    (!Number.isFinite(lower) ||
      !Number.isFinite(upper) ||
      lower >= upper)
  ) {
    setStatus("Enter a valid graph range. Upper X must be greater than Lower X.");
    return;
  }

  isCalculating = true;

  operationButtons.forEach(button => {
    button.disabled = true;
  });

  document.getElementById("plot-confirm").disabled = true;

  setStatus("Working through the mathematics...");
  resultPanel.hidden = true;

  const payload = {
    expression: expression,
    input_format: getInputFormat(),
    operation: operationName,
    lower: lower,
    upper: upper
  };

  try {
    const response = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Calculation failed."
      );
    }

    renderAnswer(data.answer);
    renderSteps(data.steps);

    resultPanel.hidden = false;

    if (data.graph) {
      await renderGraph(data.graph);
    } else {
      if (plot.data && typeof Plotly !== "undefined") {
        Plotly.purge(plot);
      }

      plot.innerHTML = "";
    }

    setStatus("Calculation complete.");

    resultPanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {
    console.error("Calculation error:", error);

    setStatus(
      error.message + " Please check your connection and try again."
    );

  } finally {
    isCalculating = false;

    operationButtons.forEach(button => {
      button.disabled = false;
    });

    document.getElementById("plot-confirm").disabled = false;
  }
}

// =========================================
// OPERATION SELECTION
// =========================================

operationButtons.forEach(button => {
  button.addEventListener("click", () => {
    const operationName = button.dataset.operation;

    resultPanel.hidden = true;

    if (operationName === "graph") {
      graphRange.hidden = false;

      setStatus("Set your graph range, then select Plot Graph.");

      graphRange.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });

      return;
    }

    graphRange.hidden = true;
    calculate(operationName);
  });
});

// =========================================
// GRAPH CONFIRMATION
// =========================================

document.getElementById("plot-confirm").addEventListener("click", () => {
  calculate("graph");
});

// =========================================
// NEW CALCULATION
// =========================================

document.getElementById("new-calculation").addEventListener("click", () => {
  resultPanel.hidden = true;
  setStatus("Enter another equation.");

  if (activeMode === "math") {
    mathInput.focus();
  } else {
    functionInput.focus();
  }
});

// =========================================
// RESPONSIVE GRAPH
// =========================================

function resizeGraph() {
  clearTimeout(resizeTimeout);

  resizeTimeout = setTimeout(() => {
    if (
      plot &&
      plot.data &&
      typeof Plotly !== "undefined"
    ) {
      Plotly.Plots.resize(plot);
    }
  }, 150);
}

window.addEventListener("resize", resizeGraph);
window.addEventListener("orientationchange", resizeGraph);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resizeGraph);
}

// =========================================
// PWA INSTALLATION
// =========================================

let deferredInstallPrompt = null;

const installButton = document.getElementById("install-app");

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();

  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();

  await deferredInstallPrompt.userChoice;

  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installButton.hidden = true;
  setStatus("Python Math Engine installed successfully.");
});

// =========================================
// SERVICE WORKER
// =========================================

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => {
        console.warn("Service worker registration failed:", error);
      });
  });
}

// =========================================
// INITIAL STATE
// =========================================

switchMode("math");
updateInputState();
