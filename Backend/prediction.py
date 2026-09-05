import numpy as np
import pandas as pd
from pathlib import Path
import os
import requests

import torch
import torch.nn as nn

from flask import Flask, request, jsonify
from flask_cors import CORS


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_PATH = BASE_DIR / "data" / "processed" / "match_states.csv"
MODEL_PATH = BASE_DIR / "models" / "transformer_win_probability.pth"


# ============================================================
# SETTINGS
# ============================================================

SEQUENCE_LENGTH = 12

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
# LOAD DATASET
# ============================================================

print("\nLoading dataset...")

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)

# Keep original dataset order.
# This is important because legal_balls can repeat
# when an over contains illegal deliveries.
df["_row_order"] = np.arange(len(df))


# ============================================================
# TRANSFORMER MODEL
# EXACT ARCHITECTURE USED DURING TRAINING
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

        # ----------------------------------------------------
        # Input projection
        # 15 features -> 64-dimensional embedding
        # ----------------------------------------------------

        self.input_projection = nn.Linear(
            input_dim,
            embed_dim
        )


        # ----------------------------------------------------
        # Learnable positional embedding
        # ----------------------------------------------------

        self.position_embedding = nn.Parameter(
            torch.zeros(
                1,
                sequence_length,
                embed_dim
            )
        )


        # ----------------------------------------------------
        # Transformer encoder layer
        # ----------------------------------------------------

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=num_heads,
            dim_feedforward=128,
            dropout=dropout,
            batch_first=True,
            activation="gelu"
        )


        # ----------------------------------------------------
        # Transformer encoder
        # ----------------------------------------------------

        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_layers
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


    def forward(self, x):

        # Input projection
        x = self.input_projection(x)

        # Add positional information
        x = x + self.position_embedding

        # Transformer encoder
        x = self.transformer(x)

        # Use final timestep
        x = x[:, -1, :]

        # Classification
        x = self.classifier(x)

        return x.squeeze(1)


# ============================================================
# LOAD MODEL CHECKPOINT
# ============================================================

print("\nLoading Transformer model...")

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=False
)


# ============================================================
# READ CONFIGURATION FROM CHECKPOINT
# ============================================================

checkpoint_features = checkpoint.get(
    "features",
    FEATURES
)

checkpoint_sequence_length = checkpoint.get(
    "sequence_length",
    SEQUENCE_LENGTH
)

checkpoint_embed_dim = checkpoint.get(
    "embed_dim",
    EMBED_DIM
)

checkpoint_num_heads = checkpoint.get(
    "num_heads",
    NUM_HEADS
)

checkpoint_num_layers = checkpoint.get(
    "num_layers",
    NUM_LAYERS
)


# ============================================================
# CREATE EXACT TRAINED ARCHITECTURE
# ============================================================

model = CricketTransformer(

    input_dim=len(
        checkpoint_features
    ),

    sequence_length=checkpoint_sequence_length,

    embed_dim=checkpoint_embed_dim,

    num_heads=checkpoint_num_heads,

    num_layers=checkpoint_num_layers,

    dropout=DROPOUT

).to(DEVICE)


# ============================================================
# LOAD TRAINED WEIGHTS
# ============================================================

model.load_state_dict(
    checkpoint["model_state_dict"]
)

model.eval()


# ============================================================
# MODEL INFORMATION
# ============================================================

print("\nModel loaded successfully.")

print(
    "Sequence length:",
    checkpoint_sequence_length
)

print(
    "Number of features:",
    len(checkpoint_features)
)

print(
    "Embedding dimension:",
    checkpoint_embed_dim
)

print(
    "Attention heads:",
    checkpoint_num_heads
)

print(
    "Transformer layers:",
    checkpoint_num_layers
)


# ============================================================
# NORMALIZATION VALUES
# ============================================================

MODEL_MEAN = np.array(
    checkpoint["mean"],
    dtype=np.float32
)

