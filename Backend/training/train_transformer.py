import numpy as np
import pandas as pd
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

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


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_PATH = BASE_DIR / "data" / "processed" / "match_states.csv"

MODEL_PATH = BASE_DIR / "models" / "transformer_win_probability.pth"


# ============================================================
# SETTINGS
# ============================================================

SEQUENCE_LENGTH = 12

BATCH_SIZE = 256

EPOCHS = 10

LEARNING_RATE = 0.0005

EMBED_DIM = 64

NUM_HEADS = 4

NUM_LAYERS = 2

DROPOUT = 0.1


# ============================================================
# FEATURES
# ============================================================

FEATURES = [
    "over",
    "legal_balls",
    "balls_remaining",
    "score",
    "wickets_lost",
    "wickets_remaining",
    "target",
    "runs_required",
    "batter_runs",
    "extras_runs",
    "total_runs",
    "current_run_rate",
    "required_run_rate",
    "recent_runs",
    "recent_wickets"
]


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("\nUsing device:", DEVICE)


# ============================================================
# LOAD DATA
# ============================================================

print("\nLoading dataset...")

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)


# ============================================================
# SORT DATA
# ============================================================

df = df.sort_values(
    by=["match_id", "legal_balls"]
).reset_index(drop=True)


# ============================================================
# MATCH-AWARE SPLIT
# ============================================================

print("\nCreating match-aware split...")

unique_matches = df["match_id"].unique()

match_splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42
)

train_match_idx, test_match_idx = next(
    match_splitter.split(
        unique_matches,
        groups=unique_matches
    )
)

train_matches = set(
    unique_matches[train_match_idx]
)

test_matches = set(
    unique_matches[test_match_idx]
)


print("Training matches:", len(train_matches))

print("Testing matches:", len(test_matches))

print(
    "Match overlap:",
    len(train_matches.intersection(test_matches))
)


# ============================================================
# CREATE SEQUENCES
# ============================================================

def create_sequences(dataframe, allowed_matches):

    X_sequences = []

    y_sequences = []

    for match_id, match_df in dataframe.groupby(
        "match_id",
        sort=False
    ):

        if match_id not in allowed_matches:
            continue

        match_df = match_df.sort_values(
            "legal_balls"
        ).reset_index(drop=True)

        if len(match_df) < SEQUENCE_LENGTH:
            continue

        features = match_df[
            FEATURES
        ].values.astype(np.float32)

        labels = match_df[
            "target_label"
        ].values.astype(np.float32)

        for i in range(
            SEQUENCE_LENGTH,
            len(match_df) + 1
        ):

            sequence = features[
                i - SEQUENCE_LENGTH:i
            ]

            label = labels[i - 1]

            X_sequences.append(sequence)

            y_sequences.append(label)

    return (
        np.array(X_sequences, dtype=np.float32),
        np.array(y_sequences, dtype=np.float32)
    )


print("\nCreating training sequences...")

X_train, y_train = create_sequences(
    df,
    train_matches
)


print("\nCreating testing sequences...")

X_test, y_test = create_sequences(
    df,
    test_matches
)


# ============================================================
# PRINT SHAPES
# ============================================================

print("\nTraining sequence shape:", X_train.shape)

print("Training labels shape:", y_train.shape)

print("Testing sequence shape:", X_test.shape)

print("Testing labels shape:", y_test.shape)


# ============================================================
# NORMALIZATION
# ============================================================

print("\nNormalizing features...")


# Calculate statistics ONLY from training data
mean = X_train.reshape(
    -1,
    X_train.shape[-1]
).mean(axis=0)

std = X_train.reshape(
    -1,
    X_train.shape[-1]
).std(axis=0)


# Prevent division by zero
std[std == 0] = 1


X_train = (
    X_train - mean
) / std


X_test = (
    X_test - mean
) / std


# ============================================================
# CONVERT TO PYTORCH TENSORS
# ============================================================

X_train_tensor = torch.tensor(
    X_train,
    dtype=torch.float32
)

y_train_tensor = torch.tensor(
    y_train,
    dtype=torch.float32
)


X_test_tensor = torch.tensor(
    X_test,
    dtype=torch.float32
)

y_test_tensor = torch.tensor(
    y_test,
    dtype=torch.float32
)


# ============================================================
# DATA LOADERS
# ============================================================

train_dataset = TensorDataset(
    X_train_tensor,
    y_train_tensor
)

test_dataset = TensorDataset(
    X_test_tensor,
    y_test_tensor
)


train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True
)


test_loader = DataLoader(
    test_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False
)


# ============================================================
# TRANSFORMER MODEL
# ============================================================

