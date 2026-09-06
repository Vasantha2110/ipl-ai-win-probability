// =====================================================
// IPL AI WIN PROBABILITY PREDICTOR
// Real IPL Match Data + Transformer Model
// Historical Match Replay
// =====================================================


// =====================================================
// BACKEND API
// =====================================================

const API_BASE_URL =
    "https://ipl-ai-win-probability.onrender.com";


// =====================================================
// GLOBAL DATA
// =====================================================

let matches = [];

let matchStates = [];

let trendProbabilities = [];

let predictionHistory = [];

let selectedMatch = null;

let selectedState = null;


// =====================================================
// HISTORICAL MATCH REPLAY
// =====================================================

let replayData = [];

let replayIndex = 0;

let replayTimer = null;

let replayInterval = 1000;


// =====================================================
// LOAD SAVED HISTORY
// =====================================================

try {

    const savedHistory =
        localStorage.getItem(
            "predictionHistory"
        );


    predictionHistory =
        savedHistory
            ? JSON.parse(savedHistory)
            : [];


    if (
        !Array.isArray(
            predictionHistory
        )
    ) {

        predictionHistory = [];

    }

} catch (error) {

    console.error(
        "Could not load prediction history:",
        error
    );

    predictionHistory = [];

}


// =====================================================
// DOM ELEMENTS
// =====================================================

const matchSelect =
    document.getElementById(
        "matchSelect"
    );


const ballSelect =
    document.getElementById(
        "ballSelect"
    );


const selectedMatchInfo =
    document.getElementById(
        "selectedMatchInfo"
    );


const matchVenue =
    document.getElementById(
        "matchVenue"
    );


const matchDate =
    document.getElementById(
        "matchDate"
    );


const matchBattingTeam =
    document.getElementById(
        "matchBattingTeam"
    );


const matchBowlingTeam =
    document.getElementById(
        "matchBowlingTeam"
    );


const predictButton =
    document.getElementById(
        "predictButton"
    );


// =====================================================
// REPLAY ELEMENTS
// =====================================================

const replaySection =
    document.getElementById(
        "replaySection"
    );


const replayBall =
    document.getElementById(
        "replayBall"
    );


const replayOver =
    document.getElementById(
        "replayOver"
    );


const replayScore =
    document.getElementById(
        "replayScore"
    );


const replayWickets =
    document.getElementById(
        "replayWickets"
    );


const replayBattingTeam =
    document.getElementById(
        "replayBattingTeam"
    );


const replayBowlingTeam =
    document.getElementById(
        "replayBowlingTeam"
    );


const replayBattingProbability =
    document.getElementById(
        "replayBattingProbability"
    );


const replayBowlingProbability =
    document.getElementById(
        "replayBowlingProbability"
    );


const replaySlider =
    document.getElementById(
        "replaySlider"
    );


const replayProgress =
    document.getElementById(
        "replayProgress"
    );


const previousBallButton =
    document.getElementById(
        "previousBallButton"
    );


const startReplayButton =
    document.getElementById(
        "startReplayButton"
    );


const pauseReplayButton =
    document.getElementById(
        "pauseReplayButton"
    );


const nextBallButton =
    document.getElementById(
        "nextBallButton"
    );


const restartReplayButton =
    document.getElementById(
        "restartReplayButton"
    );


const replaySpeed =
    document.getElementById(
        "replaySpeed"
    );


// =====================================================
// LOADING / ERROR
// =====================================================

const loading =
    document.getElementById(
        "loading"
    );


const errorBox =
    document.getElementById(
        "error"
    );


const result =
    document.getElementById(
        "result"
    );


// =====================================================
// RESULT ELEMENTS
// =====================================================

const battingTeamName =
    document.getElementById(
        "battingTeamName"
    );


const bowlingTeamName =
    document.getElementById(
        "bowlingTeamName"
    );


const battingProbability =
    document.getElementById(
        "battingProbability"
    );


const bowlingProbability =
    document.getElementById(
        "bowlingProbability"
    );


// =====================================================
// PROBABILITY BAR ELEMENTS
// =====================================================

const battingProbabilityBar =
    document.getElementById(
        "battingProbabilityBar"
    );


const bowlingProbabilityBar =
    document.getElementById(
        "bowlingProbabilityBar"
    );


const predictionText =
    document.getElementById(
        "predictionText"
    );


// =====================================================
// MATCH ANALYSIS ELEMENTS
// =====================================================

const currentScoreElement =
    document.getElementById(
        "currentScore"
    );


const currentWicketsElement =
    document.getElementById(
        "currentWickets"
    );


const runsRequiredElement =
    document.getElementById(
        "runsRequired"
    );


const ballsRemainingElement =
    document.getElementById(
        "ballsRemaining"
    );


const currentRunRateElement =
    document.getElementById(
        "currentRunRate"
    );


const requiredRunRateElement =
    document.getElementById(
        "requiredRunRate"
    );


const targetElement =
    document.getElementById(
        "targetValue"
    );


const pressureValueElement =
    document.getElementById(
        "pressureValue"
    );


// =====================================================
// CHART ELEMENTS
// =====================================================

const probabilityChartCanvas =
    document.getElementById(
        "probabilityChart"
    );


const trendChartCanvas =
    document.getElementById(
        "trendChart"
    );


