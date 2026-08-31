import json
import os
from pathlib import Path

import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

RAW_DATA_DIR = BASE_DIR / "data" / "raw" / "ipl_json"
OUTPUT_FILE = BASE_DIR / "data" / "processed" / "match_states.csv"


# ============================================================
# SETTINGS
# ============================================================

RECENT_BALLS = 12


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_total_balls(overs):
    """Return number of legal deliveries in an innings."""

    total = 0

    for over in overs:
        for delivery in over.get("deliveries", []):
            extras = delivery.get("extras", {})

            # Wides and no-balls are not legal deliveries.
            if "wides" not in extras and "noballs" not in extras:
                total += 1

    return total


def get_wicket_count(delivery):
    """Count wickets from a delivery."""

    wickets = delivery.get("wickets", [])

    return len(wickets)


def get_recent_stats(deliveries):
    """
    Calculate statistics from the most recent deliveries.
    """

    recent = deliveries[-RECENT_BALLS:]

    runs = 0
    wickets = 0

    for delivery in recent:
        runs += delivery.get("runs", {}).get("total", 0)
        wickets += get_wicket_count(delivery)

    return runs, wickets


def process_match(json_file):
    """
    Process one Cricsheet JSON match.

    Returns a list of ball-by-ball match-state rows.
    """

    with open(json_file, "r", encoding="utf-8") as f:
        match = json.load(f)

    info = match.get("info", {})

    # --------------------------------------------------------
    # Basic match information
    # --------------------------------------------------------

    teams = info.get("teams", [])

    if len(teams) < 2:
        return []

    outcome = info.get("outcome", {})

    winner = outcome.get("winner")

    # Skip matches without a winner
    # (ties, no results, abandoned matches, etc.)
    if not winner:
        return []

    venue = info.get("venue", "Unknown")

    dates = info.get("dates", [])

    if isinstance(dates, list) and len(dates) > 0:
        match_date = str(dates[0])
    else:
        match_date = ""

    rows = []

    innings_list = match.get("innings", [])

    # --------------------------------------------------------
    # We need the first two normal innings.
    # The second innings is the chasing innings.
    # --------------------------------------------------------

    normal_innings = []

    for innings in innings_list:

        # Different Cricsheet versions may represent innings
        # slightly differently.
        if isinstance(innings, dict) and "team" in innings:
            normal_innings.append(innings)

    if len(normal_innings) < 2:
        return []

    first_innings = normal_innings[0]
    second_innings = normal_innings[1]

    batting_team = second_innings.get("team")

    if not batting_team:
        return []

    # The other team is bowling in the second innings.
    bowling_team = None

    for team in teams:
        if team != batting_team:
            bowling_team = team
            break

    if not bowling_team:
        return []

    # --------------------------------------------------------
    # Calculate target from first innings
    # --------------------------------------------------------

    first_innings_runs = 0

    for over in first_innings.get("overs", []):

        for delivery in over.get("deliveries", []):

            first_innings_runs += (
                delivery
                .get("runs", {})
                .get("total", 0)
            )

    target = first_innings_runs + 1

    # --------------------------------------------------------
    # Process second innings ball by ball
    # --------------------------------------------------------

    current_score = 0
    wickets_lost = 0

    legal_balls = 0

    all_previous_deliveries = []

    for over in second_innings.get("overs", []):

        over_number = over.get("over", 0)

        for delivery in over.get("deliveries", []):

            runs_data = delivery.get("runs", {})

            batter_runs = runs_data.get("batter", 0)
            extras_runs = runs_data.get("extras", 0)
            total_runs = runs_data.get("total", 0)

            extras = delivery.get("extras", {})

            # ------------------------------------------------
            # Determine whether this is a legal delivery
            # ------------------------------------------------

            is_legal = (
                "wides" not in extras
                and "noballs" not in extras
            )

            if is_legal:
                legal_balls += 1

            # ------------------------------------------------
            # Update score
            # ------------------------------------------------

            current_score += total_runs

            # ------------------------------------------------
            # Update wickets
            # ------------------------------------------------

            wickets_on_delivery = get_wicket_count(delivery)

            wickets_lost += wickets_on_delivery

            # ------------------------------------------------
            # Calculate match-state features
            # ------------------------------------------------

            balls_remaining = max(120 - legal_balls, 0)

            runs_required = max(target - current_score, 0)

            wickets_remaining = max(10 - wickets_lost, 0)

            overs_completed = legal_balls / 6

            if overs_completed > 0:
                current_run_rate = (
                    current_score / overs_completed
                )
            else:
                current_run_rate = 0

            if balls_remaining > 0:
                required_run_rate = (
                    runs_required /
                    (balls_remaining / 6)
                )
            else:
                required_run_rate = 0

            recent_runs, recent_wickets = get_recent_stats(
                all_previous_deliveries
            )

            # ------------------------------------------------
            # Current delivery information
            # ------------------------------------------------

            batter = delivery.get("batter", "")

            bowler = delivery.get("bowler", "")

            non_striker = delivery.get("non_striker", "")

            # ------------------------------------------------
            # Target / label
            #
            # 1 = chasing team eventually won
            # 0 = chasing team eventually lost
            # ------------------------------------------------

            target_label = 1 if winner == batting_team else 0

            # ------------------------------------------------
            # Save the match state
            # ------------------------------------------------

            row = {

                "match_id": json_file.stem,

                "date": match_date,

                "venue": venue,

                "batting_team": batting_team,

                "bowling_team": bowling_team,

                "batter": batter,

                "bowler": bowler,

                "non_striker": non_striker,

                "over": over_number,

                "legal_balls": legal_balls,

                "balls_remaining": balls_remaining,

                "score": current_score,

                "wickets_lost": wickets_lost,

                "wickets_remaining": wickets_remaining,

                "target": target,

                "runs_required": runs_required,

                "batter_runs": batter_runs,

                "extras_runs": extras_runs,

                "total_runs": total_runs,

                "current_run_rate": current_run_rate,

                "required_run_rate": required_run_rate,

                "recent_runs": recent_runs,

                "recent_wickets": recent_wickets,

                "target_label": target_label,
            }

            rows.append(row)

            # Store delivery for recent-ball calculations
            all_previous_deliveries.append(delivery)

    return rows


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("IPL CRICSHEET DATA PREPROCESSING")
    print("=" * 60)

    if not RAW_DATA_DIR.exists():

        print(f"\nERROR: Dataset folder not found:")
        print(RAW_DATA_DIR)

        return

    json_files = list(RAW_DATA_DIR.glob("*.json"))

    print(f"\nJSON files found: {len(json_files)}")

    if len(json_files) == 0:

        print("\nERROR: No JSON files found.")

        print(
            "\nPut your Cricsheet JSON files inside:"
        )

        print(RAW_DATA_DIR)

        return

    all_rows = []

    processed_matches = 0

    skipped_matches = 0

    # --------------------------------------------------------
    # Process every match
    # --------------------------------------------------------

    for index, json_file in enumerate(json_files, start=1):

        try:

            rows = process_match(json_file)

            if rows:

                all_rows.extend(rows)

                processed_matches += 1

            else:

                skipped_matches += 1

        except Exception as e:

            skipped_matches += 1

            print(
                f"\nCould not process {json_file.name}: {e}"
            )

        # Progress
        if index % 100 == 0 or index == len(json_files):

            print(
                f"Processed {index}/{len(json_files)} matches..."
            )

    # --------------------------------------------------------
    # Create DataFrame
    # --------------------------------------------------------

    if not all_rows:

        print("\nERROR: No training rows were generated.")

        return

    df = pd.DataFrame(all_rows)

    # --------------------------------------------------------
    # Remove duplicate rows
    # --------------------------------------------------------

    df = df.drop_duplicates()

    # --------------------------------------------------------
    # Sort chronologically
    # --------------------------------------------------------

    df = df.sort_values(
        by=["date", "match_id", "legal_balls"]
    )

    # --------------------------------------------------------
    # Create output directory
    # --------------------------------------------------------

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    # --------------------------------------------------------
    # Save dataset
    # --------------------------------------------------------

    df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    # --------------------------------------------------------
    # Print summary
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("PREPROCESSING COMPLETED")
    print("=" * 60)

    print(f"\nMatches processed : {processed_matches}")

    print(f"Matches skipped   : {skipped_matches}")

    print(f"Training rows     : {len(df):,}")

    print(f"Features/columns  : {len(df.columns)}")

    print(f"\nOutput file:")

    print(OUTPUT_FILE)

    print("\nTarget distribution:")

    print(
        df["target_label"].value_counts()
    )

    print("\nColumns:")

    for column in df.columns:

        print(f"  - {column}")

    print("\nFirst 5 rows:")

    print(
        df.head().to_string()
    )


if __name__ == "__main__":
    main()