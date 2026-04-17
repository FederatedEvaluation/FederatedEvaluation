import math
import unittest

from fed4fed import server


def _is_finite(val: float) -> bool:
    return math.isfinite(val)


class TestFed4Fed(unittest.TestCase):
    def test_performance_normal(self):
        datasets = [[0.9, 0.8, 0.82], [0.85, 0.86, 0.84]]
        resp = server.build_response(datasets)
        self.assertTrue(_is_finite(resp["pValue"]))
        self.assertEqual(len(resp["clients"]), 2)
        self.assertTrue(all(_is_finite(c["mean"]) for c in resp["clients"]))
        self.assertTrue(_is_finite(resp["fed4fedAnalysis"]["effectSize"]))

    def test_performance_with_missing_client(self):
        datasets = [[0.9, 0.8], []]  # missing group
        resp = server.build_response(datasets)
        self.assertTrue(_is_finite(resp["pValue"]))
        self.assertEqual(resp["clients"][1]["n"], 0)

    def test_performance_all_same_values(self):
        datasets = [[0.5, 0.5, 0.5], [0.5, 0.5]]
        resp = server.build_response(datasets)
        self.assertTrue(_is_finite(resp["pValue"]))
        self.assertTrue(all(_is_finite(c["mean"]) for c in resp["clients"]))

    def test_performance_summary_clients(self):
        clients = [
            {"id": "Client 1", "n": 3, "mean": 0.9, "std": 0.0, "ci": [0.88, 0.92]},
            {"id": "Client 2", "n": 4, "mean": 0.85, "std": 0.015, "ci": [0.83, 0.87]},
        ]
        resp = server.build_response_from_clients(clients, alpha=0.05)
        self.assertEqual(len(resp["clients"]), 2)
        self.assertTrue(_is_finite(resp["pValue"]))
        self.assertTrue(all(_is_finite(c["std"]) for c in resp["clients"]))

    def test_performance_summary_insufficient_samples(self):
        clients = [{"id": "Client 1", "n": 1, "mean": 0.9, "std": 0.01, "ci": [0.9, 0.9]}]
        with self.assertRaises(ValueError):
            server.build_response_from_clients(clients, alpha=0.05)


class TestFede3(unittest.TestCase):
    def test_model_fairness_normal(self):
        datasets = [[0.01, -0.02, 0.0], [0.03, 0.01, -0.01]]
        resp = server.build_fede3_response(datasets)
        self.assertIn(resp["biasClassification"]["biasType"], ("fair", "systemic", "heterogeneous"))
        self.assertTrue(_is_finite(resp["twoStageTest"]["stage1_pValue"]))

    def test_model_fairness_insufficient_samples(self):
        datasets = [[0.01], [0.02]]
        with self.assertRaises(ValueError):
            server.build_fede3_response(datasets)

    def test_model_fairness_all_same(self):
        datasets = [[0.0, 0.0, 0.0], [0.0, 0.0]]
        resp = server.build_fede3_response(datasets)
        self.assertTrue(_is_finite(resp["twoStageTest"]["stage1_pValue"]))
        self.assertTrue(all(_is_finite(c["demographicParity"]) for c in resp["clients"]))

    def test_model_fairness_summary_clients(self):
        clients = [
            {"id": "Client 1", "n": 3, "mean": 0.01, "std": 0.02, "ci": [-0.01, 0.03]},
            {"id": "Client 2", "n": 4, "mean": -0.005, "std": 0.015, "ci": [-0.02, 0.01]},
        ]
        resp = server.build_fede3_response_from_clients(clients, alpha=0.05)
        self.assertIn(resp["biasClassification"]["biasType"], ("fair", "systemic", "heterogeneous"))
        self.assertTrue(_is_finite(resp["twoStageTest"]["stage1_pValue"]))


class TestD3em(unittest.TestCase):
    def test_collaborative_normal(self):
        datasets = [[0.12, 0.10, 0.11], [0.08, 0.09, 0.10]]
        resp = server.build_d3em_response(datasets)
        self.assertEqual(len(resp["clients"]), 2)
        self.assertTrue(all(_is_finite(c["weight"]) for c in resp["clients"]))

    def test_collaborative_missing_client(self):
        datasets = [[0.1, 0.2], []]
        resp = server.build_d3em_response(datasets)
        self.assertEqual(resp["clients"][1]["n"], 0)
        self.assertTrue(_is_finite(resp["twoStageTest"]["stage1_pValue"]))

    def test_collaborative_all_same(self):
        datasets = [[0.5, 0.5], [0.5, 0.5]]
        resp = server.build_d3em_response(datasets)
        self.assertTrue(all(_is_finite(c["mean"]) for c in resp["clients"]))
        self.assertTrue(all(_is_finite(c["weight"]) for c in resp["clients"]))

    def test_collaborative_clients_payload(self):
        clients = [
            {
                "id": "Client 1",
                "contributionSeries": [0.14, 0.15, 0.16, 0.15, 0.17],
                "independentAccuracy": 0.92,
                "rewardedAccuracy": 0.915,
            },
            {
                "id": "Client 2",
                "contributionSeries": [0.11, 0.10, 0.12, 0.11, 0.12],
                "independentAccuracy": 0.88,
                "rewardedAccuracy": 0.885,
            },
        ]
        resp = server.build_d3em_response_from_clients(clients, alpha=0.05, k_recent=3)
        self.assertEqual(len(resp["clients"]), 2)
        self.assertTrue(resp["rhoXY"]["valid"])
        self.assertTrue(_is_finite(resp["rhoXY"]["value"]))

    def test_collaborative_clients_invalid(self):
        clients = [{"id": "Client 1", "contributionSeries": [0.1], "independentAccuracy": 0.9, "rewardedAccuracy": 0.9}]
        with self.assertRaises(ValueError):
            server.build_d3em_response_from_clients(clients, alpha=0.05, k_recent=5)


if __name__ == "__main__":
    unittest.main()
