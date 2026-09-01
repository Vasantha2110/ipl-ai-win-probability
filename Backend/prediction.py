import os
from pathlib import Path

import numpy as np
import pandas as pd

import torch
import torch.nn as nn

from flask import Flask, request, jsonify
from flask_cors import CORS


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "match_states.csv"
)

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "transformer_win_probability.pth"
)


# ============================================================
# SETTINGS
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


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
        dropout=0.1
    ):

        super().__init__()

        self.input_projection = nn.Linear(
            input_dim,
            embed_dim
        )

        self.position_embedding = nn.Parameter(
            torch.zeros(
                1,
                sequence_length,
                embed_dim
            )
        )

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

        x = self.input_projection(x)

        x = x + self.position_embedding

        x = self.transformer(x)

        # Use the last time step
        x = x[:, -1, :]

        x = self.classifier(x)

        return x.squeeze(1)


# ============================================================
# LOAD MODEL
# ============================================================

print("=" * 60)
print("IPL WIN PROBABILITY PREDICTION API")
print("=" * 60)

print("\nUsing device:", DEVICE)

print("\nModel path:", MODEL_PATH)


if not MODEL_PATH.exists():

    raise FileNotFoundError(
        f"Model file not found: {MODEL_PATH}"
    )


print("\nLoading Transformer model...")


checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=False
)


# ============================================================
# LOAD TRAINING SETTINGS
# ============================================================

MODEL_FEATURES = checkpoint.get(
    "features",
    FEATURES
)

SEQUENCE_LENGTH = checkpoint.get(
    "sequence_length",
    12
)

MEAN = np.asarray(
    checkpoint["mean"],
    dtype=np.float32
)

STD = np.asarray(
    checkpoint["std"],
    dtype=np.float32
)

EMBED_DIM = checkpoint.get(
    "embed_dim",
    64
)

NUM_HEADS = checkpoint.get(
    "num_heads",
    4
)

NUM_LAYERS = checkpoint.get(
    "num_layers",
    2
)


# ============================================================
# CREATE MODEL
# ============================================================

model = CricketTransformer(
    input_dim=len(MODEL_FEATURES),
    sequence_length=SEQUENCE_LENGTH,
    embed_dim=EMBED_DIM,
    num_heads=NUM_HEADS,
    num_layers=NUM_LAYERS,
    dropout=0.1
).to(DEVICE)


# ============================================================
# LOAD MODEL WEIGHTS
# ============================================================

model.load_state_dict(
    checkpoint["model_state_dict"]
)

model.eval()


print("\nModel loaded successfully.")

print(
    "Sequence length:",
    SEQUENCE_LENGTH
)

print(
    "Number of features:",
    len(MODEL_FEATURES)
)


# ============================================================
# PREDICTION FUNCTION
# ============================================================

def predict_from_sequence(sequence):

    """
    Predict batting-team win probability.

    Input:
        sequence = 12 x 15 numerical feature values

    Output:
        probability between 0 and 1
    """

    # Convert input to NumPy
    sequence = np.asarray(
        sequence,
        dtype=np.float32
    )


    # --------------------------------------------------------
    # Validate shape
    # --------------------------------------------------------

    expected_shape = (
        SEQUENCE_LENGTH,
        len(MODEL_FEATURES)
    )

    if sequence.shape != expected_shape:

        raise ValueError(
            f"Expected sequence shape "
            f"{expected_shape}, "
            f"but received {sequence.shape}"
        )


    # --------------------------------------------------------
    # Validate numeric values
    # --------------------------------------------------------

    if not np.all(np.isfinite(sequence)):

        raise ValueError(
            "Sequence contains invalid numerical values."
        )


    # --------------------------------------------------------
    # Prevent division by zero
    # --------------------------------------------------------

    safe_std = np.where(
        STD == 0,
        1.0,
        STD
    )


    # --------------------------------------------------------
    # Normalize using training statistics
    # --------------------------------------------------------

    sequence = (
        sequence - MEAN
    ) / safe_std


    # --------------------------------------------------------
    # Convert to tensor
    # --------------------------------------------------------

    tensor = torch.tensor(
        sequence,
        dtype=torch.float32
    ).unsqueeze(0)


    tensor = tensor.to(DEVICE)


    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    with torch.no_grad():

        logits = model(tensor)

        probability = torch.sigmoid(
            logits
        ).item()


    return probability


