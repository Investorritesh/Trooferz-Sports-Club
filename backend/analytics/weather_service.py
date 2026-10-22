"""
Trooferz Sports Club - Real-Time Weather Advisory Service
Coordinates: Baner, Pune (18.5590° N, 73.7868° E)

Provides real-time weather observation, precipitation risk assessment,
and sport-specific playing condition advisories for outdoor courts
(Box Cricket, Football, Tennis) vs indoor courts (Badminton).

Features:
- Live Open-Meteo API query with automatic fallback to Pune climatological simulator if offline
- 15-minute in-memory caching to optimize response times
- Smart rain-check policy eligibility
- Suggests indoor court alternatives during adverse weather
"""

import logging
import time
from datetime import datetime, date, time as dtime
from typing import Dict, Any, List, Optional
import requests

logger = logging.getLogger(__name__)

# Trooferz Sports Club Baner Coordinates
PUNE_BANER_LAT = 18.5590
PUNE_BANER_LON = 73.7868

# Cache settings (15 minutes TTL)
_WEATHER_CACHE: Dict[str, Any] = {
    'timestamp': 0,
    'data': None
}
CACHE_TTL_SECONDS = 900

# WMO Weather Interpretation Codes
WMO_CODE_MAP = {
    0: ("Clear sky", "CLEAR", 0),
    1: ("Mainly clear", "CLEAR", 5),
    2: ("Partly cloudy", "CLOUDY", 15),
    3: ("Overcast", "CLOUDY", 25),
    45: ("Foggy", "FOG", 20),
    48: ("Depositing rime fog", "FOG", 20),
    51: ("Light drizzle", "RAIN", 50),
    53: ("Moderate drizzle", "RAIN", 65),
    55: ("Dense drizzle", "RAIN", 80),
    61: ("Slight rain", "RAIN", 70),
    63: ("Moderate rain", "RAIN", 85),
    65: ("Heavy rain", "HEAVY_RAIN", 95),
    80: ("Slight rain showers", "RAIN", 60),
    81: ("Moderate rain showers", "RAIN", 75),
    82: ("Violent rain showers", "HEAVY_RAIN", 95),
    95: ("Thunderstorm", "THUNDERSTORM", 90),
}


def _simulate_pune_weather(target_date: Optional[date] = None, target_time: Optional[dtime] = None) -> Dict[str, Any]:
    """
    Deterministic Pune weather fallback generator for offline viva environments
    or when external API is unreachable. Accounts for Pune's seasonal climate:
    - Monsoon (June-September): High rain probability
    - Summer (March-May): High afternoon temperatures (up to 38-40°C)
    - Winter (November-February): Pleasant 20-28°C
    """
    now = datetime.now()
    d = target_date or now.date()
    t = target_time or now.time()
    month = d.month
    hour = t.hour

    is_monsoon = 6 <= month <= 9
    is_summer = 3 <= month <= 5

    if is_monsoon:
        temp = 25.0 + (hour % 5)
        rain_prob = 65 if hour >= 14 else 45
        condition = "Monsoon Showers"
        code = 61
    elif is_summer:
        temp = 30.0 + (8.0 if 12 <= hour <= 16 else 2.0)
        rain_prob = 10
        condition = "Hot & Sunny" if 11 <= hour <= 17 else "Warm & Clear"
        code = 0
    else:
        temp = 22.0 + (6.0 if 11 <= hour <= 16 else 1.0)
        rain_prob = 5
        condition = "Pleasant & Clear"
        code = 0

    return {
        'temperature_c': round(temp, 1),
        'condition': condition,
        'precipitation_probability': rain_prob,
        'humidity_pct': 75 if is_monsoon else (40 if is_summer else 55),
        'wind_speed_kmh': 12.5,
        'weather_code': code,
        'is_simulated': True,
        'location': 'Baner, Pune (Trooferz Ground)'
    }


