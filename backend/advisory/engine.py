"""
Deterministic Agromet Advisory Rule Engine – Module C
Matches block-level forecast + crop/stage → advice rows + workflow states.
"""
import json
import uuid
from datetime import datetime, date
from pathlib import Path
from typing import List, Optional

RULES_PATH = Path(__file__).parent.parent / "data" / "advisory_rules.json"

# In-memory advisory store (keyed by advisory_id)
_ADVISORIES: dict = {}


def _load_rules() -> List[dict]:
    if RULES_PATH.exists():
        with open(RULES_PATH, encoding="utf-8") as f:
            return json.load(f)
    return []


def _matches_condition(condition: dict, rain_mm: float, tmax_c: float) -> bool:
    checks = []
    if "rain_min" in condition:
        checks.append(rain_mm >= condition["rain_min"])
    if "rain_max" in condition:
        checks.append(rain_mm <= condition["rain_max"])
    if "tmax_min" in condition:
        checks.append(tmax_c >= condition["tmax_min"])
    if "tmax_max" in condition:
        checks.append(tmax_c <= condition["tmax_max"])
    return all(checks) if checks else True


def generate_advisories(
    block_id: str,
    block_name: str,
    block_rain: float,
    block_tmax: float,
    forecast_date: Optional[str] = None,
    crops: Optional[List[str]] = None,
) -> List[dict]:
    """
    Match rules against forecast values and create advisory drafts.
    Returns list of advisory objects with status=DRAFT.
    Idempotent: clears old advisories for this block+date before regenerating.
    """
    if crops is None:
        crops = ["Soybean", "Wheat"]

    fd = forecast_date or str(date.today())
    rules = _load_rules()

    # Remove stale advisories for this block+date
    to_remove = [
        k for k, v in _ADVISORIES.items()
        if v["block_id"] == block_id and v["forecast_date"] == fd
    ]
    for k in to_remove:
        del _ADVISORIES[k]

    new_advisories = []
    for rule in rules:
        if rule["crop"] not in crops:
            continue
        if not _matches_condition(rule["condition"], block_rain, block_tmax):
            continue

        adv_id = str(uuid.uuid4())
        adv = {
            "advisory_id": adv_id,
            "rule_id": rule["rule_id"],
            "block_id": block_id,
            "block_name": block_name,
            "forecast_date": fd,
            "crop": rule["crop"],
            "crop_hi": rule["crop_hi"],
            "growth_stage": rule["growth_stage"],
            "growth_stage_hi": rule["growth_stage_hi"],
            "severity": rule["severity"],
            "advice_en": rule["advice_en"],
            "advice_hi": rule["advice_hi"],
            "sms_en": rule["sms_en"],
            "sms_hi": rule["sms_hi"],
            "status": "DRAFT",
            "created_at": datetime.utcnow().isoformat(),
            "approved_at": None,
            "approved_by": None,
            "edit_history": [],
            "rain_trigger_mm": block_rain,
            "tmax_trigger_c": block_tmax,
        }
        _ADVISORIES[adv_id] = adv
        new_advisories.append(adv)

    return new_advisories


def get_all_advisories(block_id: Optional[str] = None) -> List[dict]:
    advs = list(_ADVISORIES.values())
    if block_id:
        advs = [a for a in advs if a["block_id"] == block_id]
    return sorted(advs, key=lambda x: x["created_at"], reverse=True)


def approve_advisory(advisory_id: str, officer: str = "Officer") -> Optional[dict]:
    adv = _ADVISORIES.get(advisory_id)
    if not adv:
        return None
    adv["status"] = "APPROVED"
    adv["approved_at"] = datetime.utcnow().isoformat()
    adv["approved_by"] = officer
    return adv


def edit_advisory(
    advisory_id: str,
    new_text_en: Optional[str] = None,
    new_text_hi: Optional[str] = None,
    new_sms_en: Optional[str] = None,
    new_sms_hi: Optional[str] = None,
    editor: str = "Officer",
) -> Optional[dict]:
    adv = _ADVISORIES.get(advisory_id)
    if not adv:
        return None

    history_entry = {
        "editor": editor,
        "timestamp": datetime.utcnow().isoformat(),
        "old_advice_en": adv["advice_en"],
        "old_advice_hi": adv["advice_hi"],
    }
    adv["edit_history"].append(history_entry)

    if new_text_en:
        adv["advice_en"] = new_text_en
    if new_text_hi:
        adv["advice_hi"] = new_text_hi
    if new_sms_en:
        adv["sms_en"] = new_sms_en[:160]  # SMS cap
    if new_sms_hi:
        adv["sms_hi"] = new_sms_hi[:160]
    adv["status"] = "DRAFT"  # Reset to draft after edit
    return adv


def simulate_sms_dispatch(advisory_id: str) -> dict:
    """Simulate SMS dispatch for approved advisory."""
    adv = _ADVISORIES.get(advisory_id)
    if not adv:
        return {"success": False, "error": "Advisory not found"}
    if adv["status"] != "APPROVED":
        return {"success": False, "error": "Only APPROVED advisories can be dispatched"}

    sms_text = adv["sms_hi"]
    char_count = len(sms_text)
    return {
        "success": True,
        "advisory_id": advisory_id,
        "block_id": adv["block_id"],
        "sms_text": sms_text,
        "char_count": char_count,
        "within_sms_limit": char_count <= 160,
        "simulated_recipients": 1200,
        "dispatched_at": datetime.utcnow().isoformat(),
    }
