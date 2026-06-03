import requests
from typing import List, Dict, Any
from app.config import settings


EXCLUDE_KEYS = {"cv"}


def fetch_submissions(submission_type: str = "tech") -> List[Dict[str, Any]]:
    """Fetch submissions from Zetheta WordPress API."""
    url = settings.SOURCE_URL_TECH if submission_type == "tech" else settings.SOURCE_URL_NONTECH
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and "data" in data:
            return data["data"]
        return data if isinstance(data, list) else []
    except Exception as e:
        raise RuntimeError(f"Failed to fetch submissions from {url}: {e}")


def filter_submissions(
    submissions: List[Dict[str, Any]],
    filter_mode: str,
    filter_value: str,
) -> List[Dict[str, Any]]:
    """Apply filters to submission list."""
    if filter_mode == "all" or not filter_value:
        return submissions

    values = [v.strip() for v in filter_value.split(",")]
    results = []

    for sub in submissions:
        user_id = str(sub.get("user_id", ""))
        role = (sub.get("role") or sub.get("role_name") or "").lower()
        course = (sub.get("course") or "").lower()
        college = (sub.get("college") or "").lower()

        if filter_mode == "user_id" and user_id in values:
            results.append(sub)
        elif filter_mode == "role" and any(v.lower() in role for v in values):
            results.append(sub)
        elif filter_mode == "course" and any(v.lower() in course for v in values):
            results.append(sub)
        elif filter_mode == "college" and any(v.lower() in college for v in values):
            results.append(sub)

    return results


def build_payload(submission: Dict[str, Any]) -> Dict[str, Any]:
    """Remove excluded keys and ensure user_id is string."""
    payload = {
        k: v for k, v in submission.items()
        if k not in EXCLUDE_KEYS
    }
    if "user_id" in payload:
        payload["user_id"] = str(payload["user_id"])
    return payload
