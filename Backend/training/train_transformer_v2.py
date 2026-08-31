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

DATA_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "match_states.csv"
)

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "transformer_v2_win_probability.pth"
)


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
# NUMERICAL FEATURES
# ============================================================

NUMERICAL_FEATURES = [
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
# SORT
# ============================================================

df = df.sort_values(
    by=["match_id", "legal_balls"]
).reset_index(drop=True)


# ============================================================
# CREATE CATEGORICAL MAPPINGS
# ============================================================

print("\nCreating categorical mappings...")


team_values = sorted(
    set(df["batting_team"].astype(str))
    | set(df["bowling_team"].astype(str))
)

venue_values = sorted(
    df["venue"].astype(str).unique()
)


team_to_id = {
    team: index
    for index, team in enumerate(team_values)
}

venue_to_id = {
    venue: index
    for index, venue in enumerate(venue_values)
}


NUM_TEAMS = len(team_to_id)

NUM_VENUES = len(venue_to_id)


print("Number of teams:", NUM_TEAMS)

print("Number of venues:", NUM_VENUES)


# ============================================================
# MATCH-AWARE SPLIT
# ============================================================

print("\nCreating match-aware split...")

unique_matches = df["match_id"].unique()

splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42
)

train_indices, test_indices = next(
    splitter.split(
        unique_matches,
        groups=unique_matches
    )
)


train_matches = set(
    unique_matches[train_indices]
)

test_matches = set(
    unique_matches[test_indices]
)


print(
    "Training matches:",
    len(train_matches)
)

print(
    "Testing matches:",
    len(test_matches)
)

overlap = train_matches.intersection(
    test_matches
)

print(
    "Match overlap:",
    len(overlap)
)


# ============================================================
# CREATE SEQUENCES
# ============================================================

def create_sequences(
    dataframe,
    allowed_matches
):

    X_numeric = []

    X_batting_team = []

    X_bowling_team = []

    X_venue = []

    y = []


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


        numeric_values = match_df[
            NUMERICAL_FEATURES
        ].values.astype(np.float32)


        batting_team_values = match_df[
            "batting_team"
        ].astype(str).map(
            team_to_id
        ).values.astype(np.int64)


        bowling_team_values = match_df[
            "bowling_team"
        ].astype(str).map(
            team_to_id
        ).values.astype(np.int64)


        venue_values_match = match_df[
            "venue"
        ].astype(str).map(
            venue_to_id
        ).values.astype(np.int64)


        labels = match_df[
            "target_label"
        ].values.astype(np.float32)


        # ----------------------------------------------------
        # Sliding window
        # ----------------------------------------------------

        for i in range(
            SEQUENCE_LENGTH,
            len(match_df) + 1
        ):

            start = i - SEQUENCE_LENGTH

            end = i


            X_numeric.append(
                numeric_values[start:end]
            )


            X_batting_team.append(
                batting_team_values[start:end]
            )


            X_bowling_team.append(
                bowling_team_values[start:end]
            )


            X_venue.append(
                venue_values_match[start:end]
            )


            y.append(
                labels[i - 1]
            )


    return (
        np.array(
            X_numeric,
            dtype=np.float32
        ),

        np.array(
            X_batting_team,
            dtype=np.int64
        ),

        np.array(
            X_bowling_team,
            dtype=np.int64
        ),

        np.array(
            X_venue,
            dtype=np.int64
        ),

        np.array(
            y,
            dtype=np.float32
        )
    )


# ============================================================
# TRAINING SEQUENCES
# ============================================================

print("\nCreating training sequences...")

(
    X_train_num,
    X_train_bat,
    X_train_bowl,
    X_train_venue,
    y_train
) = create_sequences(
    df,
    train_matches
)


# ============================================================
# TESTING SEQUENCES
# ============================================================

print("\nCreating testing sequences...")

(
    X_test_num,
    X_test_bat,
    X_test_bowl,
    X_test_venue,
    y_test
) = create_sequences(
    df,
    test_matches
)


# ============================================================
# PRINT SHAPES
# ============================================================

