"""Regression tests for the pre-Phase-5 honesty/config pass.

- QC calibration tolerances must live in config.py (env-overridable),
  not as literals inside the check module.
- The fusion source label must name the actual satellite source
  (MODIS LST via GEE), not "MODIS/Landsat".
"""

import os
import subprocess
import sys

import config
from services import quality_control
from services.fusion_service import calculate_fusion_score

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_qc_tolerances_come_from_config():
    """Single source of truth: the check module aliases config values."""
    assert quality_control.TEMP_TOLERANCE_C == config.QC_TEMP_TOLERANCE_C
    assert quality_control.ANOMALY_TOLERANCE_C == config.QC_ANOMALY_TOLERANCE_C
    assert quality_control.SCORE_PENALTY_PER_FAILURE == config.QC_SCORE_PENALTY_PER_FAILURE


def test_qc_tolerance_defaults_are_documented():
    assert config.QC_TEMP_TOLERANCE_C == 3.0
    assert config.QC_ANOMALY_TOLERANCE_C == 8.0
    assert config.QC_SCORE_PENALTY_PER_FAILURE == 0.35


def test_qc_tolerance_env_override():
    """An operator can recalibrate without a code change."""
    env = dict(os.environ, QC_TEMP_TOLERANCE_C="7.5")
    proc = subprocess.run(
        [sys.executable, "-c", "import config; print(config.QC_TEMP_TOLERANCE_C)"],
        capture_output=True,
        text=True,
        env=env,
        cwd=REPO_ROOT,
    )
    assert proc.returncode == 0, proc.stderr
    assert proc.stdout.strip() == "7.5"


def test_fusion_satellite_label_names_actual_source():
    result = calculate_fusion_score(
        severity_level=4,
        heat_index_c=41.0,
        satellite_lst_c=44.2,
        qc_result={"score": 1.0, "verdict": "pass"},
    )
    assert result["sources"]["satellite"] == "MODIS LST (GEE)"
    assert "Landsat" not in str(result["sources"]["satellite"])