let probabilityChart = null;

let trendChart = null;


// =====================================================
// HISTORY ELEMENTS
// =====================================================

const historyBody =
    document.getElementById(
        "historyBody"
    );


const clearHistoryButton =
    document.getElementById(
        "clearHistory"
    );


// =====================================================
// ERROR FUNCTIONS
// =====================================================

function showError(message) {

    if (!errorBox) {

        return;

    }


    errorBox.textContent =
        message;


    errorBox.style.display =
        "block";

}


function hideError() {

    if (!errorBox) {

        return;

    }


    errorBox.textContent =
        "";


    errorBox.style.display =
        "none";

}


// =====================================================
// LOADING FUNCTIONS
// =====================================================

function showLoading(message) {

    if (!loading) {

        return;

    }


    loading.innerHTML =
        `<p>🤖 ${message}</p>`;


    loading.style.display =
        "block";

}


function hideLoading() {

    if (!loading) {

        return;

    }


    loading.style.display =
        "none";

}


// =====================================================
// LOAD IPL MATCHES
// =====================================================

async function loadMatches() {

    hideError();


    showLoading(
        "Loading IPL match data..."
    );


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/matches`
            );


        if (!response.ok) {

            throw new Error(
                `Server returned HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Matches API response:",
            data
        );


        if (
            data.status !==
            "success"
        ) {

            throw new Error(
                data.error ||
                "Could not load matches."
            );

        }


        matches =
            data.matches || [];


        if (
            matches.length === 0
        ) {

            throw new Error(
                "No IPL matches were found."
            );

        }


        populateMatchDropdown();


    } catch (error) {

        console.error(
            "Match loading error:",
            error
        );


        showError(
            "Could not load IPL matches. " +
            error.message
        );


        if (matchSelect) {

            matchSelect.innerHTML = `

                <option value="">
                    Unable to load matches
                </option>

            `;

        }


    } finally {

        hideLoading();

    }

}


// =====================================================
// POPULATE MATCH DROPDOWN
// =====================================================

function populateMatchDropdown() {

    if (!matchSelect) {

        return;

    }


    matchSelect.innerHTML = `

        <option value="">
            Select an IPL Match
        </option>

    `;


    matches.forEach(
        match => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                match.match_id;


            option.textContent =
                `${match.match_id} | ` +
                `${match.batting_team} vs ` +
                `${match.bowling_team} | ` +
                `${match.date}`;


            matchSelect.appendChild(
                option
            );

        }
    );

}


// =====================================================
// MATCH SELECTED
// =====================================================

async function handleMatchSelection() {

    hideError();


    stopReplay();


    if (result) {

        result.style.display =
            "none";

    }


    const matchId =
        matchSelect.value;


    if (ballSelect) {

        ballSelect.innerHTML = `

            <option value="">
                Loading match states...
            </option>

        `;

        ballSelect.disabled = true;

    }


    if (predictButton) {

        predictButton.disabled = true;

    }


    selectedMatch = null;

    selectedState = null;

    matchStates = [];

    trendProbabilities = [];


    replayData = [];

    replayIndex = 0;


    if (replaySection) {

        replaySection.style.display =
            "none";

    }


    clearTrendChart();


    if (!matchId) {

        if (selectedMatchInfo) {

            selectedMatchInfo.style.display =
                "none";

        }


        if (ballSelect) {

            ballSelect.innerHTML = `

                <option value="">
                    Select a match first
                </option>

            `;

        }


        resetAnalysis();

        resetProbabilityBars();

        return;

    }


    // =================================================
    // FIND SELECTED MATCH
    // =================================================

    selectedMatch =
        matches.find(
            match =>
                String(
                    match.match_id
                ) ===
                String(matchId)
        );


    if (selectedMatch) {

        displayMatchInformation(
            selectedMatch
        );

    }


    // =================================================
    // LOAD MATCH STATES
    // =================================================

    await loadMatchStates(
        Number(matchId)
    );


    // =================================================
    // LOAD TRANSFORMER TREND
    // =================================================

    await loadTrendProbabilities(
        Number(matchId)
    );

}


// =====================================================
// DISPLAY MATCH INFORMATION
// =====================================================

function displayMatchInformation(
    match
) {

    if (matchVenue) {

        matchVenue.textContent =
            match.venue || "-";

    }


    if (matchDate) {

        matchDate.textContent =
            match.date || "-";

    }


    if (matchBattingTeam) {

        matchBattingTeam.textContent =
            match.batting_team || "-";

    }


    if (matchBowlingTeam) {

        matchBowlingTeam.textContent =
            match.bowling_team || "-";

    }


    if (selectedMatchInfo) {

        selectedMatchInfo.style.display =
            "block";

    }

}


// =====================================================
// LOAD MATCH STATES
// =====================================================

async function loadMatchStates(
    matchId
) {

    showLoading(
        "Loading real ball-by-ball match states..."
    );


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/match-states/${matchId}`
            );


        if (!response.ok) {

            throw new Error(
                `Server returned HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Match states response:",
            data
        );


        if (
            data.status !==
            "success"
        ) {

            throw new Error(
                data.error ||
                "Could not load match states."
            );

        }


        matchStates =
            data.states || [];


        if (
            matchStates.length === 0
        ) {

            throw new Error(
                "No match states were found."
            );

        }


        populateBallDropdown();


    } catch (error) {

        console.error(
            "Match state loading error:",
            error
        );


        showError(
            error.message
        );


        if (ballSelect) {

            ballSelect.innerHTML = `

                <option value="">
                    Unable to load match states
                </option>

            `;

        }


    } finally {

        hideLoading();

    }

}


