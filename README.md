# Python Math Engine

A responsive web application with a Python mathematics backend.

## Current MVP features

- Differentiation
- Integration
- Maxima and minima (symbolic critical-point classification)
- Domain, range and continuity information
- 2D graph plotting
- Discontinuity analysis
- Daily featured equation and live date/time
- Upload a `.txt` file containing a function

## Requirements

- Python 3.10+
- A modern browser

## Run locally

Open a terminal in the project folder.

### 1. Create and activate a virtual environment

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Windows:

```bash
py -m venv .venv
.venv\Scripts\activate
```

### 2. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Start the Python API

```bash
uvicorn backend.main:app --reload
```

The API runs at `http://127.0.0.1:8000`.
Interactive API documentation: `http://127.0.0.1:8000/docs`.

### 4. Open the frontend

Open `frontend/index.html` in your browser.

If your browser blocks local requests, serve the frontend from a local web server:

```bash
python3 -m http.server 5500 --directory frontend
```

Then visit `http://127.0.0.1:5500`.

## Function syntax

Examples:

- `x^3 - 3*x^2 + 2`
- `sin(x)`
- `1/(x-2)`
- `sqrt(x)`
- `log(x)`

The parser supports `^` as exponent notation and common functions including `sin`, `cos`, `tan`, `sqrt`, `log`, and `exp`.

## GitHub

Create an empty repository on GitHub, then run these commands from this project folder:

```bash
git init
git add .
git commit -m "Initial Python Math Engine MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your own repository URL.

## Suggested next steps

1. Add proper step-by-step mathematical explanations.
2. Improve range and discontinuity analysis for more function types.
3. Add tests for each operation.
4. Deploy the frontend and backend separately.
5. Restrict CORS to the deployed frontend domain before production.

## Important

This is an early MVP. Symbolic mathematics has edge cases; verify important results independently. Do not expose this development API publicly without production hardening, input limits, and restricted CORS.
