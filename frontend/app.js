
const API_URL = "https://python-math-engine-api.onrender.com/api";

const equations = [
  { expression: "(x - h)^2 + (y - k)^2 = r^2", note: "Equation of a circle" },
  { expression: "F = ma", note: "Newton's second law of motion" },
  { expression: "e^(iπ) + 1 = 0", note: "Euler's identity" },
  { expression: "v = u + at", note: "First equation of motion" },
  { expression: "a² + b² = c²", note: "Pythagorean theorem" },
  { expression: "E = mc²", note: "Mass–energy equivalence" },
  { expression: "∇ · E = ρ / ε₀", note: "Gauss's law (electricity)" },
  { expression: "∫ₐᵇ f(x) dx", note: "Definite integral" },
  { expression: "dy/dx = f'(x)", note: "Derivative of a function" },
  { expression: "PV = nRT", note: "Ideal gas law" }
];

// Clock and daily equation
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

// Elements
const operation = document.getElementById("operation");
const graphRange = document.getElementById("graph-range");
const resultPanel = document.getElementById("result-panel");
const plot = document.getElementById("plot");
const solveButton = document.getElementById("solve");

// Show graph range only for graph operation
operation.addEventListener("change", () => {
  graphRange.hidden = operation.value !== "graph";
});

// File upload
document.getElementById("upload-trigger").addEventListener("click", () => {
  document.getElementById("file-input").click();
});

document.getElementById("file-input").addEventListener("change", async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  if (file.size > 10000) {
    setStatus("Please upload a text file smaller than 10 KB.");
    return;
  }

  document.getElementById("function-input").value =
    (await file.text()).trim();
});

// Status
function setStatus(message) {
  document.getElementById("status").textContent = message;
}

// Safe HTML output
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[ch]);
}

// Render mathematical answer
function renderAnswer(value) {
  const target = document.getElementById("answer");

  if (Array.isArray(value)) {
    target.innerHTML = value.length
      ? value.map(p =>
          `<div>x = ${escapeHtml(p.x)}, y = ${escapeHtml(p.y)} — ${escapeHtml(p.type)}</div>`
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

// Graph rendering
async function renderGraph(graph) {
  if (!graph || !plot || typeof Plotly === "undefined") {
    return;
  }

  // Remove previous graph
  if (plot.data) {
    Plotly.purge(plot);
  }

  plot.innerHTML = "";

  // Ensure graph container has measurable dimensions
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
        color: "#f5f5f5",
        width: 2
      }
    }],
    {
      autosize: true,
      paper_bgcolor: "#0d0d0d",
      plot_bgcolor: "#0d0d0d",
      font: {
        color: "#ddd",
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
        zerolinecolor: "#666",
        automargin: true
      },
      yaxis: {
        gridcolor: "#292929",
        zerolinecolor: "#666",
        automargin: true
      }
    },
    {
      responsive: true,
      displayModeBar: false,
      scrollZoom: false
    }
  );

  // Force correct dimensions after rendering
  requestAnimationFrame(() => {
    Plotly.Plots.resize(plot);
  });
}

// Calculate button
solveButton.addEventListener("click", async () => {
  const expression =
    document.getElementById("function-input").value.trim();

  if (!expression) {
    setStatus("Enter a function first.");
    return;
  }

  const payload = {
    expression,
    operation: operation.value,
    lower: Number(document.getElementById("lower").value),
    upper: Number(document.getElementById("upper").value)
  };

  solveButton.disabled = true;
  solveButton.textContent = "CALCULATING...";

  setStatus("Working through the mathematics...");

  resultPanel.hidden = true;

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

    // Show result panel BEFORE Plotly calculates graph dimensions
    resultPanel.hidden = false;

    // Render graph only when backend provides graph data
    if (data.graph) {
      await renderGraph(data.graph);
    } else {
      if (plot.data) {
        Plotly.purge(plot);
      }
      plot.innerHTML = "";
    }

    setStatus("Calculation complete.");

  } catch (error) {
    setStatus(error.message + " Is the Python server running?");

  } finally {
    solveButton.disabled = false;
    solveButton.innerHTML = 'CALCULATE <span>↗</span>';
  }
});

// Keep graph fitted to screen during resizing and rotation
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

// Detect mobile visual viewport changes
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resizeGraph);
}

// PWA installation support
let deferredInstallPrompt = null;

const installButton = document.getElementById("install-app");

if (installButton) {
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
}

// Service worker
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => {
        console.warn("Service worker registration failed:", error);
      });
  });
}