// =====================================================
// POPULATE BALL DROPDOWN
// =====================================================

function populateBallDropdown() {

    if (!ballSelect) {

        return;

    }


    ballSelect.innerHTML = `

        <option value="">
            Select a match state
        </option>

    `;


    matchStates.forEach(
        state => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                state.legal_balls;


            option.textContent =
                `Ball ${state.legal_balls}` +
                ` | Over ${state.over}` +
                ` | ${state.score}/${state.wickets_lost}`;


            ballSelect.appendChild(
                option
            );

        }
    );


    ballSelect.disabled =
        false;

}


// =====================================================
// MATCH STATE SELECTED
// =====================================================

function handleBallSelection() {

    hideError();


    stopReplay();


    if (result) {

        result.style.display =
            "none";

    }


    const legalBall =
        Number(
            ballSelect.value
        );


    if (
        !Number.isFinite(
            legalBall
        ) ||
        !ballSelect.value
    ) {

        selectedState = null;


        if (predictButton) {

            predictButton.disabled =
                true;

        }


        resetAnalysis();

        resetProbabilityBars();

        return;

    }


    selectedState =
        matchStates.find(
            state =>
                Number(
                    state.legal_balls
                ) ===
                legalBall
        );


    if (!selectedState) {

        showError(
            "Could not find the selected match state."
        );


        if (predictButton) {

            predictButton.disabled =
                true;

        }


        return;

    }


    updateAnalysisFromState(
        selectedState
    );


    if (predictButton) {

        predictButton.disabled =
            false;

    }

}


// =====================================================
// UPDATE ANALYSIS
// =====================================================

function updateAnalysisFromState(
    state
) {

    if (!state) {

        return;

    }


    if (currentScoreElement) {

        currentScoreElement.textContent =
            state.score ?? "-";

    }


    if (currentWicketsElement) {

        currentWicketsElement.textContent =
            state.wickets_lost ?? "-";

    }


    if (runsRequiredElement) {

        runsRequiredElement.textContent =
            state.runs_required ?? "-";

    }


    if (ballsRemainingElement) {

        ballsRemainingElement.textContent =
            state.balls_remaining ?? "-";

    }


    if (currentRunRateElement) {

        currentRunRateElement.textContent =
            Number(
                state.current_run_rate
            ).toFixed(2);

    }


    if (requiredRunRateElement) {

        requiredRunRateElement.textContent =
            Number(
                state.required_run_rate
            ).toFixed(2);

    }


    if (targetElement) {

        targetElement.textContent =
            state.target ?? "-";

    }


    const pressure =
        calculatePressure(

            Number(
                state.runs_required
            ),

            Number(
                state.balls_remaining
            ),

            Number(
                state.current_run_rate
            ),

            Number(
                state.required_run_rate
            )

        );


    if (pressureValueElement) {

        pressureValueElement.textContent =
            pressure;

    }

}


// =====================================================
// PRESSURE CALCULATION
// =====================================================

function calculatePressure(

    runsRequired,

    ballsRemaining,

    currentRunRate,

    requiredRunRate

) {

    if (
        runsRequired <= 0
    ) {

        return "Won";

    }


    if (
        ballsRemaining <= 0
    ) {

        return "Very High";

    }


    if (
        requiredRunRate <=
        currentRunRate
    ) {

        return "Low";

    }


    if (
        requiredRunRate <=
        currentRunRate * 1.25
    ) {

        return "Medium";

    }


    if (
        requiredRunRate <=
        currentRunRate * 2
    ) {

        return "High";

    }


    return "Very High";

}


// =====================================================
// RESET ANALYSIS
// =====================================================

function resetAnalysis() {

    if (currentScoreElement) {

        currentScoreElement.textContent =
            "-";

    }


    if (currentWicketsElement) {

        currentWicketsElement.textContent =
            "-";

    }


    if (runsRequiredElement) {

        runsRequiredElement.textContent =
            "-";

    }


    if (ballsRemainingElement) {

        ballsRemainingElement.textContent =
            "-";

    }


    if (currentRunRateElement) {

        currentRunRateElement.textContent =
            "-";

    }


    if (requiredRunRateElement) {

        requiredRunRateElement.textContent =
            "-";

    }


    if (targetElement) {

        targetElement.textContent =
            "-";

    }


    if (pressureValueElement) {

        pressureValueElement.textContent =
            "-";

    }

}


// =====================================================
// RESET PROBABILITY BARS
// =====================================================

function resetProbabilityBars() {

    if (battingProbabilityBar) {

        battingProbabilityBar.style.width =
            "0%";

    }


    if (bowlingProbabilityBar) {

        bowlingProbabilityBar.style.width =
            "0%";

    }

}


// =====================================================
// UPDATE PROBABILITY BARS
// =====================================================

