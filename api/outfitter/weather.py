"""Weather - notebook cells 21-23.

The web app already fetches its own forecast from Open-Meteo, on the server and
without a key, and paints the sky from it. So the picks endpoint takes the
temperature and rain chance it is given, and this module is the fallback for
when the caller has none: the notebook's OpenWeatherMap path, key and all.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import requests

from .config import OPENWEATHER_API_KEY

TIMEOUT = 10


def get_location_from_ip(test_ip: str | None = None) -> dict[str, Any]:
    url = "http://ip-api.com/json/" + (test_ip or "")
    data = requests.get(url, timeout=TIMEOUT).json()
    if data.get("status") == "fail":
        raise RuntimeError(f"ip-api could not place this address: {data.get('message')}")
    return {"lat": data["lat"], "lon": data["lon"],
            "city": data.get("city"), "country": data.get("country")}


def fetch_hourly_weather(lat: float, lon: float, api_key: str | None = None) -> list[dict]:
    key = api_key or OPENWEATHER_API_KEY
    if not key:
        raise RuntimeError("No OPENWEATHER_API_KEY; pass the weather in with the request instead.")
    response = requests.get(
        "https://api.openweathermap.org/data/2.5/forecast",
        params={"lat": lat, "lon": lon, "appid": key, "units": "metric"},
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    return response.json()["list"]


def get_weather_for_time(forecast: list[dict], target: datetime) -> dict[str, Any]:
    """The forecast entry nearest the moment asked for."""
    closest = min(forecast, key=lambda e: abs(datetime.fromtimestamp(e["dt"]) - target))
    return {
        "temp": closest["main"]["temp"],
        "feels_like": closest["main"].get("feels_like"),
        "rain_probability": round(float(closest.get("pop", 0)) * 100),
        "condition": (closest.get("weather") or [{}])[0].get("main", ""),
        "at": datetime.fromtimestamp(closest["dt"]).isoformat(),
    }


def build_occasion_time(hour: int, minute: int = 0, base_date: datetime | None = None) -> datetime:
    base = base_date or datetime.now()
    return base.replace(hour=hour, minute=minute, second=0, microsecond=0)
