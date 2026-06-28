from datetime import timezone, timedelta

# Sri Lanka Standard Time (UTC+5:30)
SLST = timezone(timedelta(hours=5, minutes=30))

def utc_to_slst(utc_dt) -> str:
    """Convert UTC datetime to Sri Lanka time ISO string."""
    if utc_dt is None:
        return None
    return utc_dt.astimezone(SLST).isoformat()

def format_slst(utc_dt) -> str:
    """Return human readable Sri Lanka time."""
    if utc_dt is None:
        return None
    return utc_dt.astimezone(SLST).strftime('%d %b %Y, %I:%M:%S %p')
    # Returns: "28 Jun 2026, 10:16:59 PM"