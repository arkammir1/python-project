
const API_URL = "https://python-math-engine-api.onrender.com/api";

// Daily mathematics and physics equations
const equations = [
  { expression: "(x - h)² + (y - k)² = r²", note: "Equation of a circle" },
  { expression: "F = ma", note: "Newton's second law of motion" },
  { expression: "e^(iπ) + 1 = 0", note: "Euler's identity" },
  { expression: "v = u + at", note: "First equation of motion" },
  { expression: "a² + b² = c²", note: "Pythagorean theorem" },
  { expression: "E = mc²", note: "Mass–energy equivalence" },
  { expression: "∇ · E = ρ / ε₀", note: "Gauss's law of electricity" },
  { expression: "∫ₐᵇ f(x) dx", note: "Definite integral" },
  { expression: "dy/dx = f'(x)", note: "Derivative of a function" },
  { expression: "PV = nRT", note: "Ideal gas law" },
  { expression: "∇²ψ + k²ψ = 0", note: "Helmholtz equation" },
  { expression: "p = mv", note: "Linear momentum" }
];

// Elements
const functionInput = document.getElementById("function-input");
const operationArea = document.getElementById("operation-area");
const operationButtons = document.querySelectorAll(".operation-button");
const graphRange = document.getElementById("graph-range");
const resultPanel = document.getElementById("result-panel");
const plot = document.getElementById("plot");
const status = document.getElementById("status");
const solveButton = document.getElementById("submit-input");

let selectedImage = null;
let currentObjectUrl = null;
let isCalculating = false;

// Clock
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

// Daily equation
function showDailyEquation() {
  const dayNumber = Math.floor(Date.now() / 86400000);
  const item = equations[dayNumber % equations.length];

  document.getElementById("equation").textContent = item.expression;
  document.getElementById("equation-note").textContent = item.note;
}

updateClock();
showDailyEquation();
setInterval(updateClock, 1000);

// Status message
function setStatus(message) {
  status.textContent = message;
}

// Show operations only after the user enters an equation
function updateInputState() {
  const hasText = functionInput.value.trim().length > 0;

  operationArea.hidden = !hasText;
  document.getElementById("clear-input").hidden = !hasText;

  if (!hasText) {
    graphRange.hidden = true;
  }
}

function showOperations() {
  if (!functionInput.value.trim()) {
    setStatus("Enter an equation first.");
    functionInput.focus();
    return;
  }

  operationArea.hidden = false;
  operationArea.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

  setStatus("Choose an operation.");
}

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

functionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    showOperations();
  }
});

solveButton.addEventListener("click", showOperations);

// Clear input
document.getElementById("clear-input").addEventListener("click", () => {
  functionInput.value = "";
  resizeInput();
  updateInputState();
  clearImage();
  resultPanel.hidden = true;
  setStatus("");
  functionInput.focus();
});

// Image capture and upload
const cameraInput = document.getElementById("camera-input");
const imageInput = document.getElementById("image-input");
const imagePreview = document.getElementById("image-preview");
const previewImage = document.getElementById("preview-image");

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

// Escape HTML before displaying backend responses
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[ch]);
}

// Display mathematical answer
function renderAnswer(value) {
  const target = document.getElementById("answer");

  if (Array.isArray(value)) {
    target.innerHTML = value.length
      ? value.map(point =>
          `<div>x = ${escapeHtml(point.x)}, y = ${escapeHtml(point.y)} — ${escapeHtml(point.type)}</div>`
        ).join("")
      : "No critical points found.";

  } else if (value && typeof value === "object") {
    target.innerHTML = Object.entries(value)
      .map(([key, val]) =>
        `<div><strong>${escapeHtml(key)}:</strong> ${escapeHtml(val)}</div>`
      ).join("");

  } else {
    target.textContent = value;
  }
}

// Render responsive graph
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

// Calculate selected operation
async function calculate(operationName) {
  const expression = functionInput.value.trim();

  if (!expression) {
    setStatus("Enter an equation first.");
    return;
  }

  if (isCalculating) return;

  const lower = Number(document.getElementById("lower").value);
  const upper = Number(document.getElementById("upper").value);

  if (
    operationName === "graph" &&
    (!Number.isFinite(lower) || !Number.isFinite(upper) || lower >= upper)
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
    expression,
    operation: operationName,
    lower,
    upper
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
      throw new Error(data.detail || "Calculation failed.");
    }

    renderAnswer(data.answer);

    document.getElementById("steps").innerHTML =
      (data.steps || [])
        .map(step => `<div>${escapeHtml(step)}</div>`)
        .join("");

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
    setStatus(error.message + " Please check your connection and try again.");

  } finally {
    isCalculating = false;

    operationButtons.forEach(button => {
      button.disabled = false;
    });

    document.getElementById("plot-confirm").disabled = false;
  }
}

// Operation selection
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

// Confirm graph plotting
document.getElementById("plot-confirm").addEventListener("click", () => {
  calculate("graph");
});

// Start a new calculation
document.getElementById("new-calculation").addEventListener("click", () => {
  resultPanel.hidden = true;
  setStatus("Enter another equation.");
  functionInput.focus();
});

// Keep graph fitted to screen
let resizeTimeout;

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

// PWA installation
let deferredInstallPrompt = null;

const installButton = document.getElementById("install-app");

window.addEventListener("beforeinstallprompt", (event) => {
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

// Service worker
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => {
        console.warn("Service worker registration failed:", error);
      });
  });
}
