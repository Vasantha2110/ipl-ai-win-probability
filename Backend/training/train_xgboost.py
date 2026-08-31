import pandas as pd

from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    log_loss,
    confusion_matrix
)

from xgboost import XGBClassifier


# ============================================================
# 1. LOAD DATASET
# ============================================================

DATA_PATH = "Backend/data/processed/match_states.csv"

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)

print("\nColumns:")
print(df.columns.tolist())


# ============================================================
# 2. TARGET AND MATCH ID
# ============================================================

TARGET = "target_label"

# Keep match_id separately.
# We will use it only for match-aware train/test splitting.
match_ids = df["match_id"]


# ============================================================
# 3. CREATE FEATURES AND TARGET
# ============================================================

# Remove target and match_id from model features
X = df.drop(columns=[TARGET, "match_id"])

y = df[TARGET]


# Keep only numerical columns
X = X.select_dtypes(include=["number"])


print("\nNumerical features:")
print(X.columns.tolist())

print("\nNumber of features:", X.shape[1])


# ============================================================
# 4. MATCH-AWARE TRAIN / TEST SPLIT
# ============================================================

print("\nCreating match-aware train/test split...")

gss = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42
)

train_idx, test_idx = next(
    gss.split(X, y, groups=match_ids)
)


# Create training data
X_train = X.iloc[train_idx]
y_train = y.iloc[train_idx]


# Create testing data
X_test = X.iloc[test_idx]
y_test = y.iloc[test_idx]


print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))

print("Training matches:", match_ids.iloc[train_idx].nunique())
print("Testing matches:", match_ids.iloc[test_idx].nunique())


# ============================================================
# 5. CHECK FOR MATCH OVERLAP
# ============================================================

train_matches = set(match_ids.iloc[train_idx])
test_matches = set(match_ids.iloc[test_idx])

overlap = train_matches.intersection(test_matches)

print("\nMatch overlap between training and testing:", len(overlap))

if len(overlap) == 0:
    print("✓ No match overlap. Split is correct.")
else:
    print("WARNING: Match overlap detected!")


# ============================================================
# 6. XGBOOST MODEL
# ============================================================

model = XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="binary:logistic",
    eval_metric="logloss",
    random_state=42
)


print("\nTraining XGBoost...")


# Train model
model.fit(X_train, y_train)


# ============================================================
# 7. PREDICTION
# ============================================================

y_pred = model.predict(X_test)

y_prob = model.predict_proba(X_test)[:, 1]


# ============================================================
# 8. EVALUATION
# ============================================================

accuracy = accuracy_score(y_test, y_pred)

precision = precision_score(y_test, y_pred)

recall = recall_score(y_test, y_pred)

f1 = f1_score(y_test, y_pred)

roc_auc = roc_auc_score(y_test, y_prob)

loss = log_loss(y_test, y_prob)


# ============================================================
# 9. PRINT RESULTS
# ============================================================

print("\n==============================")
print("XGBOOST MATCH-AWARE RESULTS")
print("==============================")


print(f"Accuracy : {accuracy:.4f}")

print(f"Precision: {precision:.4f}")

print(f"Recall   : {recall:.4f}")

print(f"F1 Score : {f1:.4f}")

print(f"ROC-AUC  : {roc_auc:.4f}")

print(f"Log Loss : {loss:.4f}")


# ============================================================
# 10. CONFUSION MATRIX
# ============================================================

print("\nConfusion Matrix:")

print(confusion_matrix(y_test, y_pred))


# ============================================================
# 11. FEATURE IMPORTANCE
# ============================================================

importance = pd.Series(
    model.feature_importances_,
    index=X.columns
).sort_values(ascending=False)


print("\nTop Feature Importance:")

print(importance)


# ============================================================
# 12. SAVE MODEL
# ============================================================

MODEL_PATH = "Backend/models/xgboost_win_probability.json"

model.save_model(MODEL_PATH)


print("\nModel saved successfully.")

print("Model path:", MODEL_PATH)