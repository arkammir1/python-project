
import re

import numpy as np
import sympy as sp

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from latex2sympy2_extended import latex2sympy

from sympy import (
    Symbol, diff, integrate, solveset, S, simplify, singularities
)
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor,
)

app = FastAPI(title="Python Math Engine API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    "x": x,
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "sqrt": sp.sqrt,
    "log": sp.log,
    "ln": sp.log,
    "exp": sp.exp,
    "pi": sp.pi,
    "E": sp.E,
    "abs": sp.Abs,
}


class AnalysisRequest(BaseModel):
    expression: str
    operation: str
    input_format: str = "text"
    lower: float = -10
    upper: float = 10


def normalize_expression(raw: str) -> str:
    """Normalise common plain-text mathematical input."""

    if not raw or len(raw) > 250:
        raise ValueError("Enter a function containing 1–250 characters.")

    expression = raw.strip()

    expression = expression.replace("×", "*")
    expression = expression.replace("÷", "/")
    expression = expression.replace("−", "-")
    expression = expression.replace("π", "pi")

    expression = re.sub(
        r"(?<![A-Za-z])X(?![A-Za-z])", "x", expression
    )

    expression = re.sub(
        r"\b(sin|cos|tan|sqrt|log|ln|exp|abs)\b",
        lambda match: match.group(1).lower(),
        expression,
        flags=re.IGNORECASE,
    )

    shorthand_pattern = (
        r"\b(sin|cos|tan|sqrt|log|ln|exp)"
        r"\s*"
        r"([+-]?\s*(?:\d+(?:\.\d*)?|\.\d+)\s*)?"
        r"x\b"
    )

    def expand_shorthand(match):
        function = match.group(1).lower()
        coefficient = match.group(2)

        if coefficient:
            coefficient = coefficient.replace(" ", "").strip()
            argument = f"{coefficient}*x"
        else:
            argument = "x"

        return f"{function}({argument})"

    expression = re.sub(
        shorthand_pattern,
        expand_shorthand,
        expression,
        flags=re.IGNORECASE,
    )

    return expression


def parse_text_function(raw: str):
    """Parse ordinary keyboard text."""

    expression = normalize_expression(raw)

    if expression.count("(") != expression.count(")"):
        raise ValueError(
            "Your brackets are incomplete. Check that every opening "
            "bracket has a closing bracket."
        )

    if re.search(r"[+\-*/^]\s*$", expression):
        raise ValueError(
            "Your expression appears incomplete. Add the missing term."
        )

    try:
        return parse_expr(
            expression,
            local_dict=SAFE_LOCALS,
            transformations=TRANSFORMS,
            evaluate=True,
        )
    except Exception:
        raise ValueError(
            "I couldn't understand that expression. Check your syntax."
        )


def parse_latex_function(raw: str):
    """Convert MathLive LaTeX input into a SymPy expression."""

    if not raw or len(raw) > 1000:
        raise ValueError(
            "Enter a mathematical expression containing 1–1000 characters."
        )

    try:
        expr = latex2sympy(raw.strip())

        if not isinstance(expr, sp.Expr):
            raise ValueError(
                "Please enter a single mathematical expression."
            )

        # Map the converter's x symbol to the backend's x symbol.
        symbol_map = {
            symbol: x
            for symbol in expr.free_symbols
            if str(symbol) == "x"
        }

        expr = expr.xreplace(symbol_map)

        return expr

    except ValueError:
        raise

    except Exception:
        raise ValueError(
            "I couldn't interpret this mathematical notation. "
            "Please check your equation."
        )


def fmt(value):
    return str(value)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "message": "Python Math Engine is running."
    }


@app.post("/api/analyze")
def analyze(payload: AnalysisRequest):
    try:
        input_format = payload.input_format.lower()

        if input_format == "latex":
            expr = parse_latex_function(payload.expression)

        elif input_format == "text":
            expr = parse_text_function(payload.expression)

        else:
            raise ValueError("Unsupported input format.")

        op = payload.operation.lower()
        result = {}

        if op == "differentiate":
            derivative = simplify(diff(expr, x))

            result["answer"] = fmt(derivative)
            result["steps"] = [
                f"Original function: f(x) = {expr}",
                "Differentiate with respect to x.",
                f"f'(x) = {derivative}",
            ]

        elif op == "integrate":
            integral = integrate(expr, x)

            result["answer"] = fmt(integral) + " + C"
            result["steps"] = [
                f"Original function: f(x) = {expr}",
                "Integrate with respect to x.",
                f"∫ f(x) dx = {integral} + C",
            ]

        elif op == "maxima_minima":
            derivative = diff(expr, x)
            critical = solveset(derivative, x, domain=S.Reals)
            second = diff(expr, x, 2)

            points = []

            if critical.is_FiniteSet:
                for point in critical:
                    if point.is_real:
                        curvature = simplify(second.subs(x, point))

                        if curvature.is_positive:
                            kind = "local minimum"
                        elif curvature.is_negative:
                            kind = "local maximum"
                        else:
                            kind = "inconclusive"

                        points.append({
                            "x": fmt(point),
                            "y": fmt(simplify(expr.subs(x, point))),
                            "type": kind,
                        })

            result["answer"] = (
                points if points
                else "No finite critical points could be determined symbolically."
            )

            result["steps"] = [
                f"f'(x) = {derivative}",
                f"f''(x) = {second}",
                "Solve f'(x) = 0 and classify using the second derivative test.",
            ]

        elif op in ("domain", "range_continuity"):
            domain = S.Reals

            try:
                domain = sp.calculus.util.continuous_domain(
                    expr, x, S.Reals
                )
            except Exception:
                pass

            result["answer"] = {
                "domain": fmt(domain),
                "continuity": "Continuous on its domain (where defined).",
            }

            result["steps"] = [
                "The real domain is determined from the expression's restrictions.",
                "Continuity is assessed on the function's domain.",
            ]

            try:
                result["answer"]["range"] = fmt(
                    sp.calculus.util.function_range(expr, x, domain)
                )
            except Exception:
                result["answer"]["range"] = "Could not determine symbolically."

        elif op == "discontinuity":
            try:
                points = singularities(expr, x, domain=S.Reals)

                result["answer"] = fmt(points)
                result["steps"] = [
                    "Find points where the expression is singular or undefined.",
                    f"Candidate discontinuities: {points}",
                ]

            except Exception:
                result["answer"] = (
                    "Could not determine discontinuities symbolically."
                )
                result["steps"] = [
                    "Try a simpler expression, such as 1/(x-2)."
                ]

        elif op == "graph":
            lo, hi = float(payload.lower), float(payload.upper)

            if (
                not np.isfinite([lo, hi]).all()
                or lo >= hi
                or hi - lo > 10000
            ):
                raise ValueError(
                    "Choose a valid graph interval "
                    "(lower must be less than upper)."
                )

            fn = sp.lambdify(x, expr, modules=["numpy"])
            xs = np.linspace(lo, hi, 500)

            with np.errstate(all="ignore"):
                ys = np.asarray(fn(xs))

                if np.isscalar(ys):
                    ys = np.full_like(xs, ys, dtype=float)

                ys = np.asarray(ys, dtype=float)
                ys[~np.isfinite(ys)] = np.nan

            result["answer"] = "Graph data generated."
            result["graph"] = {
                "x": xs.tolist(),
                "y": ys.tolist(),
            }
            result["steps"] = [
                f"Plot f(x) = {expr}",
                f"Interval: [{lo}, {hi}]",
            ]

        else:
            raise ValueError("Choose a supported operation.")

        return result

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to solve this expression. Check your input and try again.",
        )
