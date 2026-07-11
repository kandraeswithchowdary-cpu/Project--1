import unittest

from calculator import CalculatorError, ScientificCalculator


class ScientificCalculatorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.calculator = ScientificCalculator()

    def test_basic_arithmetic(self) -> None:
        result = self.calculator.evaluate("2 + 3 * 4")
        self.assertEqual(result.result, 14)

    def test_power_alias(self) -> None:
        result = self.calculator.evaluate("2^8")
        self.assertEqual(result.result, 256)

    def test_scientific_functions(self) -> None:
        result = self.calculator.evaluate("sqrt(81) + log(1000) + ln(e)")
        self.assertEqual(result.result, 13)

    def test_radian_trigonometry(self) -> None:
        result = self.calculator.evaluate("sin(pi / 2)")
        self.assertAlmostEqual(result.result, 1)

    def test_degree_trigonometry(self) -> None:
        result = self.calculator.evaluate("sin(90)", angle_mode="deg")
        self.assertAlmostEqual(result.result, 1)
        self.assertEqual(result.angle_mode, "deg")

    def test_inverse_trigonometry_uses_angle_mode(self) -> None:
        result = self.calculator.evaluate("asin(1)", angle_mode="deg")
        self.assertAlmostEqual(result.result, 90)

    def test_integer_functions(self) -> None:
        result = self.calculator.evaluate("factorial(5) + gcd(48, 18)")
        self.assertEqual(result.result, 126)

    def test_unknown_names_are_rejected(self) -> None:
        with self.assertRaises(CalculatorError):
            self.calculator.evaluate("__import__('os').system('dir')")

    def test_invalid_math_input_is_reported(self) -> None:
        with self.assertRaises(CalculatorError):
            self.calculator.evaluate("sqrt(-1)")

    def test_non_finite_result_is_rejected(self) -> None:
        with self.assertRaises(CalculatorError):
            self.calculator.evaluate("1e309")


if __name__ == "__main__":
    unittest.main()
