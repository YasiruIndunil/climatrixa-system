"""
Tests — run with: pytest tests/ -v
"""


def test_placeholder():
    """Placeholder — expand with real tests after setting up .env for testing."""
    assert 1 + 1 == 2


# Example of how to test the API once you have a .env configured:
#
# from fastapi.testclient import TestClient
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
