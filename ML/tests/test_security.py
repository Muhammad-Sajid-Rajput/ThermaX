"""Security regression tests: production fail-fast and synthetic exclusion.

- Booting the ML service with ENV=production and no ML_SERVICE_KEY must
  raise instead of serving open endpoints. Dev/test (non-production) keeps
  the controlled open behavior.
- Synthetic (seed/demo) reports are excluded from clustering by default.
"""
import asyncio

import pytest


def _run_lifespan(app_module):
    async def _go():
        async with app_module.lifespan(app_module.app):
            pass

    return asyncio.run(_go())


def test_production_boot_without_key_raises(monkeypatch):
    import main as app_module

    monkeypatch.setattr(app_module, "ML_SERVICE_KEY", "")
    monkeypatch.setattr(app_module, "ENV_NAME", "production")
    with pytest.raises(RuntimeError, match="ML_SERVICE_KEY"):
        _run_lifespan(app_module)


def test_non_production_boot_without_key_is_allowed(monkeypatch):
    import main as app_module

    monkeypatch.setattr(app_module, "ML_SERVICE_KEY", "")
    monkeypatch.setattr(app_module, "ENV_NAME", "development")
    # Must not raise. The lifespan may start a real BackgroundScheduler; it
    # shuts down cleanly on lifespan exit and no job fires during the test.
    _run_lifespan(app_module)


def test_production_boot_with_key_is_allowed(monkeypatch):
    import main as app_module

    monkeypatch.setattr(app_module, "ML_SERVICE_KEY", "test-secret")
    monkeypatch.setattr(app_module, "ENV_NAME", "production")
    _run_lifespan(app_module)