MODEL_STD = np.array(
    checkpoint["std"],
    dtype=np.float32
)

# Prevent division by zero
MODEL_STD[MODEL_STD == 0] = 1


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)

# Enable CORS so the deployed frontend can communicate
# with the deployed Flask backend.
CORS(app)
CRICKET_API_KEY = os.getenv("CRICKET_API_KEY")
CRICKET_API_BASE = "https://api.cricapi.com/v1"


# ============================================================
# ROOT
# ============================================================

@app.route(
    "/",
    methods=["GET"]
)
def home():

    return jsonify({

        "status": "success",

        "message":
            "IPL AI Win Probability API is running.",

        "model":
            "Transformer",

        "sequence_length":
            checkpoint_sequence_length,

        "features":
            len(checkpoint_features)

    })


# ============================================================
# PREDICT FROM SEQUENCE
# ============================================================

def predict_from_sequence(sequence):

    # Convert to NumPy array
    sequence = np.array(
        sequence,
        dtype=np.float32
    )


    # --------------------------------------------------------
    # Expected shape
    # --------------------------------------------------------

    expected_shape = (
        checkpoint_sequence_length,
        len(checkpoint_features)
    )


    if sequence.shape != expected_shape:

        raise ValueError(

            f"Expected sequence shape "
            f"{expected_shape}, "

            f"but received "
            f"{sequence.shape}"

        )


    # --------------------------------------------------------
    # Normalize using training statistics
    # --------------------------------------------------------

    sequence = (
        sequence - MODEL_MEAN
    ) / MODEL_STD


    # --------------------------------------------------------
    # Convert to PyTorch tensor
    # --------------------------------------------------------

    tensor = torch.tensor(
        sequence,
        dtype=torch.float32
    ).unsqueeze(0).to(DEVICE)


    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    with torch.no_grad():

        logit = model(
            tensor
        )

        batting_probability = torch.sigmoid(
            logit
        ).item()


    # Bowling probability
    bowling_probability = (
        1 - batting_probability
    )


    return (
        batting_probability,
        bowling_probability
    )


# ============================================================
# /predict
# MANUAL SEQUENCE PREDICTION
# ============================================================

@app.route(
    "/predict",
    methods=["POST"]
)
def predict():

    try:

        data = request.get_json()


        # ----------------------------------------------------
        # Check JSON
        # ----------------------------------------------------

        if data is None:

            return jsonify({

                "status": "error",

                "error":
                    "No JSON data received."

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

                "error":
                    "Missing 'sequence'."

            }), 400


        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        (
            batting_probability,
            bowling_probability
        ) = predict_from_sequence(
            sequence
        )


        # ----------------------------------------------------
        # Prediction label
        # ----------------------------------------------------

        if batting_probability >= 0.5:

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

            "status":
                "success",

            "batting_team_win_probability":
                round(
                    batting_probability * 100,
                    2
                ),

            "bowling_team_win_probability":
                round(
                    bowling_probability * 100,
                    2
                ),

            "prediction":
                prediction

        })


    except Exception as e:

        return jsonify({

            "status":
                "error",

            "error":
                str(e)

        }), 400


# ============================================================
# GET MATCH LIST
# ============================================================

@app.route(
    "/matches",
    methods=["GET"]
)
def get_matches():

    try:

        matches = []


        # ----------------------------------------------------
        # Group dataset by match
        # ----------------------------------------------------

        grouped = df.groupby(
            "match_id",
            sort=False
        )


        for match_id, match_df in grouped:

            first_row = match_df.iloc[0]


            matches.append({

                "match_id":
                    int(match_id),

                "date":
                    str(
                        first_row["date"]
                    ),

                "venue":
                    str(
                        first_row["venue"]
                    ),

                "batting_team":
                    str(
                        first_row["batting_team"]
                    ),

                "bowling_team":
                    str(
                        first_row["bowling_team"]
                    )

            })


        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return jsonify({

            "status":
                "success",

            "count":
                len(matches),

            "matches":
                matches

        })


    except Exception as e:

        return jsonify({

            "status":
                "error",

            "error":
                str(e)

        }), 500


