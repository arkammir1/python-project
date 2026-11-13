const API_URL = "http://127.0.0.1:8000/api";
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

function updateClock() {
  const now = new Date();
  document.getElementById("date").textContent = now.toLocaleDateString("en-IN", {
    weekday:"short", day:"numeric", month:"short", year:"numeric"
  }).toUpperCase();
  document.getElementById("time").textContent = now.toLocaleTimeString("en-IN");
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

const operation = document.getElementById("operation");
const graphRange = document.getElementById("graph-range");
operation.addEventListener("change", () => {
  graphRange.hidden = operation.value !== "graph";
});

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
  document.getElementById("function-input").value = (await file.text()).trim();
});

function setStatus(message) {
  document.getElementById("status").textContent = message;
}
function renderAnswer(value) {
  const target = document.getElementById("answer");
  if (Array.isArray(value)) {
    target.innerHTML = value.length
      ? value.map(p => `<div>x = ${escapeHtml(p.x)}, y = ${escapeHtml(p.y)} — ${escapeHtml(p.type)}</div>`).join("")
      : "No critical points found.";
  } else if (value && typeof value === "object") {
    target.innerHTML = Object.entries(value)
      .map(([key,val]) => `<div><strong>${escapeHtml(key)}:</strong> ${escapeHtml(val)}</div>`).join("");
  } else {
    target.textContent = value;
  }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[ch]);
}

document.getElementById("solve").addEventListener("click", async () => {
  const expression = document.getElementById("function-input").value.trim();
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
  const button = document.getElementById("solve");
  button.disabled = true;
  button.textContent = "CALCULATING...";
  setStatus("Working through the mathematics...");
  document.getElementById("result-panel").hidden = true;
  try {
    const response = await fetch(`${API_URL}/analyze`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Calculation failed.");
    renderAnswer(data.answer);
    document.getElementById("steps").innerHTML = (data.steps || [])
      .map(step => `<div>${escapeHtml(step)}</div>`).join("");
    const plot = document.getElementById("plot");
    plot.innerHTML = "";
    if (data.graph) {
      Plotly.newPlot(plot, [{
        x:data.graph.x, y:data.graph.y, type:"scatter", mode:"lines",
        line:{color:"#f5f5f5", width:2}
      }], {
        paper_bgcolor:"#0d0d0d", plot_bgcolor:"#0d0d0d",
        font:{color:"#ddd"}, margin:{l:45,r:15,t:15,b:40},
        xaxis:{gridcolor:"#292929", zerolinecolor:"#666"},
        yaxis:{gridcolor:"#292929", zerolinecolor:"#666"}
      }, {responsive:true, displayModeBar:false});
    }
    document.getElementById("result-panel").hidden = false;
    setStatus("Calculation complete.");
  } catch (error) {
    setStatus(error.message + " Is the Python server running?");
  } finally {
    button.disabled = false;
    button.innerHTML = 'CALCULATE <span>↗</span>';
  }
});
