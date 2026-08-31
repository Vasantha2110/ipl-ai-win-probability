from flask import Flask, request, jsonify
from flask_cors import CORS

import sys
from pathlib import Path


# ============================================================
# PATH SETUP
# ============================================================

# app.py is inside:
# Backend/api/app.py
#
# parent.parent = Backend/

BASE_DIR = Path(__file__).resolve().parent.parent

# Add Backend folder to Python path
sys.path.insert(0, str(BASE_DIR))


# Import prediction function from:
# Backend/prediction.py

from prediction import predict_from_sequence


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)

CORS(app)


# ============================================================
# SETTINGS
# ============================================================

SEQUENCE_LENGTH = 12

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
# HOME ROUTE
# ============================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({

        "status": "success",

        "message":
            "IPL AI Win Probability API is running",

        "model":
            "Transformer V1",

        "sequence_length":
            SEQUENCE_LENGTH,

        "number_of_features":
            len(FEATURES),

        "endpoint":
            "/predict"

    })


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({

        "status": "healthy",

        "model":
            "Transformer V1",

        "sequence_length":
            SEQUENCE_LENGTH,

        "number_of_features":
            len(FEATURES)

    })


# ============================================================
# PREDICTION ROUTE
# ============================================================

@app.route("/predict", methods=["POST"])
def predict():

    try:

        # ----------------------------------------------------
        # Get JSON request
        # ----------------------------------------------------

        data = request.get_json()

        if data is None:

            return jsonify({

                "status": "error",

                "message":
                    "Request must contain JSON data"

            }), 400


        # ----------------------------------------------------
        # Check sequence
        # ----------------------------------------------------

        if "sequence" not in data:

            return jsonify({

                "status": "error",

                "message":
                    "Missing 'sequence' field",

                "required":
                    f"Exactly {SEQUENCE_LENGTH} "
                    f"ball states are required"

            }), 400


        sequence = data["sequence"]


        # ----------------------------------------------------
        # Check sequence type
        # ----------------------------------------------------

        if not isinstance(sequence, list):

            return jsonify({

                "status": "error",

                "message":
                    "'sequence' must be a list"

            }), 400


        # ----------------------------------------------------
        # Check sequence length
        # ----------------------------------------------------

        if len(sequence) != SEQUENCE_LENGTH:

            return jsonify({

                "status": "error",

                "message":
                    f"Sequence must contain exactly "
                    f"{SEQUENCE_LENGTH} states",

                "received":
                    len(sequence),

                "expected":
                    SEQUENCE_LENGTH

            }), 400


        # ----------------------------------------------------
        # Convert sequence
        # ----------------------------------------------------

        converted_sequence = []


        for index, state in enumerate(sequence):

            # ----------------------------------------------
            # Every state must be a dictionary
            # ----------------------------------------------

            if not isinstance(state, dict):

                return jsonify({

                    "status": "error",

                    "message":
                        f"State {index + 1} must be "
                        f"a JSON object"

                }), 400


            # ----------------------------------------------
            # Check missing features
            # ----------------------------------------------

            missing_features = [

                feature

                for feature in FEATURES

                if feature not in state

            ]


            if missing_features:

                return jsonify({

                    "status": "error",

                    "message":
                        f"Missing features in "
                        f"state {index + 1}",

                    "missing_features":
                        missing_features

                }), 400


            # ----------------------------------------------
            # Convert all feature values to float
            # ----------------------------------------------

            row = []


            for feature in FEATURES:

                try:

                    value = float(
                        state[feature]
                    )

                except (ValueError, TypeError):

                    return jsonify({

                        "status": "error",

                        "message":
                            f"Invalid value for "
                            f"'{feature}' in "
                            f"state {index + 1}"

                    }), 400


                row.append(value)


            converted_sequence.append(row)


        # ----------------------------------------------------
        # Basic validation
        # ----------------------------------------------------

        for index, state in enumerate(
            sequence
        ):

            wickets_lost = float(
                state["wickets_lost"]
            )

            balls_remaining = float(
                state["balls_remaining"]
            )

            score = float(
                state["score"]
            )

            target = float(
                state["target"]
            )


            # ----------------------------------------------
            # Wickets
            # ----------------------------------------------

            if wickets_lost < 0 or wickets_lost > 10:

                return jsonify({

                    "status": "error",

                    "message":
                        f"wickets_lost in state "
                        f"{index + 1} must be "
                        f"between 0 and 10"

                }), 400


            # ----------------------------------------------
            # Balls remaining
            # ----------------------------------------------

            if balls_remaining < 0 or balls_remaining > 120:

                return jsonify({

                    "status": "error",

                    "message":
                        f"balls_remaining in state "
                        f"{index + 1} must be "
                        f"between 0 and 120"

                }), 400


            # ----------------------------------------------
            # Score
            # ----------------------------------------------

            if score < 0:

                return jsonify({

                    "status": "error",

                    "message":
                        f"score in state "
                        f"{index + 1} cannot be negative"

                }), 400


            # ----------------------------------------------
            # Target
            # ----------------------------------------------

            if target <= 0:

                return jsonify({

                    "status": "error",

                    "message":
                        f"target in state "
                        f"{index + 1} must be greater than 0"

                }), 400


        # ====================================================
        # CALL TRANSFORMER
        # ====================================================

        probability = predict_from_sequence(
            converted_sequence
        )


        # ====================================================
        # CONVERT TO PERCENTAGE
        # ====================================================

        batting_probability = (
            probability * 100
        )

        bowling_probability = (
            100 - batting_probability
        )


        # ====================================================
        # DETERMINE WINNER
        # ====================================================

        if batting_probability >= 50:

            prediction = (
                "Batting team is more likely to win"
            )

        else:

            prediction = (
                "Bowling team is more likely to win"
            )


        # ====================================================
        # API RESPONSE
        # ====================================================

        return jsonify({

            "status":
                "success",

            "batting_team_win_probability":
                round(
                    batting_probability,
                    2
                ),

            "bowling_team_win_probability":
                round(
                    bowling_probability,
                    2
                ),

            "prediction":
                prediction,

            "sequence_length":
                SEQUENCE_LENGTH,

            "number_of_features":
                len(FEATURES)

        })


    # ========================================================
    # ERROR HANDLING
    # ========================================================

    except Exception as e:

        return jsonify({

            "status":
                "error",

            "message":
                str(e)

        }), 500


# ============================================================
# RUN FLASK SERVER
# ============================================================

if __name__ == "__main__":

    print("=" * 60)

    print(
        "IPL AI WIN PROBABILITY API"
    )

    print("=" * 60)

    print(
        "\nStarting Flask server..."
    )

    print(
        "\nAPI URL:"
    )

    print(
        "http://127.0.0.1:5000"
    )

    print(
        "\nHealth endpoint:"
    )

    print(
        "GET http://127.0.0.1:5000/health"
    )

    print(
        "\nPrediction endpoint:"
    )

    print(
        "POST http://127.0.0.1:5000/predict"
    )

    print(
        "\nExpected input:"
    )

    print(
        "12 ball states × 15 numerical features"
    )

    print(
        "\n" + "=" * 60
    )


    app.run(

        host="127.0.0.1",

        port=5000,

        debug=True

    )