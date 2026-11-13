from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sympy import (
    Symbol, sympify, diff, integrate, solve, solveset, S, Interval,
    oo, limit, singularities, together, fraction, simplify
)
from sympy.parsing.sympy_parser import (
    parse_expr, standard_transformations, implicit_multiplication_application,
    convert_xor
)
import numpy as np

app = FastAPI(title="Python Math Engine API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to your deployed frontend domain later.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

x = Symbol("x", real=True)
TRANSFORMS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)
SAFE_LOCALS = {
    "x": x, "sin": __import__("sympy").sin, "cos": __import__("sympy").cos,
    "tan": __import__("sympy").tan, "sqrt": __import__("sympy").sqrt,
    "log": __import__("sympy").log, "ln": __import__("sympy").log,
    "exp": __import__("sympy").exp, "pi": __import__("sympy").pi,
    "E": __import__("sympy").E, "abs": __import__("sympy").Abs,
}

class AnalysisRequest(BaseModel):
    expression: str
    operation: str
    lower: float = -10
    upper: float = 10

def parse_function(raw: str):
    if not raw or len(raw) > 250:
        raise ValueError("Enter a function containing 1–250 characters.")
    try:
        return parse_expr(
            raw,
            local_dict=SAFE_LOCALS,
            transformations=TRANSFORMS,
            evaluate=True,
        )
    except Exception as exc:
        raise ValueError("I couldn't understand that function. Try: x^3 - 3x^2 + 2") from exc

def fmt(value):
    return str(value)

@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Python Math Engine is running."}

@app.post("/api/analyze")
def analyze(payload: AnalysisRequest):
    try:
        expr = parse_function(payload.expression.strip())
        op = payload.operation.lower()
        result = {}

        if op == "differentiate":
            result["answer"] = fmt(simplify(diff(expr, x)))
            result["steps"] = [f"Original function: f(x) = {expr}", "Differentiate with respect to x.", f"f'(x) = {simplify(diff(expr, x))}"]

        elif op == "integrate":
            result["answer"] = fmt(integrate(expr, x)) + " + C"
            result["steps"] = [f"Original function: f(x) = {expr}", "Integrate with respect to x.", f"∫ f(x) dx = {integrate(expr, x)} + C"]

        elif op == "maxima_minima":
            derivative = diff(expr, x)
            critical = solveset(derivative, x, domain=S.Reals)
            second = diff(expr, x, 2)
            points = []
            if critical.is_FiniteSet:
                for point in critical:
                    if point.is_real:
                        curvature = simplify(second.subs(x, point))
                        kind = "local minimum" if curvature.is_positive else "local maximum" if curvature.is_negative else "inconclusive"
                        points.append({"x": fmt(point), "y": fmt(simplify(expr.subs(x, point))), "type": kind})
            result["answer"] = points if points else "No finite critical points could be determined symbolically."
            result["steps"] = [f"f'(x) = {derivative}", f"f''(x) = {second}", "Solve f'(x) = 0 and classify using the second derivative test."]

        elif op in ("domain", "range_continuity"):
            domain = S.Reals
            try:
                domain = __import__("sympy").calculus.util.continuous_domain(expr, x, S.Reals)
            except Exception:
                pass
            result["answer"] = {"domain": fmt(domain), "continuity": "Continuous on its domain (where defined)."}
            result["steps"] = ["The real domain is determined from the expression's restrictions.", "Continuity is assessed on the function's domain."]
            try:
                result["answer"]["range"] = fmt(__import__("sympy").calculus.util.function_range(expr, x, domain))
            except Exception:
                result["answer"]["range"] = "Could not determine symbolically."

        elif op == "discontinuity":
            try:
                points = singularities(expr, x, domain=S.Reals)
                result["answer"] = fmt(points)
                result["steps"] = ["Find points where the expression is singular or undefined.", f"Candidate discontinuities: {points}"]
            except Exception:
                result["answer"] = "Could not determine discontinuities symbolically."
                result["steps"] = ["Try a simpler expression, such as 1/(x-2)."]

        elif op == "graph":
            lo, hi = float(payload.lower), float(payload.upper)
            if not np.isfinite([lo, hi]).all() or lo >= hi or hi - lo > 10000:
                raise ValueError("Choose a valid graph interval (lower must be less than upper).")
            fn = __import__("sympy").lambdify(x, expr, modules=["numpy"])
            xs = np.linspace(lo, hi, 500)
            with np.errstate(all="ignore"):
                ys = np.asarray(fn(xs))
                if np.isscalar(ys):
                    ys = np.full_like(xs, ys, dtype=float)
                ys = np.asarray(ys, dtype=float)
                ys[~np.isfinite(ys)] = np.nan
            result["answer"] = "Graph data generated."
            result["graph"] = {"x": xs.tolist(), "y": ys.tolist()}
            result["steps"] = [f"Plot f(x) = {expr}", f"Interval: [{lo}, {hi}]"]

        else:
            raise ValueError("Choose a supported operation.")

        return result

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to solve this expression: {exc}")
