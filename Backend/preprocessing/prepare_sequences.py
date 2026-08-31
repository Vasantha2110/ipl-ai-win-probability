import os
import numpy as np
import pandas as pd
from pathlib import Path


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_FILE = BASE_DIR / "data" / "processed" / "match_states.csv"

OUTPUT_DIR = BASE_DIR / "data" / "processed"

X_OUTPUT = OUTPUT_DIR / "transformer_X.npy"
Y_OUTPUT = OUTPUT_DIR / "transformer_y.npy"


# ============================================================
# SETTINGS
# ============================================================

# Number of previous balls used by the Transformer
SEQUENCE_LENGTH = 12


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
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("TRANSFORMER SEQUENCE PREPARATION")
    print("=" * 60)


    # --------------------------------------------------------
    # Check input file
    # --------------------------------------------------------

    if not INPUT_FILE.exists():

        print("\nERROR: Dataset not found:")
        print(INPUT_FILE)

        return


    # --------------------------------------------------------
    # Load dataset
    # --------------------------------------------------------

    print("\nLoading dataset...")

    df = pd.read_csv(INPUT_FILE)

    print("Dataset shape:", df.shape)


    # --------------------------------------------------------
    # Check required columns
    # --------------------------------------------------------

    required_columns = (
        ["match_id", "date", "legal_balls", "target_label"]
        + FEATURES
    )

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:

        print("\nERROR: Missing columns:")

        for column in missing_columns:
            print(" -", column)

        return


    # --------------------------------------------------------
    # Sort data
    # --------------------------------------------------------

    print("\nSorting matches and deliveries...")

    df = df.sort_values(
        by=["match_id", "legal_balls"]
    ).reset_index(drop=True)


    # --------------------------------------------------------
    # Remove invalid rows
    # --------------------------------------------------------

    df = df.dropna(
        subset=FEATURES + ["target_label"]
    ).reset_index(drop=True)


    # --------------------------------------------------------
    # Match statistics
    # --------------------------------------------------------

    print("\nNumber of matches:", df["match_id"].nunique())

    print("Number of rows:", len(df))


    # --------------------------------------------------------
    # Create sequences
    # --------------------------------------------------------

    print("\nCreating sequences...")

    X_sequences = []
    y_sequences = []

    total_matches = df["match_id"].nunique()

    processed_matches = 0


    # Process one match at a time
    for match_id, match_df in df.groupby(
        "match_id",
        sort=False
    ):

        match_df = match_df.sort_values(
            "legal_balls"
        ).reset_index(drop=True)


        # Need at least SEQUENCE_LENGTH balls
        if len(match_df) < SEQUENCE_LENGTH:
            continue


        feature_values = match_df[FEATURES].values.astype(
            np.float32
        )

        labels = match_df["target_label"].values.astype(
            np.float32
        )


        # ----------------------------------------------------
        # Sliding window
        # ----------------------------------------------------

        for i in range(
            SEQUENCE_LENGTH,
            len(match_df) + 1
        ):

            sequence = feature_values[
                i - SEQUENCE_LENGTH:i
            ]

            label = labels[i - 1]


            X_sequences.append(sequence)

            y_sequences.append(label)


        processed_matches += 1


        if (
            processed_matches % 100 == 0
            or processed_matches == total_matches
        ):

            print(
                f"Processed {processed_matches}/"
                f"{total_matches} matches..."
            )


    # --------------------------------------------------------
    # Convert to NumPy arrays
    # --------------------------------------------------------

    X_sequences = np.array(
        X_sequences,
        dtype=np.float32
    )

    y_sequences = np.array(
        y_sequences,
        dtype=np.float32
    )


    # --------------------------------------------------------
    # Check generated data
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("SEQUENCE DATA CREATED")
    print("=" * 60)

    print("\nX shape:", X_sequences.shape)

    print("y shape:", y_sequences.shape)


    if len(X_sequences) == 0:

        print(
            "\nERROR: No sequences were created."
        )

        return


    # --------------------------------------------------------
    # Save sequences
    # --------------------------------------------------------

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )


    np.save(
        X_OUTPUT,
        X_sequences
    )

    np.save(
        Y_OUTPUT,
        y_sequences
    )


    # --------------------------------------------------------
    # Final information
    # --------------------------------------------------------

    print("\nFiles saved successfully.")

    print("\nX file:")
    print(X_OUTPUT)

    print("\ny file:")
    print(Y_OUTPUT)


    print("\nSequence length:")
    print(SEQUENCE_LENGTH)

    print("\nNumber of features per ball:")
    print(len(FEATURES))

    print("\nFinal X shape:")
    print(
        f"({X_sequences.shape[0]}, "
        f"{X_sequences.shape[1]}, "
        f"{X_sequences.shape[2]})"
    )

    print("\nTarget distribution:")

    unique, counts = np.unique(
        y_sequences,
        return_counts=True
    )

    for value, count in zip(unique, counts):

        print(
            f"  {int(value)} : {count:,}"
        )


if __name__ == "__main__":
    main()