function updateProbabilityBars(

    battingValue,

    bowlingValue

) {

    if (battingProbabilityBar) {

        battingProbabilityBar.style.width =
            `${Math.max(
                0,
                Math.min(
                    100,
                    battingValue
                )
            )}%`;

    }


    if (bowlingProbabilityBar) {

        bowlingProbabilityBar.style.width =
            `${Math.max(
                0,
                Math.min(
                    100,
                    bowlingValue
                )
            )}%`;

    }

}


// =====================================================
// LOAD REAL TRANSFORMER TREND
// =====================================================

async function loadTrendProbabilities(
    matchId
) {

    showLoading(
        "Transformer AI is calculating the complete win probability trend..."
    );


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/match-probabilities/${matchId}`
            );


        if (!response.ok) {

            throw new Error(
                `Trend API returned HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Trend API response:",
            data
        );


        if (
            data.status !==
            "success"
        ) {

            throw new Error(
                data.error ||
                "Could not load probability trend."
            );

        }


        trendProbabilities =
            data.probabilities || [];


        if (
            trendProbabilities.length === 0
        ) {

            clearTrendChart();


            throw new Error(
                "No probability trend data was returned."
            );

        }


        updateTrendChart(
            trendProbabilities
        );


        initializeReplay();


        console.log(
            `Loaded ${trendProbabilities.length} ` +
            `real Transformer predictions.`
        );


    } catch (error) {

        console.error(
            "Trend loading error:",
            error
        );


        showError(
            "Could not load win probability trend. " +
            error.message
        );


    } finally {

        hideLoading();

    }

}


// =====================================================
// PREDICT REAL MATCH
// =====================================================

