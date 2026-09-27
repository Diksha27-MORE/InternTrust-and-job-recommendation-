"""
InternTrust Model Evaluation
--------------------------------
Evaluates the actual Logistic Regression fraud-detection model
using the SAME feature-extraction logic used by RiskEngine.

Evaluation method:
- dataset: Fake_Real_Job_Posting.csv
- 5-Fold Stratified Cross-Validation
- Logistic Regression(max_iter=1000)
- Real all-MiniLM-L6-v2 embedding when available
- Same TextAnalyzer and UrgencyDetector used by the project

IMPORTANT:
This script does NOT modify the dataset or labels.
"""

import sys
import csv
import json
from pathlib import Path

# ============================================================
# 1. PROJECT PATH
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from services.text_analyzer import TextAnalyzer
from services.urgency_detector import UrgencyDetector

from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

# ============================================================
# 2. DATASET PATH
# ============================================================

CSV_PATH = BACKEND_DIR / "data" / "Fake_Real_Job_Posting.csv"

print("=" * 60)
print("INTERNTRUST MODEL EVALUATION")
print("=" * 60)

print("\nDataset:")
print(CSV_PATH)

if not CSV_PATH.exists():
    print("\nERROR:  CSV file was not found!")
    print("Expected location:")
    print(CSV_PATH)
    sys.exit(1)

# ============================================================
# 3. LOAD DATASET
# ============================================================

rows = []

with open(CSV_PATH, newline="", encoding="utf-8") as f:

    reader = csv.DictReader(f)

    print("\nCSV columns:")
    print(reader.fieldnames)

    for row in reader:

        fraud = str(row.get("fraudulent", "")).strip().lower()

        # Real = 0
        if fraud in {
            "real",
            "0",
            "false",
            "legitimate"
        }:
            target = 0

        # Fake = 1
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
            print("WARNING: Unknown label skipped:", fraud)
            continue

        title_val = row.get("title", "") or ""

        # Same fallback logic used in evaluation script
        text_val = (
            row.get("description")
            or row.get("requirements")
            or ""
        )

        rows.append(
            (
                title_val,
                text_val,
                target
            )
        )

print("\nDataset loaded successfully.")

total = len(rows)
fake_count = sum(r[2] == 1 for r in rows)
real_count = sum(r[2] == 0 for r in rows)

print("Total records :", total)
print("Real records  :", real_count)
print("Fake records  :", fake_count)

# ============================================================
# 4. CHECK DATASET
# ============================================================

if total < 5:
    print("\nERROR: Not enough records for 5-fold cross-validation.")
    sys.exit(1)

if fake_count < 5:
    print("\nWARNING:")
    print(
        "There are fewer than 5 Fake records, so 5-fold "
        "stratified cross-validation is not possible."
    )
    print("Fake records:", fake_count)
    sys.exit(1)

# ============================================================
# 5. LOAD REAL PROJECT NLP COMPONENTS
# ============================================================

print("\nInitializing TextAnalyzer...")
print(
    "This will try to load "
    "all-MiniLM-L6-v2."
)

text_analyzer = TextAnalyzer()

print("\nInitializing UrgencyDetector...")

urgency_detector = UrgencyDetector()

# Check which embedding is actually being used
model_loader = text_analyzer.model_loader

using_real_transformer = (
    model_loader.model is not None
)

print("\n------------------------------------------------------------")
print(
    "Using real all-MiniLM-L6-v2:",
    using_real_transformer
)
print("------------------------------------------------------------")

if not using_real_transformer:

    print("\nWARNING:")
    print(
        "The real all-MiniLM-L6-v2 model was NOT loaded."
    )
    print(
        "The project's fallback embedding is being used."
    )
    print(
        "For your final paper, run this script after "
        "confirming the real transformer is loaded."
    )

# ============================================================
# 6. SAME FEATURE EXTRACTION LOGIC
# ============================================================

def extract_features(title, text):

    """
    Same feature extraction logic used by the project.

    Features:
    1. Text/scam-pattern similarity score
    2. Urgency score
    3. Text length score
    """

    combined_text = (
        f"{title or ''} {text or ''}"
    ).strip()

    # Text analysis
    try:
        text_score = float(
            text_analyzer.analyze(combined_text)
        )
    except Exception as e:
        print(
            "Text analysis warning:",
            e
        )
        text_score = 0.0

    # Urgency analysis
    try:
        urgency_score = float(
            urgency_detector.analyze(text or "")
        )
    except Exception as e:
        print(
            "Urgency analysis warning:",
            e
        )
        urgency_score = 0.0

    # Length score
    length_score = min(
        len(combined_text) / 5.0,
        100.0
    )

    return [
        text_score,
        urgency_score,
        length_score
    ]


