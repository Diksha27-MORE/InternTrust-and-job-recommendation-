import sys
import csv
from pathlib import Path

# ------------------------------------------------------------
# PATH
# ------------------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from services.text_analyzer import TextAnalyzer
from services.urgency_detector import UrgencyDetector

CSV_PATH = (
    BACKEND_DIR
    / "data"
    / "Fake_Real_Job_Posting_Cleaned.csv"
)

# ------------------------------------------------------------
# LOAD
# ------------------------------------------------------------

print("=" * 70)
print("INTERNTRUST FEATURE INSPECTION")
print("=" * 70)

print("\nDataset:")
print(CSV_PATH)

rows = []

with open(
    CSV_PATH,
    newline="",
    encoding="utf-8"
) as f:

    reader = csv.DictReader(f)

    for row in reader:

        fraud = (
            str(row.get("fraudulent", ""))
            .strip()
            .lower()
        )

        if fraud in {
            "real",
            "0",
            "false",
            "legitimate"
        }:
            target = 0

        elif fraud in {
            "fake",
            "1",
            "true",
            "fraud",
            "fraudulent",
            "scam"
        }:
            target = 1

        else:
            continue

        title = row.get("title", "") or ""

        text = (
            row.get("description")
            or row.get("requirements")
            or ""
        )

        rows.append(
            (title, text, target)
        )

print("\nTotal rows:", len(rows))

print(
    "Real:",
    sum(r[2] == 0 for r in rows)
)

print(
    "Fake:",
    sum(r[2] == 1 for r in rows)
)

# ------------------------------------------------------------
# LOAD MODELS
# ------------------------------------------------------------

print("\nLoading TextAnalyzer...")

text_analyzer = TextAnalyzer()

print("\nLoading UrgencyDetector...")

urgency_detector = UrgencyDetector()

print(
    "\nUsing real MiniLM:",
    text_analyzer.model_loader.model is not None
)

# ------------------------------------------------------------
# FEATURE EXTRACTION
# ------------------------------------------------------------

def extract_features(title, text):

    combined = (
        f"{title or ''} {text or ''}"
    ).strip()

    try:
        text_score = float(
            text_analyzer.analyze(combined)
        )
    except Exception as e:
        print("Text error:", e)
        text_score = 0.0

    try:
        urgency_score = float(
            urgency_detector.analyze(text or "")
        )
    except Exception as e:
        print("Urgency error:", e)
        urgency_score = 0.0

    length_score = min(
        len(combined) / 5.0,
        100.0
    )

    return (
        text_score,
        urgency_score,
        length_score
    )

# ------------------------------------------------------------
# CALCULATE
# ------------------------------------------------------------

fake_features = []
real_features = []

for title, text, target in rows:

    features = extract_features(
        title,
        text
    )

    if target == 1:
        fake_features.append(
            (title, features)
        )
    else:
        real_features.append(
            (title, features)
        )

# ------------------------------------------------------------
# PRINT FAKE FEATURES
# ------------------------------------------------------------

print("\n")
print("=" * 70)
print("FAKE JOB FEATURES")
print("=" * 70)

for i, (title, features) in enumerate(
    fake_features,
    start=1
):

    print(
        f"\nFake #{i}"
    )

    print(
        "Title:",
        title[:100]
    )

    print(
        "Text similarity:",
        round(features[0], 4)
    )

    print(
        "Urgency:",
        round(features[1], 4)
    )

    print(
        "Length:",
        round(features[2], 4)
    )

# ------------------------------------------------------------
# PRINT FEATURE RANGES
# ------------------------------------------------------------

print("\n")
print("=" * 70)
print("FEATURE RANGES")
print("=" * 70)

for name, index in [
    ("Text similarity", 0),
    ("Urgency", 1),
    ("Length", 2)
]:

    fake_values = [
        x[1][index]
        for x in fake_features
    ]

    real_values = [
        x[1][index]
        for x in real_features
    ]

    print("\n" + name)

    print(
        "Fake:"
    )

    print(
        "  min =",
        min(fake_values)
    )

    print(
        "  max =",
        max(fake_values)
    )

    print(
        "  avg =",
        sum(fake_values)
        / len(fake_values)
    )

    print(
        "Real:"
    )

    print(
        "  min =",
        min(real_values)
    )

    print(
        "  max =",
        max(real_values)
    )

    print(
        "  avg =",
        sum(real_values)
        / len(real_values)
    )

print("\n")
print("=" * 70)
print("DONE")
print("=" * 70)