# ============================================================
# FLASK APPLICATION
# ============================================================

app = Flask(__name__)

# Allow Lovable/frontend to communicate with this API
CORS(app)


# ============================================================
# HOME / HEALTH CHECK
# ============================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "status": "success",
        "message": "IPL AI Win Probability API is running",
        "model": "Transformer",
        "sequence_length": SEQUENCE_LENGTH,
        "features": len(MODEL_FEATURES)
    })


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "healthy"
    })


# ============================================================
# PREDICTION API
# ============================================================

@app.route("/predict", methods=["POST"])
def predict():

    try:

        # ----------------------------------------------------
        # Read JSON
        # ----------------------------------------------------

        data = request.get_json(
            silent=True
        )


        if data is None:

            return jsonify({
                "status": "error",
                "error": "Request must contain JSON data."
            }), 400


        # ----------------------------------------------------
        # Get sequence
        # ----------------------------------------------------

        sequence = data.get(
            "sequence"
        )


        if sequence is None:

            return jsonify({
                "status": "error",
                "error": "Missing 'sequence' field."
            }), 400


        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        probability = predict_from_sequence(
            sequence
        )


        # ----------------------------------------------------
        # Convert to percentage
        # ----------------------------------------------------

        batting_probability = (
            probability * 100
        )

        bowling_probability = (
            100 - batting_probability
        )


        # ----------------------------------------------------
        # Final prediction
        # ----------------------------------------------------

        if batting_probability >= 50:

            prediction = (
                "Batting team is more likely to win."
            )

        else:

            prediction = (
                "Bowling team is more likely to win."
            )


        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return jsonify({

            "status": "success",

            "batting_team_win_probability": round(
                batting_probability,
                2
            ),

            "bowling_team_win_probability": round(
                bowling_probability,
                2
            ),

            "prediction": prediction
        })


    except Exception as e:

        print(
            "Prediction error:",
            str(e)
        )

        return jsonify({

            "status": "error",

            "error": str(e)

        }), 400


# ============================================================
# LOCAL TESTING
# ============================================================

def create_sample_sequence():

    """
    Creates a sample 12-ball sequence
    from the processed IPL dataset.

    Used only for local testing.
    """

    print("\nLoading dataset...")

    if not DATA_PATH.exists():

        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}"
        )


    df = pd.read_csv(
        DATA_PATH
    )


    print(
        "Dataset shape:",
        df.shape
    )


    # Sort by match and ball

    df = df.sort_values(
        by=[
            "match_id",
            "legal_balls"
        ]
    ).reset_index(
        drop=True
    )


    # Find a match having enough balls

    for match_id, match_df in df.groupby(
        "match_id"
    ):

        if len(match_df) >= SEQUENCE_LENGTH:

            sequence = match_df[
                MODEL_FEATURES
            ].iloc[
                :SEQUENCE_LENGTH
            ].values

            return sequence


    raise ValueError(
        "No match with enough data found."
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print("\nRunning local model test...")

    try:

        sequence = create_sample_sequence()


        print(
            "\nSequence shape:",
            sequence.shape
        )


        probability = predict_from_sequence(
            sequence
        )


        batting_probability = (
            probability * 100
        )

        bowling_probability = (
            100 - batting_probability
        )


        if batting_probability >= 50:

            prediction = (
                "Batting team is more likely to win."
            )

        else:

            prediction = (
                "Bowling team is more likely to win."
            )


        print("\n" + "=" * 60)

        print("PREDICTION RESULT")

        print("=" * 60)

        print(
            f"\nBatting Team Win Probability : "
            f"{batting_probability:.2f}%"
        )

        print(
            f"Bowling Team Win Probability : "
            f"{bowling_probability:.2f}%"
        )

        print(
            f"\nPrediction: {prediction}"
        )

        print("\n" + "=" * 60)


    except Exception as e:

        print(
            "\nLocal test failed:",
            str(e)
        )