def fetch_live_pune_weather() -> Dict[str, Any]:
    """
    Fetches real-time hourly and current weather from Open-Meteo API.
    Caches results for 15 minutes. Gracefully degrades to simulator on network failure.
    """
    global _WEATHER_CACHE
    now_epoch = time.time()

    if _WEATHER_CACHE['data'] and (now_epoch - _WEATHER_CACHE['timestamp'] < CACHE_TTL_SECONDS):
        return _WEATHER_CACHE['data']

    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={PUNE_BANER_LAT}&longitude={PUNE_BANER_LON}&"
        f"current_weather=true&"
        f"hourly=temperature_2m,precipitation_probability,relative_humidity_2m,wind_speed_10m,weathercode&"
        f"timezone=Asia/Kolkata"
    )

    try:
        resp = requests.get(url, timeout=3.0)
        if resp.status_code == 200:
            raw = resp.json()
            curr = raw.get('current_weather', {})
            code = curr.get('weathercode', 0)
            desc, cat, est_rain = WMO_CODE_MAP.get(code, ("Fair", "CLEAR", 10))

            hourly = raw.get('hourly', {})
            hourly_list = []
            times = hourly.get('time', [])
            temps = hourly.get('temperature_2m', [])
            probs = hourly.get('precipitation_probability', [])
            codes = hourly.get('weathercode', [])

            for i in range(min(len(times), 24)):
                h_code = codes[i] if i < len(codes) else 0
                h_desc, _, _ = WMO_CODE_MAP.get(h_code, ("Clear", "CLEAR", 0))
                hourly_list.append({
                    'time': times[i],
                    'temperature_c': temps[i] if i < len(temps) else curr.get('temperature', 28.0),
                    'precipitation_probability': probs[i] if i < len(probs) else 0,
                    'condition': h_desc,
                    'weather_code': h_code
                })

            weather_data = {
                'location': 'Baner, Pune (Trooferz Ground)',
                'coordinates': {'latitude': PUNE_BANER_LAT, 'longitude': PUNE_BANER_LON},
                'current': {
                    'temperature_c': curr.get('temperature', 28.0),
                    'wind_speed_kmh': curr.get('windspeed', 10.0),
                    'weather_code': code,
                    'condition': desc,
                    'category': cat,
                    'estimated_rain_prob': est_rain,
                    'time': curr.get('time', datetime.now().isoformat())
                },
                'hourly': hourly_list,
                'is_simulated': False,
                'fetched_at': datetime.now().isoformat()
            }

            _WEATHER_CACHE['timestamp'] = now_epoch
            _WEATHER_CACHE['data'] = weather_data
            return weather_data

    except Exception as exc:
        logger.warning(f"Live Open-Meteo weather fetch failed ({exc}). Using offline Pune simulator.")

    fallback_curr = _simulate_pune_weather()
    fallback_data = {
        'location': 'Baner, Pune (Trooferz Ground)',
        'coordinates': {'latitude': PUNE_BANER_LAT, 'longitude': PUNE_BANER_LON},
        'current': fallback_curr,
        'hourly': [
            {
                'time': f"{datetime.now().strftime('%Y-%m-%d')}T{h:02d}:00",
                **_simulate_pune_weather(target_time=dtime(h, 0))
            }
            for h in range(6, 23)
        ],
        'is_simulated': True,
        'fetched_at': datetime.now().isoformat()
    }
    _WEATHER_CACHE['timestamp'] = now_epoch
    _WEATHER_CACHE['data'] = fallback_data
    return fallback_data