# ============================================================
# GET MATCH STATES
# ============================================================

@app.route(
    "/match-states/<int:match_id>",
    methods=["GET"]
)
def get_match_states(match_id):

    try:

        # ----------------------------------------------------
        # Get selected match
        # ----------------------------------------------------

        match_df = df[
            df["match_id"] == match_id
        ].copy()


        if match_df.empty:

            return jsonify({

                "status":
                    "error",

                "error":
                    f"Match {match_id} not found."

            }), 404


        # ----------------------------------------------------
        # Sort according to original dataset order
        # ----------------------------------------------------

        match_df = match_df.sort_values(
            "_row_order"
        ).reset_index(
            drop=True
        )


        # ----------------------------------------------------
        # Remove duplicate legal-ball states
        # ----------------------------------------------------

        states = (
            match_df
            .drop_duplicates(
                subset=["legal_balls"],
                keep="last"
            )
        )


        result = []


        # ----------------------------------------------------
        # Create state objects
        # ----------------------------------------------------

        for _, row in states.iterrows():

            result.append({

                "legal_balls":
                    int(
                        row["legal_balls"]
                    ),

                "over":
                    float(
                        row["over"]
                    ),

                "score":
                    int(
                        row["score"]
                    ),

                "wickets_lost":
                    int(
                        row["wickets_lost"]
                    ),

                "wickets_remaining":
                    int(
                        row["wickets_remaining"]
                    ),

                "target":
                    int(
                        row["target"]
                    ),

                "runs_required":
                    int(
                        row["runs_required"]
                    ),

                "balls_remaining":
                    int(
                        row["balls_remaining"]
                    ),

                "current_run_rate":
                    float(
                        row["current_run_rate"]
                    ),

                "required_run_rate":
                    float(
                        row["required_run_rate"]
                    ),

                "batting_team":
                    str(
                        row["batting_team"]
                    ),

                "bowling_team":
                    str(
                        row["bowling_team"]
                    ),

                "venue":
                    str(
                        row["venue"]
                    ),

                "date":
                    str(
                        row["date"]
                    )

            })


        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return jsonify({

            "status":
                "success",

            "match_id":
                match_id,

            "count":
                len(result),

            "states":
                result

        })


    except Exception as e:

        return jsonify({

            "status":
                "error",

            "error":
                str(e)

        }), 500


# ============================================================
# CREATE REAL SEQUENCE
# ============================================================

def get_real_sequence(
    match_id,
    legal_ball
):

    # --------------------------------------------------------
    # Get selected match
    # --------------------------------------------------------

    match_df = df[
        df["match_id"] == match_id
    ].copy()


    if match_df.empty:

        raise ValueError(
            f"Match {match_id} was not found."
        )


    # --------------------------------------------------------
    # Preserve original training order
    # --------------------------------------------------------

    match_df = match_df.sort_values(
        "_row_order"
    ).reset_index(
        drop=True
    )


    # --------------------------------------------------------
    # Get rows up to requested legal ball
    # --------------------------------------------------------

    eligible = match_df[
        match_df["legal_balls"] <= legal_ball
    ].copy()


    if eligible.empty:

        raise ValueError(

            f"Legal ball {legal_ball} "
            f"was not found for match "
            f"{match_id}."

        )


    # --------------------------------------------------------
    # Keep latest state for each legal ball
    # --------------------------------------------------------

    eligible = (
        eligible
        .drop_duplicates(
            subset=["legal_balls"],
            keep="last"
        )
    )


    # --------------------------------------------------------
    # Check if enough states exist
    # --------------------------------------------------------

    if len(eligible) < checkpoint_sequence_length:

        raise ValueError(

            f"Not enough data to create a "
            f"{checkpoint_sequence_length}-ball "
            f"sequence. "

            f"Only {len(eligible)} states "
            f"are available."

        )


    # --------------------------------------------------------
    # Last 12 states
    # --------------------------------------------------------

    sequence_df = eligible.tail(
        checkpoint_sequence_length
    )


    # --------------------------------------------------------
    # Extract model features
    # --------------------------------------------------------

    sequence = sequence_df[
        checkpoint_features
    ].values.astype(
        np.float32
    )


    # --------------------------------------------------------
    # Latest state
    # --------------------------------------------------------

    latest_state = sequence_df.iloc[-1]


    return (
        sequence,
        latest_state
    )


