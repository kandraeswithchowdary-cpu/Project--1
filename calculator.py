"""Scientific calculator engine with safe expression evaluation."""

from __future__ import annotations

import ast
import argparse
import math
import operator
from dataclasses import dataclass
from typing import Callable


class CalculatorError(ValueError):
    """Raised when an expression cannot be evaluated safely."""


@dataclass(frozen=True)
class EvaluationResult:
    expression: str
    result: float
    angle_mode: str


class ScientificCalculator:
    """Evaluate scientific calculator expressions using Python's AST safely."""

    _binary_ops: dict[type[ast.operator], Callable[[float, float], float]] = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.FloorDiv: operator.floordiv,
    }

    _unary_ops: dict[type[ast.unaryop], Callable[[float], float]] = {
        ast.UAdd: operator.pos,
        ast.USub: operator.neg,
    }

    _constants = {
        "pi": math.pi,
        "e": math.e,
        "tau": math.tau,
        "inf": math.inf,
    }

    def __init__(self, angle_mode: str = "rad") -> None:
        self.angle_mode = self._normalize_angle_mode(angle_mode)
        self._functions = self._build_functions()

    def evaluate(self, expression: str, angle_mode: str | None = None) -> EvaluationResult:
        if not isinstance(expression, str) or not expression.strip():
            raise CalculatorError("Expression must be a non-empty string.")

        original_mode = self.angle_mode
        if angle_mode is not None:
            self.angle_mode = self._normalize_angle_mode(angle_mode)

        try:
            normalized = expression.replace("^", "**")
            tree = ast.parse(normalized, mode="eval")
            result = float(self._eval_node(tree.body))
        except (SyntaxError, TypeError) as exc:
            raise CalculatorError("Invalid expression.") from exc
        except ZeroDivisionError as exc:
            raise CalculatorError("Division by zero.") from exc
        except OverflowError as exc:
            raise CalculatorError("Result is too large.") from exc
        finally:
            if angle_mode is not None:
                self.angle_mode = original_mode

        if not math.isfinite(result):
            raise CalculatorError("Result is not finite.")

        return EvaluationResult(expression=expression, result=result, angle_mode=angle_mode or original_mode)

    def available_functions(self) -> list[str]:
        return sorted(self._functions)

    def available_constants(self) -> list[str]:
        return sorted(self._constants)

    def _eval_node(self, node: ast.AST) -> float:
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)

        if isinstance(node, ast.BinOp):
            op = self._binary_ops.get(type(node.op))
            if op is None:
                raise CalculatorError("Unsupported operator.")
            return op(self._eval_node(node.left), self._eval_node(node.right))

        if isinstance(node, ast.UnaryOp):
            op = self._unary_ops.get(type(node.op))
            if op is None:
                raise CalculatorError("Unsupported unary operator.")
            return op(self._eval_node(node.operand))

        if isinstance(node, ast.Name):
            if node.id in self._constants:
                return float(self._constants[node.id])
            raise CalculatorError(f"Unknown constant: {node.id}.")

        if isinstance(node, ast.Call):
            return self._eval_call(node)

        raise CalculatorError("Unsupported expression.")

    def _eval_call(self, node: ast.Call) -> float:
        if not isinstance(node.func, ast.Name):
            raise CalculatorError("Only direct function calls are supported.")

        if node.keywords:
            raise CalculatorError("Keyword arguments are not supported.")

        function = self._functions.get(node.func.id)
        if function is None:
            raise CalculatorError(f"Unknown function: {node.func.id}.")

        args = [self._eval_node(argument) for argument in node.args]
        try:
            return float(function(*args))
        except TypeError as exc:
            raise CalculatorError(f"Wrong number of arguments for {node.func.id}.") from exc
        except ValueError as exc:
            raise CalculatorError(f"Invalid input for {node.func.id}.") from exc

    def _build_functions(self) -> dict[str, Callable[..., float]]:
        return {
            "abs": abs,
            "acos": lambda x: self._from_radians(math.acos(x)),
            "asin": lambda x: self._from_radians(math.asin(x)),
            "atan": lambda x: self._from_radians(math.atan(x)),
            "ceil": math.ceil,
            "cos": lambda x: math.cos(self._to_radians(x)),
            "degrees": math.degrees,
            "exp": math.exp,
            "factorial": lambda x: float(math.factorial(self._require_integer(x))),
            "floor": math.floor,
            "gcd": lambda a, b: float(math.gcd(self._require_integer(a), self._require_integer(b))),
            "hypot": math.hypot,
            "ln": math.log,
            "log": math.log10,
            "log10": math.log10,
            "log2": math.log2,
            "max": max,
            "min": min,
            "pow": math.pow,
            "radians": math.radians,
            "round": round,
            "sin": lambda x: math.sin(self._to_radians(x)),
            "sqrt": math.sqrt,
            "tan": lambda x: math.tan(self._to_radians(x)),
        }

    def _to_radians(self, value: float) -> float:
        return math.radians(value) if self.angle_mode == "deg" else value

    def _from_radians(self, value: float) -> float:
        return math.degrees(value) if self.angle_mode == "deg" else value

    @staticmethod
    def _normalize_angle_mode(angle_mode: str) -> str:
        normalized = angle_mode.lower().strip()
        if normalized not in {"rad", "deg"}:
            raise CalculatorError("angle_mode must be 'rad' or 'deg'.")
        return normalized

    @staticmethod
    def _require_integer(value: float) -> int:
        if not float(value).is_integer():
            raise CalculatorError("Expected an integer value.")
        return int(value)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run scientific calculator expressions.")
    parser.add_argument("expression", nargs="*", help="Expression to calculate.")
    parser.add_argument(
        "--angle-mode",
        choices=["rad", "deg"],
        default="rad",
        help="Use radians or degrees for trigonometry.",
    )
    return parser


def _run_repl(calculator: ScientificCalculator, angle_mode: str) -> None:
    print("Scientific Calculator")
    print("Type an expression, or type 'exit' to quit.")
    while True:
        expression = input("> ").strip()
        if expression.lower() in {"exit", "quit"}:
            break
        if not expression:
            continue

        try:
            result = calculator.evaluate(expression, angle_mode=angle_mode)
            print(result.result)
        except CalculatorError as exc:
            print(f"Error: {exc}")


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()
    calculator = ScientificCalculator(angle_mode=args.angle_mode)

    if args.expression:
        expression = " ".join(args.expression)
        try:
            result = calculator.evaluate(expression)
            print(result.result)
        except CalculatorError as exc:
            print(f"Error: {exc}")
        return

    _run_repl(calculator, args.angle_mode)


if __name__ == "__main__":
    main()
