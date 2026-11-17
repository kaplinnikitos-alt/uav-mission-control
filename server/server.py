"""Локальный Flask-сервер для UAV Mission Control.

Запуск: python server/server.py
API: /api/health, /api/enu, /api/ndvi, /api/pid
Все расчёты используют стандартную библиотеку Python.
"""
from __future__ import annotations
import math
import os
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import BadRequest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
app = Flask(__name__, static_folder=ROOT, static_url_path="")
A = 6378137.0
E2 = 0.00669437999014


def number(name: str, default: float | None = None) -> float:
    raw = request.args.get(name)
    if raw is None:
        if default is None:
            raise BadRequest(f"Missing query parameter: {name}")
        return float(default)
    try:
        value = float(raw)
    except (TypeError, ValueError) as exc:
        raise BadRequest(f"Parameter {name} must be numeric") from exc
    if not math.isfinite(value):
        raise BadRequest(f"Parameter {name} must be finite")
    return value


def ecef(lat: float, lon: float, height: float = 0.0) -> tuple[float, float, float]:
    if not -90 <= lat <= 90 or not -180 <= lon <= 180:
        raise BadRequest("Latitude/longitude are outside WGS-84 bounds")
    p, l = math.radians(lat), math.radians(lon)
    n = A / math.sqrt(1 - E2 * math.sin(p) ** 2)
    return ((n + height) * math.cos(p) * math.cos(l),
            (n + height) * math.cos(p) * math.sin(l),
            (n * (1 - E2) + height) * math.sin(p))


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/api/health")
def health():
    return jsonify(status="ok", service="UAV Mission Control API", version="2.7.0")


@app.get("/api/enu")
def api_enu():
    lat0, lon0, h0 = number("lat0"), number("lon0"), number("h0", 0)
    lat, lon, height = number("lat"), number("lon"), number("h", 0)
    p0, p1 = ecef(lat0, lon0, h0), ecef(lat, lon, height)
    dx, dy, dz = (p1[i] - p0[i] for i in range(3))
    phi, lam = math.radians(lat0), math.radians(lon0)
    east = -math.sin(lam) * dx + math.cos(lam) * dy
    north = (-math.sin(phi) * math.cos(lam) * dx
             - math.sin(phi) * math.sin(lam) * dy + math.cos(phi) * dz)
    up = (math.cos(phi) * math.cos(lam) * dx
          + math.cos(phi) * math.sin(lam) * dy + math.sin(phi) * dz)
    return jsonify(e=east, n=north, u=up, distance=math.sqrt(east**2 + north**2 + up**2),
                   ned={"n": north, "e": east, "d": -up})


@app.get("/api/ndvi")
def api_ndvi():
    nir, red = number("nir"), number("red")
    threshold = number("th", 0.35)
    if nir < 0 or red < 0 or nir + red == 0:
        raise BadRequest("NIR and Red must be non-negative and their sum must be positive")
    if not -1 <= threshold <= 1:
        raise BadRequest("NDVI threshold must be between -1 and 1")
    value = (nir - red) / (nir + red)
    stress = value < threshold
    return jsonify(ndvi=value, stress=stress, action="shoot" if stress else "continue",
                   threshold=threshold)


@app.get("/api/pid")
def api_pid():
    kp, ki, kd = number("kp", 2.4), number("ki", 0.08), number("kd", 0.9)
    wind = number("wind", 0)
    if min(kp, ki, kd) < 0 or not 0 <= wind <= 50:
        raise BadRequest("Controller gains must be non-negative and wind must be 0..50 m/s")
    x = velocity = integral = previous_error = 0.0
    dt, values, errors = 0.02, [], []
    for step in range(500):
        t = step * dt
        error = 1.0 - x
        integral = max(-2.0, min(2.0, integral + error * dt))
        control = kp * error + ki * integral + kd * (error - previous_error) / dt
        gust = wind * 0.12 if 3 < t < 5 else wind * 0.025 * math.sin(t * 2.4)
        velocity += (control - 0.62 * velocity + gust) * dt
        x += velocity * dt
        previous_error = error
        values.append(x)
        errors.append(abs(error))
    return jsonify(position=values, error=errors,
                   overshoot=max(0.0, (max(values) - 1.0) * 100), dt=dt)


@app.errorhandler(BadRequest)
def bad_request(error):
    return jsonify(error="bad_request", message=error.description), 400


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
