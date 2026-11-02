"""
MailGuard AI - Offline Model Evaluation Script.

Loads saved metrics or runs on-demand evaluation against test data.
"""

import os
import sys
import json
from typing import Dict, Any

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

METRICS_PATH = os.path.join(backend_dir, "models", "evaluation_metrics.json")


def get_stored_metrics() -> Dict[str, Any]:
    """Retrieves the precomputed offline evaluation metrics."""
    if not os.path.exists(METRICS_PATH):
        return {
            "status": "not_evaluated",
            "message": "Evaluation metrics not found. Run model training first."
        }
    with open(METRICS_PATH, "r") as f:
        return json.load(f)


if __name__ == "__main__":
    metrics = get_stored_metrics()
    print(json.dumps(metrics, indent=2))