class CricketTransformer(nn.Module):

    def __init__(
        self,
        input_dim,
        sequence_length,
        embed_dim,
        num_heads,
        num_layers,
        dropout
    ):

        super().__init__()


        # Project 15 input features into embedding dimension
        self.input_projection = nn.Linear(
            input_dim,
            embed_dim
        )


        # Learnable positional embeddings
        self.position_embedding = nn.Parameter(
            torch.zeros(
                1,
                sequence_length,
                embed_dim
            )
        )


        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=num_heads,
            dim_feedforward=128,
            dropout=dropout,
            batch_first=True,
            activation="gelu"
        )


        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_layers
        )


        # Classification head
        self.classifier = nn.Sequential(

            nn.Linear(
                embed_dim,
                32
            ),

            nn.ReLU(),

            nn.Dropout(dropout),

            nn.Linear(
                32,
                1
            )
        )


    def forward(self, x):

        # Input projection
        x = self.input_projection(x)


        # Add positional information
        x = x + self.position_embedding


        # Transformer
        x = self.transformer(x)


        # Use final timestep
        x = x[:, -1, :]


        # Classification
        x = self.classifier(x)


        return x.squeeze(1)


# ============================================================
# CREATE MODEL
# ============================================================

model = CricketTransformer(
    input_dim=len(FEATURES),
    sequence_length=SEQUENCE_LENGTH,
    embed_dim=EMBED_DIM,
    num_heads=NUM_HEADS,
    num_layers=NUM_LAYERS,
    dropout=DROPOUT
).to(DEVICE)


print("\nTransformer model created.")

print(
    "Trainable parameters:",
    sum(
        p.numel()
        for p in model.parameters()
        if p.requires_grad
    )
)


# ============================================================
# LOSS AND OPTIMIZER
# ============================================================

criterion = nn.BCEWithLogitsLoss()

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=LEARNING_RATE,
    weight_decay=0.0001
)


# ============================================================
# TRAINING
# ============================================================

print("\nStarting Transformer training...")

print("=" * 60)


for epoch in range(EPOCHS):

    model.train()

    total_loss = 0.0

    correct = 0

    total = 0


    for batch_X, batch_y in train_loader:

        batch_X = batch_X.to(DEVICE)

        batch_y = batch_y.to(DEVICE)


        # Clear gradients
        optimizer.zero_grad()


        # Forward pass
        logits = model(batch_X)


        # Calculate loss
        loss = criterion(
            logits,
            batch_y
        )


        # Backpropagation
        loss.backward()


        # Update weights
        optimizer.step()


        total_loss += (
            loss.item()
            * batch_X.size(0)
        )


        probabilities = torch.sigmoid(
            logits
        )

        predictions = (
            probabilities >= 0.5
        ).float()


        correct += (
            predictions == batch_y
        ).sum().item()

        total += batch_y.size(0)


    epoch_loss = total_loss / total

    epoch_accuracy = correct / total


    print(
        f"Epoch [{epoch + 1}/{EPOCHS}] "
        f"Loss: {epoch_loss:.4f} "
        f"Accuracy: {epoch_accuracy:.4f}"
    )


# ============================================================
# EVALUATION
# ============================================================

print("\nEvaluating Transformer...")

model.eval()


all_probabilities = []

all_labels = []


with torch.no_grad():

    for batch_X, batch_y in test_loader:

        batch_X = batch_X.to(DEVICE)


        logits = model(batch_X)


        probabilities = torch.sigmoid(
            logits
        )


        all_probabilities.extend(
            probabilities.cpu().numpy()
        )


        all_labels.extend(
            batch_y.numpy()
        )


y_prob = np.array(
    all_probabilities
)

y_true = np.array(
    all_labels
)


y_pred = (
    y_prob >= 0.5
).astype(int)


# ============================================================
# METRICS
# ============================================================

accuracy = accuracy_score(
    y_true,
    y_pred
)

precision = precision_score(
    y_true,
    y_pred
)

recall = recall_score(
    y_true,
    y_pred
)

f1 = f1_score(
    y_true,
    y_pred
)

roc_auc = roc_auc_score(
    y_true,
    y_prob
)

loss = log_loss(
    y_true,
    y_prob
)


# ============================================================
# RESULTS
# ============================================================

print("\n==============================")

print("TRANSFORMER RESULTS")

print("==============================")


print(
    f"Accuracy : {accuracy:.4f}"
)

print(
    f"Precision: {precision:.4f}"
)

print(
    f"Recall   : {recall:.4f}"
)

print(
    f"F1 Score : {f1:.4f}"
)

print(
    f"ROC-AUC  : {roc_auc:.4f}"
)

print(
    f"Log Loss : {loss:.4f}"
)


print("\nConfusion Matrix:")

print(
    confusion_matrix(
        y_true,
        y_pred
    )
)


# ============================================================
# SAVE MODEL
# ============================================================

MODEL_PATH.parent.mkdir(
    parents=True,
    exist_ok=True
)


torch.save(
    {
        "model_state_dict": model.state_dict(),
        "features": FEATURES,
        "sequence_length": SEQUENCE_LENGTH,
        "mean": mean,
        "std": std,
        "embed_dim": EMBED_DIM,
        "num_heads": NUM_HEADS,
        "num_layers": NUM_LAYERS
    },
    MODEL_PATH
)


print("\nTransformer model saved successfully.")

print("Model path:")

print(MODEL_PATH)