async function predictWinProbability() {

    hideError();


    if (
        !selectedMatch ||
        !selectedState
    ) {

        showError(
            "Please select a match and match state first."
        );

        return;

    }


    showLoading(
        "Transformer AI is analyzing the real match..."
    );


    if (result) {

        result.style.display =
            "none";

    }


    if (predictButton) {

        predictButton.disabled =
            true;

    }


    try {

        const matchId =
            Number(
                selectedMatch.match_id
            );


        const legalBall =
            Number(
                selectedState.legal_balls
            );


        console.log(
            "Sending real prediction request:",
            {
                match_id: matchId,
                legal_balls: legalBall
            }
        );


        const response =
            await fetch(
                `${API_BASE_URL}/predict-real`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            match_id:
                                matchId,

                            legal_balls:
                                legalBall

                        })

                }
            );


        if (!response.ok) {

            throw new Error(
                `Server returned HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Prediction API response:",
            data
        );


        if (
            data.status !==
            "success"
        ) {

            throw new Error(
                data.error ||
                "Prediction failed."
            );

        }


        const battingWinProbability =
            Number(
                data.batting_team_win_probability
            );


        const bowlingWinProbability =
            Number(
                data.bowling_team_win_probability
            );


        if (
            !Number.isFinite(
                battingWinProbability
            ) ||
            !Number.isFinite(
                bowlingWinProbability
            )
        ) {

            throw new Error(
                "Invalid probability received from the AI model."
            );

        }


        // =================================================
        // UPDATE RESULT
        // =================================================

        displayPredictionResult(
            data
        );


        // =================================================
        // UPDATE ANALYSIS
        // =================================================

        updateAnalysisFromState(
            data
        );


        // =================================================
        // CURRENT PROBABILITY CHART
        // =================================================

        updateProbabilityChart(

            data.batting_team,

            data.bowling_team,

            battingWinProbability,

            bowlingWinProbability

        );


        // =================================================
        // SAVE HISTORY
        // =================================================

        const pressure =
            calculatePressure(

                data.runs_required,

                data.balls_remaining,

                data.current_run_rate,

                data.required_run_rate

            );


        const historyItem = {

            matchId:
                data.match_id,

            over:
                data.over,

            legalBall:
                data.legal_balls,

            score:
                data.score,

            wickets:
                data.wickets_lost,

            target:
                data.target,

            battingTeam:
                data.batting_team,

            bowlingTeam:
                data.bowling_team,

            battingProbability:
                Number(
                    battingWinProbability.toFixed(2)
                ),

            bowlingProbability:
                Number(
                    bowlingWinProbability.toFixed(2)
                ),

            pressure:
                pressure,

            timestamp:
                new Date().toLocaleString()

        };


        predictionHistory.push(
            historyItem
        );


        // Keep latest 50 predictions

        if (
            predictionHistory.length >
            50
        ) {

            predictionHistory =
                predictionHistory.slice(
                    -50
                );

        }


        localStorage.setItem(
            "predictionHistory",
            JSON.stringify(
                predictionHistory
            )
        );


        renderHistory();


    } catch (error) {

        console.error(
            "Prediction error:",
            error
        );


        showError(
            error.message ||
            "Something went wrong while making the prediction."
        );


    } finally {

        hideLoading();


        if (predictButton) {

            predictButton.disabled =
                false;

        }

    }

}


// =====================================================
// DISPLAY PREDICTION RESULT
// Used by both manual prediction and replay
// =====================================================

function displayPredictionResult(
    data
) {

    if (!data) {

        return;

    }


    const battingProbabilityValue =
        Number(
            data.batting_team_win_probability
        );


    const bowlingProbabilityValue =
        Number(
            data.bowling_team_win_probability
        );


    if (battingTeamName) {

        battingTeamName.textContent =
            data.batting_team || "-";

    }


    if (bowlingTeamName) {

        bowlingTeamName.textContent =
            data.bowling_team || "-";

    }


    if (battingProbability) {

        battingProbability.textContent =
            battingProbabilityValue.toFixed(2);

    }


    if (bowlingProbability) {

        bowlingProbability.textContent =
            bowlingProbabilityValue.toFixed(2);

    }


    // =================================================
    // UPDATE PROBABILITY BARS
    // =================================================

    updateProbabilityBars(

        battingProbabilityValue,

        bowlingProbabilityValue

    );


    if (predictionText) {

        if (
            battingProbabilityValue >
            bowlingProbabilityValue
        ) {

            predictionText.textContent =
                `${data.batting_team} is more likely to win.`;

        }

        else if (
            bowlingProbabilityValue >
            battingProbabilityValue
        ) {

            predictionText.textContent =
                `${data.bowling_team} is more likely to win.`;

        }

        else {

            predictionText.textContent =
                "The match is currently evenly balanced.";

        }

    }


    if (result) {

        result.style.display =
            "block";

    }

}


// =====================================================
// CURRENT PROBABILITY CHART
// =====================================================

function updateProbabilityChart() {

    const ctx = document.getElementById("probabilityChart");

    if (!ctx) return;

    if (probabilityChart) {
        probabilityChart.destroy();
    }

    probabilityChart = new Chart(ctx, {

        type: "bar",

        data: {

            labels: [
                battingTeamName.textContent,
                bowlingTeamName.textContent
            ],

            datasets: [

                {
                    label: "Win Probability",

                    data: [
                        battingProbabilityValue,
                        bowlingProbabilityValue
                    ],

                    borderWidth: 0,

                    borderRadius: 12,

                    barThickness: 55,

                    backgroundColor: [
                        "rgba(59, 130, 246, 0.85)",
                        "rgba(139, 92, 246, 0.85)"
                    ],

                    hoverBackgroundColor: [
                        "rgba(59, 130, 246, 1)",
                        "rgba(139, 92, 246, 1)"
                    ]
                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            animation: {
                duration: 800
            },

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {

                    backgroundColor: "#111827",

                    titleColor: "#ffffff",

                    bodyColor: "#d1d5db",

                    padding: 12,

                    displayColors: false,

                    callbacks: {

                        label: function(context) {

                            return " Win Probability: "
                                + context.parsed.y.toFixed(1)
                                + "%";

                        }

                    }

                }

            },

            scales: {

                y: {

                    beginAtZero: true,

                    max: 100,

                    ticks: {

                        color: "#94a3b8",

                        callback: function(value) {
                            return value + "%";
                        }

                    },

                    grid: {
                        color: "rgba(148, 163, 184, 0.12)"
                    }

                },

                x: {

                    ticks: {
                        color: "#cbd5e1"
                    },

                    grid: {
                        display: false
                    }

                }

            }

        }

    });

}
// =====================================================
// CLEAR TREND CHART
// =====================================================

function clearTrendChart() {

    if (
        trendChart
    ) {

        trendChart.destroy();

        trendChart =
            null;

    }

}


// =====================================================
// REAL WIN PROBABILITY TREND CHART
// =====================================================

function updateTrendChart(probabilities) {

    const ctx = document.getElementById("trendChart");

    if (!ctx) return;

    if (trendChart) {
        trendChart.destroy();
    }

    const labels = probabilities.map(item =>
        `Ball ${item.legal_balls}`
    );

    const battingData = probabilities.map(item =>
        Number(item.batting_probability)
    );

    const bowlingData = probabilities.map(item =>
        Number(item.bowling_probability)
    );

    trendChart = new Chart(ctx, {

        type: "line",

        data: {

            labels: labels,

            datasets: [

                {
                    label: battingTeamName.textContent,

                    data: battingData,

                    borderWidth: 3,

                    tension: 0.35,

                    pointRadius: 2,

                    pointHoverRadius: 6,

                    fill: true,

                    backgroundColor:
                        "rgba(59, 130, 246, 0.10)",

                    borderColor:
                        "rgba(59, 130, 246, 1)"
                },

                {
                    label: bowlingTeamName.textContent,

                    data: bowlingData,

                    borderWidth: 3,

                    tension: 0.35,

                    pointRadius: 2,

                    pointHoverRadius: 6,

                    fill: true,

                    backgroundColor:
                        "rgba(139, 92, 246, 0.10)",

                    borderColor:
                        "rgba(139, 92, 246, 1)"
                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            interaction: {

                mode: "index",

                intersect: false

            },

            animation: {

                duration: 700

            },

            plugins: {

                legend: {

                    display: true,

                    position: "top",

                    labels: {

                        color: "#cbd5e1",

                        padding: 20,

                        usePointStyle: true

                    }

                },

                tooltip: {

                    backgroundColor: "#111827",

                    titleColor: "#ffffff",

                    bodyColor: "#d1d5db",

                    padding: 12,

                    callbacks: {

                        title: function(context) {

                            return context[0].label;

                        },

                        label: function(context) {

                            return (
                                " " +
                                context.dataset.label +
                                ": " +
                                context.parsed.y.toFixed(1) +
                                "%"
                            );

                        }

                    }

                }

            },

            scales: {

                y: {

                    beginAtZero: true,

                    max: 100,

                    ticks: {

                        color: "#94a3b8",

                        callback: function(value) {

                            return value + "%";

                        }

                    },

                    grid: {

                        color:
                            "rgba(148, 163, 184, 0.10)"

                    },

                    title: {

                        display: true,

                        text: "Win Probability (%)",

                        color: "#94a3b8"

                    }

                },

                x: {

                    ticks: {

                        color: "#94a3b8",

                        maxTicksLimit: 12

                    },

                    grid: {

                        display: false

                    },

                    title: {

                        display: true,

                        text: "Legal Ball",

                        color: "#94a3b8"

                    }

                }

            }

        }

    });

}

    // =================================================
    // X-AXIS LABELS
    // =================================================

    const labels =
        probabilities.map(
            item =>
                `Ball ${item.legal_balls}`
        );


    // =================================================
    // BATTING TEAM PROBABILITIES
    // =================================================

    const battingProbabilities =
        probabilities.map(
            item =>
                Number(
                    item.batting_team_win_probability
                )
        );


    // =================================================
    // BOWLING TEAM PROBABILITIES
    // =================================================

    const bowlingProbabilities =
        probabilities.map(
            item =>
                Number(
                    item.bowling_team_win_probability
                )
        );


    // =================================================
    // TEAM NAMES
    // =================================================

    const battingTeam =
        probabilities[0].batting_team ||
        "Batting Team";


    const bowlingTeam =
        probabilities[0].bowling_team ||
        "Bowling Team";


    // =================================================
    // CREATE CHART
    // =================================================

    trendChart =
        new Chart(

            trendChartCanvas,

            {

                type:
                    "line",


                data: {

                    labels:
                        labels,


                    datasets: [

                        {

                            label:
                                `${battingTeam} Win %`,

                            data:
                                battingProbabilities,

                            tension:
                                0.3,

                            borderWidth:
                                2,

                            fill:
                                false,

                            pointRadius:
                                2,

                            pointHoverRadius:
                                5

                        },


                        {

                            label:
                                `${bowlingTeam} Win %`,

                            data:
                                bowlingProbabilities,

                            tension:
                                0.3,

                            borderWidth:
                                2,

                            fill:
                                false,

                            pointRadius:
                                2,

                            pointHoverRadius:
                                5

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        true,


                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },


                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            max:
                                100,

                            title: {

                                display:
                                    true,

                                text:
                                    "Win Probability (%)"

                            }

                        },


                        x: {

                            title: {

                                display:
                                    true,

                                text:
                                    "Legal Ball"

                            },


                            ticks: {

                                autoSkip:
                                    true,

                                maxTicksLimit:
                                    15

                            }

                        }

                    },


                    plugins: {

                        title: {

                            display:
                                true,

                            text:
                                "Real Transformer Win Probability Trend"

                        },


                        legend: {

                            display:
                                true,

                            position:
                                "top"

                        },


                        tooltip: {

                            callbacks: {

                                title:
                                    function(context) {

                                        if (
                                            !context ||
                                            context.length === 0
                                        ) {

                                            return "";

                                        }


                                        const index =
                                            context[0].dataIndex;


                                        const item =
                                            probabilities[
                                                index
                                            ];


                                        if (!item) {

                                            return "";

                                        }


                                        return (
                                            `Ball ${item.legal_balls}` +
                                            ` | Over ${item.over}`
                                        );

                                    },


                                afterBody:
                                    function(context) {

                                        if (
                                            !context ||
                                            context.length === 0
                                        ) {

                                            return "";

                                        }


                                        const index =
                                            context[0].dataIndex;


                                        const item =
                                            probabilities[
                                                index
                                            ];


                                        if (!item) {

                                            return "";

                                        }


                                        return [

                                            `Score: ${item.score}/${item.wickets_lost}`,

                                            `${item.batting_team} vs ${item.bowling_team}`

                                        ];

                                    }

                            }

                        }

                    }

                }

            }

        );

}


// =====================================================
// HISTORICAL MATCH REPLAY
// =====================================================

// Build replay data by combining:
// 1. Real match states
// 2. Real Transformer probabilities

function initializeReplay() {

    stopReplay();


    replayData = [];


    if (
        !trendProbabilities ||
        trendProbabilities.length === 0
    ) {

        if (replaySection) {

            replaySection.style.display =
                "block";

        }

        return;

    }


    // =================================================
    // MATCH EACH PREDICTION WITH ITS MATCH STATE
    // =================================================

    trendProbabilities.forEach(
        prediction => {

            const state =
                matchStates.find(
                    item =>
                        Number(
                            item.legal_balls
                        ) ===
                        Number(
                            prediction.legal_balls
                        )
                );


            if (state) {

                replayData.push({

                    ...state,

                    ...prediction

                });

            }

        }
    );


    if (
        replayData.length === 0
    ) {

        if (replaySection) {

            replaySection.style.display =
                "none";

        }

        return;

    }


    // =================================================
    // SHOW REPLAY
    // =================================================

    if (replaySection) {

        replaySection.style.display =
            "block";

    }


    replayIndex =
        0;


    // =================================================
    // SET SLIDER
    // =================================================

    if (replaySlider) {

        replaySlider.min =
            0;

        replaySlider.max =
            replayData.length - 1;

        replaySlider.value =
            0;

        replaySlider.disabled =
            false;

    }


    // =================================================
    // BUTTON STATES
    // =================================================

    if (startReplayButton) {

        startReplayButton.disabled =
            false;

    }


    if (pauseReplayButton) {

        pauseReplayButton.disabled =
            true;

    }


    if (previousBallButton) {

        previousBallButton.disabled =
            true;

    }


    if (nextBallButton) {

        nextBallButton.disabled =
            replayData.length <= 1;

    }


    if (restartReplayButton) {

        restartReplayButton.disabled =
            false;

    }


    // =================================================
    // SHOW FIRST REPLAY STATE
    // =================================================

    renderReplayState();


    console.log(
        `Replay initialized with ${replayData.length} ` +
        `real Transformer predictions.`
    );

}


// =====================================================
// RENDER CURRENT REPLAY STATE
// =====================================================

function renderReplayState() {

    if (
        !replayData ||
        replayData.length === 0
    ) {

        return;

    }


    const item =
        replayData[
            replayIndex
        ];


    if (!item) {

        return;

    }


    // =================================================
    // REPLAY SCOREBOARD
    // =================================================

    if (replayBall) {

        replayBall.textContent =
            item.legal_balls;

    }


    if (replayOver) {

        replayOver.textContent =
            `Over ${item.over}`;

    }


    if (replayScore) {

        replayScore.textContent =
            item.score;

    }


    if (replayWickets) {

        replayWickets.textContent =
            item.wickets_lost;

    }


    // =================================================
    // REPLAY TEAMS
    // =================================================

    if (replayBattingTeam) {

        replayBattingTeam.textContent =
            item.batting_team;

    }


    if (replayBowlingTeam) {

        replayBowlingTeam.textContent =
            item.bowling_team;

    }


    // =================================================
    // REPLAY PROBABILITIES
    // =================================================

    const battingProbabilityValue =
        Number(
            item.batting_team_win_probability
        );


    const bowlingProbabilityValue =
        Number(
            item.bowling_team_win_probability
        );


    if (replayBattingProbability) {

        replayBattingProbability.textContent =
            `${battingProbabilityValue.toFixed(2)}%`;

    }


    if (replayBowlingProbability) {

        replayBowlingProbability.textContent =
            `${bowlingProbabilityValue.toFixed(2)}%`;

    }


    // =================================================
    // UPDATE MAIN PROBABILITY BARS DURING REPLAY
    // =================================================

    updateProbabilityBars(

        battingProbabilityValue,

        bowlingProbabilityValue

    );


    // =================================================
    // PROGRESS
    // =================================================

    if (replayProgress) {

        replayProgress.textContent =
            `Prediction ${replayIndex + 1} ` +
            `of ${replayData.length}` +
            ` | Ball ${item.legal_balls}`;

    }


    if (replaySlider) {

        replaySlider.value =
            replayIndex;

    }


    // =================================================
    // BUTTON STATES
    // =================================================

    if (previousBallButton) {

        previousBallButton.disabled =
            replayIndex === 0;

    }


    if (nextBallButton) {

        nextBallButton.disabled =
            replayIndex ===
            replayData.length - 1;

    }


    // =================================================
    // UPDATE SELECTED STATE
    // =================================================

    selectedState =
        matchStates.find(
            state =>
                Number(
                    state.legal_balls
                ) ===
                Number(
                    item.legal_balls
                )
        ) || item;


    // =================================================
    // SYNC BALL DROPDOWN
    // =================================================

    if (
        ballSelect &&
        selectedState
    ) {

        ballSelect.value =
            selectedState.legal_balls;

    }


    // =================================================
    // UPDATE EXISTING MATCH ANALYSIS
    // =================================================

    updateAnalysisFromState(
        item
    );


    // =================================================
    // UPDATE EXISTING PREDICTION RESULT
    // =================================================

    displayPredictionResult({

        batting_team:
            item.batting_team,

        bowling_team:
            item.bowling_team,

        batting_team_win_probability:
            battingProbabilityValue,

        bowling_team_win_probability:
            bowlingProbabilityValue

    });


    // =================================================
    // UPDATE CURRENT PROBABILITY CHART
    // =================================================

    updateProbabilityChart(

        item.batting_team,

        item.bowling_team,

        battingProbabilityValue,

        bowlingProbabilityValue

    );

}


// =====================================================
// START REPLAY
// =====================================================

function startReplay() {

    if (
        !replayData ||
        replayData.length === 0
    ) {

        return;

    }


    // If replay is at the end,
    // restart from the beginning.

    if (
        replayIndex >=
        replayData.length - 1
    ) {

        replayIndex =
            0;

        renderReplayState();

    }


    // Clear existing timer

    if (replayTimer !== null) {

        clearInterval(
            replayTimer
        );

        replayTimer =
            null;

    }


    // =================================================
    // START AUTOMATIC REPLAY
    // =================================================

    replayTimer =
        setInterval(

            function() {

                if (
                    replayIndex <
                    replayData.length - 1
                ) {

                    replayIndex++;

                    renderReplayState();

                }

                else {

                    stopReplay();

                }

            },

            replayInterval

        );


    if (startReplayButton) {

        startReplayButton.disabled =
            true;

    }


    if (pauseReplayButton) {

        pauseReplayButton.disabled =
            false;

    }

}


// =====================================================
// PAUSE REPLAY
// =====================================================

function pauseReplay() {

    if (
        replayTimer !== null
    ) {

        clearInterval(
            replayTimer
        );

        replayTimer =
            null;

    }


    if (startReplayButton) {

        startReplayButton.disabled =
            replayData.length === 0;

    }


    if (pauseReplayButton) {

        pauseReplayButton.disabled =
            true;

    }

}


// =====================================================
// STOP REPLAY
// =====================================================

function stopReplay() {

    if (
        replayTimer !== null
    ) {

        clearInterval(
            replayTimer
        );

        replayTimer =
            null;

    }


    if (startReplayButton) {

        startReplayButton.disabled =
            replayData.length === 0;

    }


    if (pauseReplayButton) {

        pauseReplayButton.disabled =
            true;

    }

}


// =====================================================
// PREVIOUS REPLAY BALL
// =====================================================

function showPreviousReplayBall() {

    pauseReplay();


    if (
        replayIndex > 0
    ) {

        replayIndex--;

        renderReplayState();

    }

}


// =====================================================
// NEXT REPLAY BALL
// =====================================================

function showNextReplayBall() {

    pauseReplay();


    if (
        replayIndex <
        replayData.length - 1
    ) {

        replayIndex++;

        renderReplayState();

    }

}


// =====================================================
// RESTART REPLAY
// =====================================================

function restartReplay() {

    pauseReplay();


    replayIndex =
        0;


    renderReplayState();

}


// =====================================================
// REPLAY SLIDER
// =====================================================

function changeReplayPosition() {

    pauseReplay();


    if (
        !replayData ||
        replayData.length === 0
    ) {

        return;

    }


    replayIndex =
        Number(
            replaySlider.value
        );


    renderReplayState();

}


// =====================================================
// REPLAY SPEED
// =====================================================

function changeReplaySpeed() {

    if (!replaySpeed) {

        return;

    }


    replayInterval =
        Number(
            replaySpeed.value
        );


    // Check whether replay was running

    const wasRunning =
        replayTimer !== null;


    if (wasRunning) {

        startReplay();

    }

}


// =====================================================
// RENDER HISTORY
// =====================================================

function renderHistory() {

    if (!historyBody) {

        return;

    }


    historyBody.innerHTML =
        "";


    const reversedHistory =
        [
            ...predictionHistory
        ].reverse();


    if (
        reversedHistory.length === 0
    ) {

        const row =
            document.createElement(
                "tr"
            );


        row.innerHTML = `

            <td colspan="11">

                No predictions yet.

                Select a real IPL match
                and make a prediction.

            </td>

        `;


        historyBody.appendChild(
            row
        );


        return;

    }


    reversedHistory.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${reversedHistory.length - index}
                </td>

                <td>
                    ${item.matchId || "-"}
                </td>

                <td>
                    ${item.over || "-"}
                </td>

                <td>
                    ${item.score || "-"}
                </td>

                <td>
                    ${item.wickets ?? "-"}
                </td>

                <td>
                    ${item.battingTeam || "-"}
                </td>

                <td>
                    ${item.bowlingTeam || "-"}
                </td>

                <td>
                    ${item.battingProbability ?? "-"}%
                </td>

                <td>
                    ${item.bowlingProbability ?? "-"}%
                </td>

                <td>
                    ${item.pressure || "-"}
                </td>

                <td>
                    ${item.timestamp || "-"}
                </td>

            `;


            historyBody.appendChild(
                row
            );

        }
    );

}