print("\nTraining numerical shape:")
print(X_train_num.shape)

print("\nTraining batting-team shape:")
print(X_train_bat.shape)

print("\nTraining bowling-team shape:")
print(X_train_bowl.shape)

print("\nTraining venue shape:")
print(X_train_venue.shape)

print("\nTesting numerical shape:")
print(X_test_num.shape)

print("\nTesting labels shape:")
print(y_test.shape)


# ============================================================
# NORMALIZATION
# ============================================================

print("\nNormalizing numerical features...")


train_flat = X_train_num.reshape(
    -1,
    X_train_num.shape[-1]
)


mean = train_flat.mean(
    axis=0
)

std = train_flat.std(
    axis=0
)


std[std == 0] = 1


X_train_num = (
    X_train_num - mean
) / std


X_test_num = (
    X_test_num - mean
) / std


# ============================================================
# PYTORCH TENSORS
# ============================================================

X_train_num = torch.tensor(
    X_train_num,
    dtype=torch.float32
)

X_train_bat = torch.tensor(
    X_train_bat,
    dtype=torch.long
)

X_train_bowl = torch.tensor(
    X_train_bowl,
    dtype=torch.long
)

X_train_venue = torch.tensor(
    X_train_venue,
    dtype=torch.long
)

y_train = torch.tensor(
    y_train,
    dtype=torch.float32
)


X_test_num = torch.tensor(
    X_test_num,
    dtype=torch.float32
)

X_test_bat = torch.tensor(
    X_test_bat,
    dtype=torch.long
)

X_test_bowl = torch.tensor(
    X_test_bowl,
    dtype=torch.long
)

X_test_venue = torch.tensor(
    X_test_venue,
    dtype=torch.long
)

y_test = torch.tensor(
    y_test,
    dtype=torch.float32
)


# ============================================================
# DATASETS
# ============================================================

train_dataset = TensorDataset(
    X_train_num,
    X_train_bat,
    X_train_bowl,
    X_train_venue,
    y_train
)