# ============================================================
# /predict-real
# REAL MATCH PREDICTION
# ============================================================

@app.route(
    "/predict-real",
    methods=["POST"]
)
def predict_real():

    try:

        data = request.get_json()


        # ----------------------------------------------------
        # Check JSON
        # ----------------------------------------------------

        if data is None:

            return jsonify({

                "status":
                    "error",

                "error":
                    "No JSON data received."

            }), 400


        # ----------------------------------------------------
        # Check match_id
        # ----------------------------------------------------

        if "match_id" not in data:

            return jsonify({

                "status":
                    "error",

                "error":
                    "Missing 'match_id'."

            }), 400


        # ----------------------------------------------------
        # Check legal_balls
        # ----------------------------------------------------

        if "legal_balls" not in data:

            return jsonify({

                "status":
                    "error",

                "error":
                    "Missing 'legal_balls'."

            }), 400


        # ----------------------------------------------------
        # Convert input values
        # ----------------------------------------------------

        match_id = int(
            data["match_id"]
        )

        legal_ball = int(
            data["legal_balls"]
        )


        # ----------------------------------------------------
        # Create real sequence
        # ----------------------------------------------------

        (
            sequence,
            state
        ) = get_real_sequence(

            match_id,
            legal_ball

        )


        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        (
            batting_probability,
            bowling_probability
        ) = predict_from_sequence(
            sequence
        )


        # ----------------------------------------------------
        # Prediction label
        # ----------------------------------------------------

        if batting_probability >= 0.5:

            prediction = "batting"

        else:

            prediction = "bowling"


        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return jsonify({

            "status":
                "success",

            "match_id":
                match_id,

            "legal_balls":
                int(
                    state["legal_balls"]
                ),

            "over":
                float(
                    state["over"]
                ),

            "date":
                str(
                    state["date"]
                ),

            "venue":
                str(
                    state["venue"]
                ),

            "batting_team":
                str(
                    state["batting_team"]
                ),

            "bowling_team":
                str(
                    state["bowling_team"]
                ),

            "score":
                int(
                    state["score"]
                ),

            "wickets_lost":
                int(
                    state["wickets_lost"]
                ),

            "wickets_remaining":
                int(
                    state["wickets_remaining"]
                ),

            "target":
                int(
                    state["target"]
                ),

            "runs_required":
                int(
                    state["runs_required"]
                ),

            "balls_remaining":
                int(
                    state["balls_remaining"]
                ),

            "current_run_rate":
                float(
                    state["current_run_rate"]
                ),

            "required_run_rate":
                float(
                    state["required_run_rate"]
                ),

            "batting_team_win_probability":
                round(
                    batting_probability * 100,
                    2
                ),

            "bowling_team_win_probability":
                round(
                    bowling_probability * 100,
                    2
                ),

            "prediction":
                prediction

        })


    except Exception as e:

        return jsonify({

            "status":
                "error",

            "error":
                str(e)

        }), 400


# ============================================================
# GET MATCH WIN PROBABILITY TREND
# ============================================================

