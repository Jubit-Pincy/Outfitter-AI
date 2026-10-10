"""Where things live, and the few knobs worth turning.

The notebook ran from inside its own folder, so its paths were relative to
there. The API runs from `api/`, so the paths are resolved from here
instead of assumed.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

API_DIR = Path(__file__).resolve().parent.parent
ROOT = API_DIR.parent

# The notebook's own folder. Nothing here writes to the notebook or its
# requirements; only `Images/items.json` is shared.
PROGRAM_DIR = ROOT / "notebook"
BASE_DIR = PROGRAM_DIR / "Images"
UPLOAD_DIR = BASE_DIR / "uploads"
ITEMS_FILE = BASE_DIR / "items.json"

# Accounts, per-user wardrobes and schedules. Kept out of the notebook's
# folder so the program stays a program.
DATA_DIR = API_DIR / "data"
DB_FILE = DATA_DIR / "outfitter.db"

# The notebook read its key from its own .env; so do we.
load_dotenv(PROGRAM_DIR / ".env")
load_dotenv(API_DIR / ".env")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

# Florence-2. Pulled from Hugging Face on first use and cached; `tagging.py`
# never loads it at import time.
FLORENCE_MODEL = os.getenv("FLORENCE_MODEL", "microsoft/Florence-2-base")

SESSION_DAYS = 30

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