test_dataset = TensorDataset(
    X_test_num,
    X_test_bat,
    X_test_bowl,
    X_test_venue,
    y_test
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

class CricketTransformerV2(
    nn.Module
):

    def __init__(
        self,
        num_features,
        num_teams,
        num_venues,
        sequence_length,
        embed_dim,
        num_heads,
        num_layers,
        dropout
    ):

        super().__init__()


        # ----------------------------------------------------
        # Numerical feature projection
        # ----------------------------------------------------

        self.numeric_projection = nn.Linear(
            num_features,
            embed_dim
        )


        # ----------------------------------------------------
        # Team embeddings
        # ----------------------------------------------------

        self.batting_team_embedding = nn.Embedding(
            num_teams,
            embed_dim
        )


        self.bowling_team_embedding = nn.Embedding(
            num_teams,
            embed_dim
        )


        # ----------------------------------------------------
        # Venue embedding
        # ----------------------------------------------------

        self.venue_embedding = nn.Embedding(
            num_venues,
            embed_dim
        )


        # ----------------------------------------------------
        # Positional embedding
        # ----------------------------------------------------

        self.position_embedding = nn.Parameter(
            torch.zeros(
                1,
                sequence_length,
                embed_dim
            )
        )


        # ----------------------------------------------------
        # Transformer encoder
        # ----------------------------------------------------

        encoder_layer = (
            nn.TransformerEncoderLayer(
                d_model=embed_dim,
                nhead=num_heads,
                dim_feedforward=128,
                dropout=dropout,
                batch_first=True,
                activation="gelu"
            )
        )


        self.transformer = (
            nn.TransformerEncoder(
                encoder_layer,
                num_layers=num_layers
            )
        )


        # ----------------------------------------------------
        # Classification head
        # ----------------------------------------------------

        self.classifier = nn.Sequential(

            nn.Linear(
                embed_dim,
                32
            ),

            nn.ReLU(),

            nn.Dropout(
                dropout
            ),

            nn.Linear(
                32,
                1
            )
        )


    def forward(
        self,
        numeric,
        batting_team,
        bowling_team,
        venue
    ):

        # Numerical representation
        numeric_embedding = (
            self.numeric_projection(
                numeric
            )
        )


        # Categorical representations
        batting_embedding = (
            self.batting_team_embedding(
                batting_team
            )
        )


        bowling_embedding = (
            self.bowling_team_embedding(
                bowling_team
            )
        )


        venue_embedding = (
            self.venue_embedding(
                venue
            )
        )


        # Combine all information
        x = (
            numeric_embedding
            + batting_embedding
            + bowling_embedding
            + venue_embedding
        )


        # Add positional information
        x = (
            x
            + self.position_embedding
        )


        # Transformer
        x = self.transformer(
            x
        )


        # Final timestep
        x = x[:, -1, :]


        # Prediction
        output = self.classifier(
            x
        )


        return output.squeeze(1)


# ============================================================
# CREATE MODEL
# ============================================================

model = CricketTransformerV2(
    num_features=len(
        NUMERICAL_FEATURES
    ),
    num_teams=NUM_TEAMS,
    num_venues=NUM_VENUES,
    sequence_length=SEQUENCE_LENGTH,
    embed_dim=EMBED_DIM,
    num_heads=NUM_HEADS,
    num_layers=NUM_LAYERS,
    dropout=DROPOUT
).to(DEVICE)


print("\nTransformer V2 created.")

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

print("\nStarting Transformer V2 training...")

print("=" * 60)


for epoch in range(EPOCHS):

    model.train()

    total_loss = 0.0

    correct = 0

    total = 0


    for (
        batch_num,
        batch_bat,
        batch_bowl,
        batch_venue,
        batch_y
    ) in train_loader:


        batch_num = batch_num.to(
            DEVICE
        )

        batch_bat = batch_bat.to(
            DEVICE
        )

        batch_bowl = batch_bowl.to(
            DEVICE
        )

        batch_venue = batch_venue.to(
            DEVICE
        )

        batch_y = batch_y.to(
            DEVICE
        )


        optimizer.zero_grad()


        logits = model(
            batch_num,
            batch_bat,
            batch_bowl,
            batch_venue
        )


        loss = criterion(
            logits,
            batch_y
        )


        loss.backward()


        optimizer.step()


        total_loss += (
            loss.item()
            * batch_num.size(0)
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


    epoch_loss = (
        total_loss / total
    )


    epoch_accuracy = (
        correct / total
    )


    print(
        f"Epoch [{epoch + 1}/{EPOCHS}] "
        f"Loss: {epoch_loss:.4f} "
        f"Accuracy: {epoch_accuracy:.4f}"
    )


# ============================================================
# EVALUATION
# ============================================================

print("\nEvaluating Transformer V2...")

model.eval()


all_probabilities = []

all_labels = []


with torch.no_grad():

    for (
        batch_num,
        batch_bat,
        batch_bowl,
        batch_venue,
        batch_y
    ) in test_loader:


        batch_num = batch_num.to(
            DEVICE
        )

        batch_bat = batch_bat.to(
            DEVICE
        )

        batch_bowl = batch_bowl.to(
            DEVICE
        )

        batch_venue = batch_venue.to(
            DEVICE
        )


        logits = model(
            batch_num,
            batch_bat,
            batch_bowl,
            batch_venue
        )


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

print("TRANSFORMER V2 RESULTS")

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
        "model_state_dict":
            model.state_dict(),

        "numerical_features":
            NUMERICAL_FEATURES,

        "sequence_length":
            SEQUENCE_LENGTH,

        "team_to_id":
            team_to_id,

        "venue_to_id":
            venue_to_id,

        "mean":
            mean,

        "std":
            std,

        "embed_dim":
            EMBED_DIM,

        "num_heads":
            NUM_HEADS,

        "num_layers":
            NUM_LAYERS
    },
    MODEL_PATH
)


print(
    "\nTransformer V2 model "
    "saved successfully."
)

print("Model path:")

print(MODEL_PATH)