@app.route(
    "/match-probabilities/<int:match_id>",
    methods=["GET"]
)
def get_match_probabilities(match_id):

    try:

        # ----------------------------------------------------
        # Get selected match
        # ----------------------------------------------------

        match_df = df[
            df["match_id"] == match_id
        ].copy()


        if match_df.empty:

            return jsonify({

                "status":
                    "error",

                "error":
                    f"Match {match_id} not found."

            }), 404


        # ----------------------------------------------------
        # Preserve original dataset order
        # ----------------------------------------------------

        match_df = match_df.sort_values(
            "_row_order"
        ).reset_index(
            drop=True
        )


        # ----------------------------------------------------
        # Remove duplicate legal-ball states
        # ----------------------------------------------------

        states = (
            match_df
            .drop_duplicates(
                subset=["legal_balls"],
                keep="last"
            )
        )


        probabilities = []


        # ----------------------------------------------------
        # Calculate probability for every valid ball
        # ----------------------------------------------------

        for _, row in states.iterrows():

            legal_ball = int(
                row["legal_balls"]
            )


            # ------------------------------------------------
            # Transformer needs 12 states
            # ------------------------------------------------

            if legal_ball < checkpoint_sequence_length:

                continue


            try:

                # --------------------------------------------
                # Create real sequence
                # --------------------------------------------

                (
                    sequence,
                    state
                ) = get_real_sequence(

                    match_id,
                    legal_ball

                )


                # --------------------------------------------
                # Get Transformer prediction
                # --------------------------------------------

                (
                    batting_probability,
                    bowling_probability
                ) = predict_from_sequence(
                    sequence
                )


                # --------------------------------------------
                # Store result
                # --------------------------------------------

                probabilities.append({

                    "legal_balls":
                        legal_ball,

                    "over":
                        float(
                            state["over"]
                        ),

                    "score":
                        int(
                            state["score"]
                        ),

                    "wickets_lost":
                        int(
                            state["wickets_lost"]
                        ),

                    "batting_team":
                        str(
                            state["batting_team"]
                        ),

                    "bowling_team":
                        str(
                            state["bowling_team"]
                        ),

                    "batting_team_win_probability":
                        round(
                            batting_probability * 100,
                            2
                        ),

                    "bowling_team_win_probability":
                        round(
                            bowling_probability * 100,
                            2
                        )

                })


            except Exception as prediction_error:

                # ------------------------------------------------
                # If one state fails, continue with next state
                # ------------------------------------------------

                print(

                    f"Skipping ball "
                    f"{legal_ball}: "
                    f"{prediction_error}"

                )

                continue


        # ----------------------------------------------------
        # Return all predictions
        # ----------------------------------------------------

        return jsonify({

            "status":
                "success",

            "match_id":
                match_id,

            "count":
                len(probabilities),

            "probabilities":
                probabilities

        })


    except Exception as e:

        return jsonify({

            "status":
                "error",

            "error":
                str(e)

        }), 500
# ============================================================
# LIVE CRICKET DATA
# ============================================================

@app.route("/live-matches", methods=["GET"])
def get_live_matches():

    try:

        if not CRICKET_API_KEY:
            return jsonify({
                "status": "error",
                "error": "CRICKET_API_KEY is not configured."
            }), 500

        response = requests.get(
            f"{CRICKET_API_BASE}/currentMatches",
            params={
                "apikey": CRICKET_API_KEY,
                "offset": 0
            },
            timeout=20
        )

        response.raise_for_status()

        data = response.json()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    print(
        "\n======================================"
    )

    print(
        "IPL AI WIN PROBABILITY API"
    )

    print(
        "======================================"
    )


    print(
        "Model:",
        MODEL_PATH
    )


    print(
        "Dataset:",
        DATA_PATH
    )


    print(
        "Sequence length:",
        checkpoint_sequence_length
    )


    print(
        "Features:",
        len(checkpoint_features)
    )


    print(
        "\nStarting Flask server..."
    )


    app.run(

        host="0.0.0.0",

        port=5000,

        debug=True

    )