// =====================================================
// CLEAR HISTORY
// =====================================================

function clearHistory() {

    if (
        predictionHistory.length === 0
    ) {

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to clear all prediction history?"
        );


    if (!confirmed) {

        return;

    }


    predictionHistory =
        [];


    localStorage.removeItem(
        "predictionHistory"
    );


    renderHistory();

}


// =====================================================
// EVENT LISTENERS
// =====================================================

if (matchSelect) {

    matchSelect.addEventListener(
        "change",
        handleMatchSelection
    );

}


if (ballSelect) {

    ballSelect.addEventListener(
        "change",
        handleBallSelection
    );

}


if (predictButton) {

    predictButton.addEventListener(
        "click",
        predictWinProbability
    );

}


if (clearHistoryButton) {

    clearHistoryButton.addEventListener(
        "click",
        clearHistory
    );

}


// =====================================================
// REPLAY EVENT LISTENERS
// =====================================================

if (previousBallButton) {

    previousBallButton.addEventListener(
        "click",
        showPreviousReplayBall
    );

}


if (startReplayButton) {

    startReplayButton.addEventListener(
        "click",
        startReplay
    );

}


if (pauseReplayButton) {

    pauseReplayButton.addEventListener(
        "click",
        pauseReplay
    );

}


if (nextBallButton) {

    nextBallButton.addEventListener(
        "click",
        showNextReplayBall
    );

}


if (restartReplayButton) {

    restartReplayButton.addEventListener(
        "click",
        restartReplay
    );

}


if (replaySlider) {

    replaySlider.addEventListener(
        "input",
        changeReplayPosition
    );

}


if (replaySpeed) {

    replaySpeed.addEventListener(
        "change",
        changeReplaySpeed
    );

}


// =====================================================
// PAGE INITIALIZATION
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        renderHistory();

        loadMatches();

    }
);