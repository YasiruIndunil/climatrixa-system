"""
Tests — run with: pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_placeholder():
    """Placeholder — expand with real tests after setting up .env for testing."""
    assert 1 + 1 == 2


# Example of how to test the API once you have a .env:
#
# from app.main import app
# client = TestClient(app)
#
# def test_health():
#     response = client.get("/health")
#     assert response.status_code == 200
#     assert response.json()["status"] == "healthy"
#
# def test_list_sensors():
#     response = client.get("/sensors/")
#     assert response.status_code == 200
#     assert isinstance(response.json(), list)