# ============================================================
# 7. EXTRACT FEATURES
# ============================================================

print("\nExtracting features from all records...")

X = []
y = []

for title_val, text_val, target in rows:

    features = extract_features(
        title_val,
        text_val
    )

    X.append(features)
    y.append(target)

print("Feature extraction completed.")

print("\nFeature vector example:")
print(X[0])

# ============================================================
# 8. 5-FOLD STRATIFIED CROSS-VALIDATION
# ============================================================

print("\n============================================================")
print("5-FOLD STRATIFIED CROSS-VALIDATION")
print("============================================================")

cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)

model = LogisticRegression(
    max_iter=1000
)

print("\nTraining Logistic Regression...")
print("Model: LogisticRegression(max_iter=1000)")
print("Folds: 5")
print("Shuffle: True")
print("Random state: 42")

# Generate out-of-fold predictions
y_pred = cross_val_predict(
    model,
    X,
    y,
    cv=cv,
    method="predict"
)

# ============================================================
# 9. CALCULATE METRICS
# ============================================================

accuracy = accuracy_score(
    y,
    y_pred
)

precision = precision_score(
    y,
    y_pred,
    zero_division=0
)

recall = recall_score(
    y,
    y_pred,
    zero_division=0
)

f1 = f1_score(
    y,
    y_pred,
    zero_division=0
)

cm = confusion_matrix(
    y,
    y_pred,
    labels=[0, 1]
)

tn, fp, fn, tp = cm.ravel()

# ============================================================
# 10. PRINT RESULTS
# ============================================================

print("\n")
print("=" * 60)
print("FINAL CROSS-VALIDATION RESULTS")
print("=" * 60)

print(
    f"\nAccuracy :  {accuracy * 100:.2f}%"
)

print(
    f"Precision:  {precision * 100:.2f}%"
)

print(
    f"Recall   :  {recall * 100:.2f}%"
)

print(
    f"F1-score :  {f1 * 100:.2f}%"
)

print("\n------------------------------------------------------------")
print("CONFUSION MATRIX")
print("------------------------------------------------------------")

print(
    "[[TN FP]"
)
print(
    " [FN TP]]"
)

print(cm)

print("\n------------------------------------------------------------")
print("CONFUSION MATRIX VALUES")
print("------------------------------------------------------------")

print("True Negative  (TN):", tn)
print("False Positive (FP):", fp)
print("False Negative (FN):", fn)
print("True Positive  (TP):", tp)

# ============================================================
# 11. CLASSIFICATION REPORT
# ============================================================

print("\n------------------------------------------------------------")
print("CLASSIFICATION REPORT")
print("------------------------------------------------------------")

print(
    classification_report(
        y,
        y_pred,
        target_names=[
            "Real",
            "Fake"
        ],
        zero_division=0
    )
)

# ============================================================
# 12. SAVE RESULTS
# ============================================================

results = {

    "dataset": str(CSV_PATH),

    "total_records": total,

    "real_records": real_count,

    "fake_records": fake_count,

    "evaluation_method":
        "5-Fold Stratified Cross-Validation",

    "random_state": 42,

    "model":
        "LogisticRegression(max_iter=1000)",

    "embedding":
        "all-MiniLM-L6-v2"
        if using_real_transformer
        else "Project fallback embedding",

    "using_real_transformer":
        using_real_transformer,

    "accuracy":
        float(accuracy),

    "precision":
        float(precision),

    "recall":
        float(recall),

    "f1_score":
        float(f1),

    "confusion_matrix":
        cm.tolist(),

    "true_negative":
        int(tn),

    "false_positive":
        int(fp),

    "false_negative":
        int(fn),

    "true_positive":
        int(tp)
}

RESULTS_PATH = (
    BACKEND_DIR /
    "InternTrust_eval_results.json"
)

with open(
    RESULTS_PATH,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        results,
        f,
        indent=4
    )

print("\n============================================================")
print("RESULTS SAVED")
print("============================================================")

print(RESULTS_PATH)

print("\nEvaluation completed successfully.")