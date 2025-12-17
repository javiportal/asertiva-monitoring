import unittest

from .diff_utils import build_diff, is_trivial_diff


class DiffUtilsTests(unittest.TestCase):
    def test_build_diff_marks_insertions(self):
        diff = build_diff("hola mundo", "hola mundo ampliado")
        self.assertIn("+++ current", diff)
        self.assertTrue(any(line.startswith("+hola mundo ampliado") for line in diff.splitlines()))

    def test_trivial_numeric_diff(self):
        numeric_diff = "\n".join(["--- previous", "+++ current", "-Conteo: 12", "+Conteo: 13"])
        self.assertTrue(is_trivial_diff(numeric_diff))

    def test_non_trivial_text(self):
        text_diff = "\n".join(["--- previous", "+++ current", "-Aviso anterior", "+Nueva reforma tributaria aprobada"])
        self.assertFalse(is_trivial_diff(text_diff))


if __name__ == "__main__":
    unittest.main()