def evaluate_slot_weather(court, target_date: date, start_time: dtime) -> Dict[str, Any]:
    """
    Evaluates playing suitability for a given court, date, and start time.

    Outdoor courts (Turf, Box Cricket, Tennis, Football):
      - Rain probability >= 50%: UNFAVORABLE (Rain Check Guaranteed)
      - Rain probability 30-49%: CAUTION (Possible Showers)
      - Temperature >= 38°C (afternoon): CAUTION (Heatwave)
      - Otherwise: FAVORABLE (Optimal Play)

    Indoor courts (Badminton, Squash, Table Tennis, Gym):
      - Always FAVORABLE or WEATHER_PROOF regardless of outdoor rain.
    """
    sport_name = court.sport.name.lower() if court and court.sport else ''
    court_name = court.name.lower() if court else ''

    # Identify outdoor vs indoor sports
    indoor_keywords = ['badminton', 'squash', 'table tennis', 'indoor', 'gym', 'pool']
    is_indoor = any(k in sport_name or k in court_name for k in indoor_keywords)
    is_outdoor = not is_indoor

    weather_data = fetch_live_pune_weather()
    current = weather_data.get('current', {})

    # Extract target slot temperature and rain prob
    # Match target hour in hourly forecast if today, otherwise simulate for date
    today = date.today()
    if target_date == today:
        hour = start_time.hour
        hour_entry = None
        for h in weather_data.get('hourly', []):
            time_str = h.get('time', '')
            if f"T{hour:02d}:" in time_str or f" {hour:02d}:" in time_str:
                hour_entry = h
                break
        if hour_entry:
            temp = hour_entry.get('temperature_c', current.get('temperature_c', 28.0))
            rain_prob = hour_entry.get('precipitation_probability', current.get('estimated_rain_prob', 10))
            condition = hour_entry.get('condition', current.get('condition', 'Clear'))
        else:
            temp = current.get('temperature_c', 28.0)
            rain_prob = current.get('estimated_rain_prob', 10)
            condition = current.get('condition', 'Clear')
    else:
        sim = _simulate_pune_weather(target_date, start_time)
        temp = sim['temperature_c']
        rain_prob = sim['precipitation_probability']
        condition = sim['condition']

    # Evaluation logic
    if is_indoor:
        status = 'FAVORABLE'
        badge_color = 'green'
        advisory_title = "Weather-Proof Indoor Court"
        advisory_message = f"Indoor arena with climate control. Outdoor {condition.lower()} ({temp}°C) will not affect your game."
        rain_check_guaranteed = False
    else:
        if rain_prob >= 50:
            status = 'UNFAVORABLE'
            badge_color = 'red'
            advisory_title = "Rain Advisory - Outdoor Play At Risk"
            advisory_message = (
                f"High rain probability ({rain_prob}%) expected in Baner. "
                f"Turf may become slippery. Free rain-check reschedule or 100% wallet refund guaranteed if unplayable."
            )
            rain_check_guaranteed = True
        elif rain_prob >= 30:
            status = 'CAUTION'
            badge_color = 'amber'
            advisory_title = "Showers Possible"
            advisory_message = f"Scattered cloud cover ({rain_prob}% rain chance). Match can proceed with caution."
            rain_check_guaranteed = False
        elif temp >= 38.0 and (12 <= start_time.hour <= 16):
            status = 'CAUTION'
            badge_color = 'amber'
            advisory_title = "High Temperature Warning"
            advisory_message = f"Peak afternoon heat ({temp}°C). Free chilled electrolyte water available at Trooferz front desk."
            rain_check_guaranteed = False
        else:
            status = 'FAVORABLE'
            badge_color = 'green'
            advisory_title = "Prime Playing Conditions"
            advisory_message = f"Clear skies and pleasant breeze ({temp}°C, {rain_prob}% rain). Perfect for outdoor {court.sport.name if court else 'sports'}!"
            rain_check_guaranteed = False

    return {
        'court_id': court.id if court else None,
        'court_name': court.name if court else 'Court',
        'is_indoor': is_indoor,
        'is_outdoor': is_outdoor,
        'target_date': target_date.strftime('%Y-%m-%d'),
        'target_time': start_time.strftime('%H:%M'),
        'temperature_c': float(temp),
        'precipitation_probability': int(rain_prob),
        'condition': condition,
        'status': status,
        'badge_color': badge_color,
        'advisory_title': advisory_title,
        'advisory_message': advisory_message,
        'rain_check_guaranteed': rain_check_guaranteed,
        'location': 'Trooferz Sports Club, Baner, Pune'
    }
