# Superset configuration for the vosk.dev BI instance (ADR-0003 — self-hosted).
#
# Mounted into the container at /app/pythonpath/superset_config.py. Every value that is a
# secret comes from the environment; nothing sensitive is committed here.
#
# The four settings that actually make embedding work are marked EMBEDDING. Everything
# else is ordinary hardening. If an embed fails, check those four before anything else.

import os
from datetime import timedelta

from flask_caching.backends.rediscache import RedisCache


def _required(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable {name}")
    return value


# --- Core ------------------------------------------------------------------------------

# Rotating this invalidates every existing session and all encrypted DB connection
# passwords stored in the metadata database. Set it once, back it up, leave it alone.
SECRET_KEY = _required("SUPERSET_SECRET_KEY")

SQLALCHEMY_DATABASE_URI = _required("SUPERSET_METADATA_DB_URI")
SQLALCHEMY_TRACK_MODIFICATIONS = False

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_URL": REDIS_URL,
}
DATA_CACHE_CONFIG = CACHE_CONFIG
FILTER_STATE_CACHE_CONFIG = {**CACHE_CONFIG, "CACHE_KEY_PREFIX": "superset_filter_"}
EXPLORE_FORM_DATA_CACHE_CONFIG = {**CACHE_CONFIG, "CACHE_KEY_PREFIX": "superset_form_"}
RESULTS_BACKEND = RedisCache(host="redis", port=6379, key_prefix="superset_results")

# --- EMBEDDING 1/4: the feature flag ---------------------------------------------------
# Without this the "Embed dashboard" item does not appear in the dashboard ⋯ menu at all.

FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
    "DASHBOARD_RBAC": True,
    "ALERT_REPORTS": False,
}

# --- EMBEDDING 2/4: guest token signing ------------------------------------------------
# Signs the guest tokens the site mints. Independent of SECRET_KEY. Every process serving
# the API must agree on this value — with more than one container, a mismatch produces
# tokens that mint fine and are rejected at the iframe, intermittently.
#
# 300s matches the SDK's refresh cadence. Raising it does not make a broken refresh work;
# it only delays the symptom past the point where you would notice it during testing.

GUEST_ROLE_NAME = "EmbeddedGuest"
GUEST_TOKEN_JWT_SECRET = _required("SUPERSET_GUEST_TOKEN_JWT_SECRET")
GUEST_TOKEN_JWT_ALGO = "HS256"
GUEST_TOKEN_HEADER_NAME = "X-GuestToken"
GUEST_TOKEN_JWT_EXP_SECONDS = 300

# --- EMBEDDING 3/4: who may frame this instance ----------------------------------------
# Talisman sets the CSP. `frame-ancestors` is the self-hosted equivalent of Preset's
# per-dashboard "Allowed Domains" — it is instance-wide, so it belongs here rather than
# per dashboard. Exact origins, protocol included. Never use '*'.

ALLOWED_FRAME_ANCESTORS = [
    o.strip()
    for o in os.environ.get(
        "SUPERSET_FRAME_ANCESTORS", "https://vosk.dev http://localhost:3000"
    ).split()
    if o.strip()
]

TALISMAN_ENABLED = True
TALISMAN_CONFIG = {
    "content_security_policy": {
        "base-uri": ["'self'"],
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "blob:"],
        "worker-src": ["'self'", "blob:"],
        "connect-src": ["'self'"],
        "object-src": "'none'",
        # Superset's own bundle needs these; tightening them breaks the UI, not the embed.
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "frame-ancestors": ["'self'", *ALLOWED_FRAME_ANCESTORS],
    },
    "force_https": False,  # TLS terminates at Caddy; Superset itself speaks HTTP
    "session_cookie_secure": True,
    "session_cookie_http_only": True,
}

# Cookies must be SameSite=None to survive being sent from inside a cross-site iframe.
# SameSite=None without Secure is dropped by every current browser, so these two travel
# together — this is why the instance must be HTTPS even for local testing.
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True

# --- EMBEDDING 4/4: CORS ---------------------------------------------------------------
# The iframe talks back to Superset from the site's origin.

ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": ["*"],
    "origins": ALLOWED_FRAME_ANCESTORS,
}

# --- API auth --------------------------------------------------------------------------
# The site caches its Superset session for 45 minutes (src/lib/superset.ts SESSION_TTL_MS).
# Keep this comfortably above that, or every mint pays for a doomed first attempt before
# its retry. Lower this and you must lower SESSION_TTL_MS too.

JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=1)

# The site sends X-CSRFToken with the session cookie, so the guest-token endpoint is NOT
# exempted here. Exempting it is the common shortcut; it is unnecessary once the cookie is
# carried correctly, and the exemption is easy to forget you made.
WTF_CSRF_ENABLED = True
WTF_CSRF_TIME_LIMIT = None

# --- Misc ------------------------------------------------------------------------------

ROW_LIMIT = 50000
SUPERSET_WEBSERVER_TIMEOUT = 120
SQLLAB_CTAS_NO_LIMIT = True
PUBLIC_ROLE_LIKE = None  # anonymous users get nothing; guests come in via guest tokens
