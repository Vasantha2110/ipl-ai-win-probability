// =====================================================
// IPL AI WIN PROBABILITY PREDICTOR
// Transformer Model + Flask API
// Historical Match Replay
// Chart.js Visualizations
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
// REPLAY GLOBAL VARIABLES
// =====================================================

let replayData = [];
let replayIndex = 0;

let replayTimer = null;
let replayInterval = 1000;


// =====================================================
// CHART GLOBAL VARIABLES
// =====================================================

let probabilityChart = null;
let trendChart = null;


// =====================================================
// DOM ELEMENTS
// IMPORTANT:
// These are assigned inside initializeDashboard()
// after DOM is loaded.
// =====================================================

let matchSelect;
let ballSelect;

let selectedMatchInfo;
let matchVenue;
let matchDate;
let matchBattingTeam;
let matchBowlingTeam;

let predictButton;

let loading;
let errorBox;
let result;

let battingTeamName;
let bowlingTeamName;

let battingProbability;
let bowlingProbability;

let battingProbabilityBar;
let bowlingProbabilityBar;

let predictionText;

let currentScoreElement;
let currentWicketsElement;
let runsRequiredElement;
let ballsRemainingElement;
let currentRunRateElement;
let requiredRunRateElement;
let targetElement;
let pressureValueElement;

let probabilityChartCanvas;
let trendChartCanvas;

let replaySection;
let replayBall;
let replayOver;
let replayScore;
let replayWickets;
let replayBattingTeam;
let replayBowlingTeam;
let replayBattingProbability;
let replayBowlingProbability;
let replaySlider;
let replayProgress;

let previousBallButton;
let startReplayButton;
let pauseReplayButton;
let nextBallButton;
let restartReplayButton;
let replaySpeed;

let historyBody;
let clearHistoryButton;


// =====================================================
// LOAD SAVED PREDICTION HISTORY
// =====================================================

function loadSavedHistory() {

    try {

        const savedHistory =
            localStorage.getItem(
                "predictionHistory"
            );

        if (savedHistory) {

            const parsed =
                JSON.parse(savedHistory);

            if (Array.isArray(parsed)) {

                predictionHistory = parsed;

            } else {

                predictionHistory = [];

            }

        } else {

            predictionHistory = [];

        }

    } catch (error) {

        console.error(
            "Could not load prediction history:",
            error
        );

        predictionHistory = [];

    }
}


// =====================================================
// CONNECT DOM ELEMENTS
// =====================================================

function connectDOMElements() {

    matchSelect =
        document.getElementById(
            "matchSelect"
        );

    ballSelect =
        document.getElementById(
            "ballSelect"
        );

    selectedMatchInfo =
        document.getElementById(
            "selectedMatchInfo"
        );

    matchVenue =
        document.getElementById(
            "matchVenue"
        );

    matchDate =
        document.getElementById(
            "matchDate"
        );

    matchBattingTeam =
        document.getElementById(
            "matchBattingTeam"
        );

    matchBowlingTeam =
        document.getElementById(
            "matchBowlingTeam"
        );

    predictButton =
        document.getElementById(
            "predictButton"
        );


    // -------------------------------------------------
    // Loading / Error / Result
    // -------------------------------------------------

    loading =
        document.getElementById(
            "loading"
        );

    errorBox =
        document.getElementById(
            "error"
        );

    result =
        document.getElementById(
            "result"
        );


    // -------------------------------------------------
    // Prediction Result
    // -------------------------------------------------

    battingTeamName =
        document.getElementById(
            "battingTeamName"
        );

    bowlingTeamName =
        document.getElementById(
            "bowlingTeamName"
        );

    battingProbability =
        document.getElementById(
            "battingProbability"
        );

    bowlingProbability =
        document.getElementById(
            "bowlingProbability"
        );

    battingProbabilityBar =
        document.getElementById(
            "battingProbabilityBar"
        );

    bowlingProbabilityBar =
        document.getElementById(
            "bowlingProbabilityBar"
        );

    predictionText =
        document.getElementById(
            "predictionText"
        );


    // -------------------------------------------------
    // Match Analysis
    // -------------------------------------------------

    currentScoreElement =
        document.getElementById(
            "currentScore"
        );

    currentWicketsElement =
        document.getElementById(
            "currentWickets"
        );

    runsRequiredElement =
        document.getElementById(
            "runsRequired"
        );

    ballsRemainingElement =
        document.getElementById(
            "ballsRemaining"
        );

    currentRunRateElement =
        document.getElementById(
            "currentRunRate"
        );

    requiredRunRateElement =
        document.getElementById(
            "requiredRunRate"
        );

    targetElement =
        document.getElementById(
            "targetValue"
        );

    pressureValueElement =
        document.getElementById(
            "pressureValue"
        );


    // -------------------------------------------------
    // Charts
    // -------------------------------------------------

    probabilityChartCanvas =
        document.getElementById(
            "probabilityChart"
        );

    trendChartCanvas =
        document.getElementById(
            "trendChart"
        );


    // -------------------------------------------------
    // Replay
    // -------------------------------------------------

    replaySection =
        document.getElementById(
            "replaySection"
        );

    replayBall =
        document.getElementById(
            "replayBall"
        );

    replayOver =
        document.getElementById(
            "replayOver"
        );

    replayScore =
        document.getElementById(
            "replayScore"
        );

    replayWickets =
        document.getElementById(
            "replayWickets"
        );

    replayBattingTeam =
        document.getElementById(
            "replayBattingTeam"
        );

    replayBowlingTeam =
        document.getElementById(
            "replayBowlingTeam"
        );

    replayBattingProbability =
        document.getElementById(
            "replayBattingProbability"
        );

    replayBowlingProbability =
        document.getElementById(
            "replayBowlingProbability"
        );

    replaySlider =
        document.getElementById(
            "replaySlider"
        );

    replayProgress =
        document.getElementById(
            "replayProgress"
        );

    previousBallButton =
        document.getElementById(
            "previousBallButton"
        );

    startReplayButton =
        document.getElementById(
            "startReplayButton"
        );

    pauseReplayButton =
        document.getElementById(
            "pauseReplayButton"
        );

    nextBallButton =
        document.getElementById(
            "nextBallButton"
        );

    restartReplayButton =
        document.getElementById(
            "restartReplayButton"
        );

    replaySpeed =
        document.getElementById(
            "replaySpeed"
        );


    // -------------------------------------------------
    // History
    // -------------------------------------------------

    historyBody =
        document.getElementById(
            "historyBody"
        );

    clearHistoryButton =
        document.getElementById(
            "clearHistory"
        );
}


// =====================================================
// ERROR FUNCTIONS
// =====================================================

function showError(message) {

    if (!errorBox) {
        return;
    }

    errorBox.textContent =
        message || "Something went wrong.";

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
// CHECK CHART.JS
// =====================================================

function chartJSAvailable() {

    if (
        typeof Chart === "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        showError(
            "Chart.js could not be loaded. Please check the Chart.js CDN in index.html."
        );

        return false;
    }

    return true;
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
            data.status !== "success"
        ) {

            throw new Error(
                data.error ||
                "Could not load matches."
            );

        }


        matches =
            Array.isArray(data.matches)
                ? data.matches
                : [];


        if (
            matches.length === 0
        ) {

            throw new Error(
                "No IPL matches were found."
            );

        }


        populateMatchDropdown();


        console.log(
            `Successfully loaded ${matches.length} IPL matches.`
        );

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

    clearProbabilityChart();
    clearTrendChart();

    if (result) {

        result.style.display =
            "none";

    }


    const matchId =
        matchSelect
            ? matchSelect.value
            : "";


    // -------------------------------------------------
    // RESET CURRENT STATE
    // -------------------------------------------------

    selectedMatch = null;
    selectedState = null;

    matchStates = [];
    trendProbabilities = [];

    replayData = [];
    replayIndex = 0;


    // -------------------------------------------------
    // HIDE REPLAY UNTIL DATA IS READY
    // -------------------------------------------------

    if (replaySection) {

        replaySection.style.display =
            "none";

    }


    // -------------------------------------------------
    // RESET BALL DROPDOWN
    // -------------------------------------------------

    if (ballSelect) {

        ballSelect.innerHTML = `
            <option value="">
                Loading match states...
            </option>
        `;

        ballSelect.disabled =
            true;
    }


    if (predictButton) {

        predictButton.disabled =
            true;

    }


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


    // -------------------------------------------------
    // FIND MATCH
    // -------------------------------------------------

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


    // -------------------------------------------------
    // LOAD MATCH STATES
    // -------------------------------------------------

    await loadMatchStates(
        Number(matchId)
    );


    // -------------------------------------------------
    // LOAD TRANSFORMER TREND
    // -------------------------------------------------

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

    if (!match) {
        return;
    }


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
            "Match states:",
            data
        );


        if (
            data.status !== "success"
        ) {

            throw new Error(
                data.error ||
                "Could not load match states."
            );

        }


        matchStates =
            Array.isArray(data.states)
                ? data.states
                : [];


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
            "Could not load match states. " +
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
// BALL SELECTED
// =====================================================

function handleBallSelection() {

    hideError();

    stopReplay();

    if (result) {

        result.style.display =
            "none";

    }


    const value =
        ballSelect
            ? ballSelect.value
            : "";


    if (!value) {

        selectedState = null;

        if (predictButton) {

            predictButton.disabled =
                true;

        }

        resetAnalysis();
        resetProbabilityBars();

        return;
    }


    const legalBall =
        Number(value);


    if (
        !Number.isFinite(
            legalBall
        )
    ) {

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
// UPDATE MATCH ANALYSIS
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

        const value =
            Number(
                state.current_run_rate
            );


        currentRunRateElement.textContent =
            Number.isFinite(value)
                ? value.toFixed(2)
                : "-";

    }


    if (requiredRunRateElement) {

        const value =
            Number(
                state.required_run_rate
            );


        requiredRunRateElement.textContent =
            Number.isFinite(value)
                ? value.toFixed(2)
                : "-";

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
        !Number.isFinite(runsRequired)
    ) {

        return "-";

    }


    if (runsRequired <= 0) {

        return "Won";

    }


    if (
        !Number.isFinite(ballsRemaining) ||
        ballsRemaining <= 0
    ) {

        return "Very High";

    }


    if (
        !Number.isFinite(requiredRunRate) ||
        !Number.isFinite(currentRunRate)
    ) {

        return "-";

    }


    if (
        requiredRunRate <= currentRunRate
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
        currentScoreElement.textContent = "-";
    }

    if (currentWicketsElement) {
        currentWicketsElement.textContent = "-";
    }

    if (runsRequiredElement) {
        runsRequiredElement.textContent = "-";
    }

    if (ballsRemainingElement) {
        ballsRemainingElement.textContent = "-";
    }

    if (currentRunRateElement) {
        currentRunRateElement.textContent = "-";
    }

    if (requiredRunRateElement) {
        requiredRunRateElement.textContent = "-";
    }

    if (targetElement) {
        targetElement.textContent = "-";
    }

    if (pressureValueElement) {
        pressureValueElement.textContent = "-";
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

    const batting =
        clampProbability(
            battingValue
        );

    const bowling =
        clampProbability(
            bowlingValue
        );


    if (battingProbabilityBar) {

        battingProbabilityBar.style.width =
            `${batting}%`;

    }


    if (bowlingProbabilityBar) {

        bowlingProbabilityBar.style.width =
            `${bowling}%`;

    }
}


// =====================================================
// CLAMP PROBABILITY
// =====================================================

function clampProbability(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return 0;

    }


    return Math.max(
        0,
        Math.min(
            100,
            number
        )
    );
}


// =====================================================
// LOAD TRANSFORMER TREND
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
            data.status !== "success"
        ) {

            throw new Error(
                data.error ||
                "Could not load probability trend."
            );

        }


        trendProbabilities =
            Array.isArray(
                data.probabilities
            )
                ? data.probabilities
                : [];


        if (
            trendProbabilities.length === 0
        ) {

            clearTrendChart();

            throw new Error(
                "No probability trend data was returned."
            );

        }


        // -------------------------------------------------
        // CREATE TREND CHART
        // -------------------------------------------------

        updateTrendChart(
            trendProbabilities
        );


        // -------------------------------------------------
        // CREATE REPLAY
        // -------------------------------------------------

        initializeReplay();


        console.log(
            `Loaded ${trendProbabilities.length} Transformer predictions.`
        );


    } catch (error) {

        console.error(
            "Trend loading error:",
            error
        );


        clearTrendChart();


        showError(
            "Could not load win probability trend. " +
            error.message
        );


    } finally {

        hideLoading();

    }
}


// =====================================================
// GET PROBABILITY FROM API RESPONSE
// Handles multiple possible backend field names
// =====================================================

function getBattingProbability(
    data
) {

    return Number(

        data?.batting_team_win_probability ??
        data?.batting_probability ??
        data?.batting_win_probability ??
        0

    );
}


function getBowlingProbability(
    data
) {

    return Number(

        data?.bowling_team_win_probability ??
        data?.bowling_probability ??
        data?.bowling_win_probability ??
        0

    );
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


        const response =
            await fetch(
                `${API_BASE_URL}/predict-real`,
                {

                    method: "POST",

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

            const errorText =
                await response.text();

            throw new Error(
                `Server returned HTTP ${response.status}. ${errorText}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Prediction API response:",
            data
        );


        if (
            data.status !== "success"
        ) {

            throw new Error(
                data.error ||
                "Prediction failed."
            );

        }


        const battingWinProbability =
            getBattingProbability(
                data
            );


        const bowlingWinProbability =
            getBowlingProbability(
                data
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


        // -------------------------------------------------
        // DISPLAY RESULT
        // -------------------------------------------------

        displayPredictionResult(
            data
        );


        // -------------------------------------------------
        // UPDATE ANALYSIS
        // -------------------------------------------------

        updateAnalysisFromState(
            data
        );


        // -------------------------------------------------
        // UPDATE CURRENT PROBABILITY GRAPH
        // -------------------------------------------------

        updateProbabilityChart(

            data.batting_team,

            data.bowling_team,

            battingWinProbability,

            bowlingWinProbability

        );


        // -------------------------------------------------
        // SAVE HISTORY
        // -------------------------------------------------

        savePredictionToHistory(

            data,

            battingWinProbability,

            bowlingWinProbability

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
// =====================================================

function displayPredictionResult(
    data
) {

    if (!data) {
        return;
    }


    const battingProbabilityValue =
        clampProbability(
            getBattingProbability(
                data
            )
        );


    const bowlingProbabilityValue =
        clampProbability(
            getBowlingProbability(
                data
            )
        );


    const battingTeam =
        data.batting_team ||
        "Batting Team";


    const bowlingTeam =
        data.bowling_team ||
        "Bowling Team";


    // -------------------------------------------------
    // TEAM NAMES
    // -------------------------------------------------

    if (battingTeamName) {

        battingTeamName.textContent =
            battingTeam;

    }


    if (bowlingTeamName) {

        bowlingTeamName.textContent =
            bowlingTeam;

    }


    // -------------------------------------------------
    // PROBABILITIES
    // -------------------------------------------------

    if (battingProbability) {

        battingProbability.textContent =
            battingProbabilityValue.toFixed(2);

    }


    if (bowlingProbability) {

        bowlingProbability.textContent =
            bowlingProbabilityValue.toFixed(2);

    }


    // -------------------------------------------------
    // PROBABILITY BARS
    // -------------------------------------------------

    updateProbabilityBars(

        battingProbabilityValue,

        bowlingProbabilityValue

    );


    // -------------------------------------------------
    // PREDICTION MESSAGE
    // -------------------------------------------------

    if (predictionText) {

        if (
            battingProbabilityValue >
            bowlingProbabilityValue
        ) {

            predictionText.textContent =
                `${battingTeam} is more likely to win.`;

        }

        else if (
            bowlingProbabilityValue >
            battingProbabilityValue
        ) {

            predictionText.textContent =
                `${bowlingTeam} is more likely to win.`;

        }

        else {

            predictionText.textContent =
                "The match is currently evenly balanced.";

        }

    }


    // -------------------------------------------------
    // SHOW RESULT
    // -------------------------------------------------

    if (result) {

        result.style.display =
            "block";

    }
}


// =====================================================
// CURRENT PROBABILITY BAR CHART
// =====================================================

function updateProbabilityChart(
    battingTeam,
    bowlingTeam,
    battingProbabilityValue,
    bowlingProbabilityValue
) {

    const canvas =
        probabilityChartCanvas ||
        document.getElementById(
            "probabilityChart"
        );


    if (!canvas) {

        console.warn(
            "probabilityChart canvas not found."
        );

        return;
    }


    if (
        !chartJSAvailable()
    ) {

        return;
    }


    // -------------------------------------------------
    // DESTROY OLD CHART
    // -------------------------------------------------

    if (probabilityChart) {

        probabilityChart.destroy();

        probabilityChart =
            null;

    }


    const batting =
        clampProbability(
            battingProbabilityValue
        );


    const bowling =
        clampProbability(
            bowlingProbabilityValue
        );


    // -------------------------------------------------
    // CREATE BAR CHART
    // -------------------------------------------------

    probabilityChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: [

                        battingTeam ||
                            "Batting Team",

                        bowlingTeam ||
                            "Bowling Team"

                    ],

                    datasets: [

                        {

                            label:
                                "Win Probability",

                            data: [

                                batting,

                                bowling

                            ],

                            borderWidth:
                                0,

                            borderRadius:
                                12,

                            barThickness:
                                55,

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

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    animation: {

                        duration:
                            800

                    },


                    plugins: {

                        legend: {

                            display:
                                false

                        },


                        tooltip: {

                            backgroundColor:
                                "#111827",

                            titleColor:
                                "#ffffff",

                            bodyColor:
                                "#d1d5db",

                            padding:
                                12,

                            displayColors:
                                false,


                            callbacks: {

                                label:
                                    function(
                                        context
                                    ) {

                                        return (
                                            " Win Probability: " +
                                            Number(
                                                context.parsed.y
                                            ).toFixed(1) +
                                            "%"
                                        );

                                    }

                            }

                        }

                    },


                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            max:
                                100,


                            ticks: {

                                color:
                                    "#94a3b8",

                                callback:
                                    function(
                                        value
                                    ) {

                                        return (
                                            value +
                                            "%"
                                        );

                                    }

                            },


                            grid: {

                                color:
                                    "rgba(148, 163, 184, 0.12)"

                            }

                        },


                        x: {

                            ticks: {

                                color:
                                    "#cbd5e1"

                            },


                            grid: {

                                display:
                                    false

                            }

                        }

                    }

                }

            }
        );
}


// =====================================================
// CLEAR CURRENT PROBABILITY CHART
// =====================================================

function clearProbabilityChart() {

    if (probabilityChart) {

        probabilityChart.destroy();

        probabilityChart =
            null;

    }
}


// =====================================================
// CLEAR TREND CHART
// =====================================================

function clearTrendChart() {

    if (trendChart) {

        trendChart.destroy();

        trendChart =
            null;

    }
}


// =====================================================
// REAL TRANSFORMER WIN PROBABILITY TREND
// =====================================================

function updateTrendChart(
    probabilities
) {

    const canvas =
        trendChartCanvas ||
        document.getElementById(
            "trendChart"
        );


    if (!canvas) {

        console.warn(
            "trendChart canvas not found."
        );

        return;
    }


    if (
        !chartJSAvailable()
    ) {

        return;
    }


    if (
        !Array.isArray(
            probabilities
        ) ||
        probabilities.length === 0
    ) {

        clearTrendChart();

        return;
    }


    // -------------------------------------------------
    // DESTROY OLD TREND CHART
    // -------------------------------------------------

    if (trendChart) {

        trendChart.destroy();

        trendChart =
            null;

    }


    // -------------------------------------------------
    // FILTER VALID DATA
    // -------------------------------------------------

    const validProbabilities =
        probabilities.filter(
            item =>
                item &&
                Number.isFinite(
                    Number(
                        item.legal_balls
                    )
                )
        );


    if (
        validProbabilities.length === 0
    ) {

        console.warn(
            "No valid probability data found."
        );

        return;
    }


    // -------------------------------------------------
    // LABELS
    // -------------------------------------------------

    const labels =
        validProbabilities.map(
            item =>
                `Ball ${item.legal_balls}`
        );


    // -------------------------------------------------
    // BATTING PROBABILITIES
    // -------------------------------------------------

    const battingProbabilities =
        validProbabilities.map(
            item =>
                clampProbability(

                    item.batting_team_win_probability ??
                    item.batting_probability ??
                    item.batting_win_probability ??
                    0

                )
        );


    // -------------------------------------------------
    // BOWLING PROBABILITIES
    // -------------------------------------------------

    const bowlingProbabilities =
        validProbabilities.map(
            item =>
                clampProbability(

                    item.bowling_team_win_probability ??
                    item.bowling_probability ??
                    item.bowling_win_probability ??
                    0

                )
        );


    // -------------------------------------------------
    // TEAM NAMES
    // -------------------------------------------------

    const battingTeam =
        validProbabilities[0].batting_team ||
        "Batting Team";


    const bowlingTeam =
        validProbabilities[0].bowling_team ||
        "Bowling Team";


    // -------------------------------------------------
    // UPDATE MAIN TEAM NAMES
    // -------------------------------------------------

    if (battingTeamName) {

        battingTeamName.textContent =
            battingTeam;

    }


    if (bowlingTeamName) {

        bowlingTeamName.textContent =
            bowlingTeam;

    }


    // -------------------------------------------------
    // CREATE TREND LINE CHART
    // -------------------------------------------------

    trendChart =
        new Chart(
            canvas,
            {

                type: "line",


                data: {

                    labels:
                        labels,


                    datasets: [

                        {

                            label:
                                battingTeam,

                            data:
                                battingProbabilities,

                            borderWidth:
                                3,

                            tension:
                                0.35,

                            pointRadius:
                                2,

                            pointHoverRadius:
                                6,

                            fill:
                                true,

                            backgroundColor:
                                "rgba(59, 130, 246, 0.10)",

                            borderColor:
                                "rgba(59, 130, 246, 1)"

                        },


                        {

                            label:
                                bowlingTeam,

                            data:
                                bowlingProbabilities,

                            borderWidth:
                                3,

                            tension:
                                0.35,

                            pointRadius:
                                2,

                            pointHoverRadius:
                                6,

                            fill:
                                true,

                            backgroundColor:
                                "rgba(139, 92, 246, 0.10)",

                            borderColor:
                                "rgba(139, 92, 246, 1)"

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },


                    animation: {

                        duration:
                            700

                    },


                    plugins: {

                        legend: {

                            display:
                                true,

                            position:
                                "top",


                            labels: {

                                color:
                                    "#cbd5e1",

                                padding:
                                    20,

                                usePointStyle:
                                    true

                            }

                        },


                        tooltip: {

                            backgroundColor:
                                "#111827",

                            titleColor:
                                "#ffffff",

                            bodyColor:
                                "#d1d5db",

                            padding:
                                12,


                            callbacks: {

                                title:
                                    function(
                                        context
                                    ) {

                                        if (
                                            !context ||
                                            context.length === 0
                                        ) {

                                            return "";

                                        }


                                        const index =
                                            context[0]
                                                .dataIndex;


                                        const item =
                                            validProbabilities[
                                                index
                                            ];


                                        if (!item) {

                                            return "";

                                        }


                                        return (
                                            `Ball ${item.legal_balls}` +
                                            ` | Over ${item.over ?? "-"}`
                                        );

                                    },


                                label:
                                    function(
                                        context
                                    ) {

                                        return (
                                            " " +
                                            context.dataset.label +
                                            ": " +
                                            Number(
                                                context.parsed.y
                                            ).toFixed(1) +
                                            "%"
                                        );

                                    },


                                afterBody:
                                    function(
                                        context
                                    ) {

                                        if (
                                            !context ||
                                            context.length === 0
                                        ) {

                                            return "";

                                        }


                                        const index =
                                            context[0]
                                                .dataIndex;


                                        const item =
                                            validProbabilities[
                                                index
                                            ];


                                        if (!item) {

                                            return "";

                                        }


                                        return [

                                            `Score: ${item.score ?? "-"}/${item.wickets_lost ?? "-"}`,

                                            `${item.batting_team || battingTeam} vs ${item.bowling_team || bowlingTeam}`

                                        ];

                                    }

                            }

                        }

                    },


                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            max:
                                100,


                            ticks: {

                                color:
                                    "#94a3b8",

                                callback:
                                    function(
                                        value
                                    ) {

                                        return (
                                            value +
                                            "%"
                                        );

                                    }

                            },


                            grid: {

                                color:
                                    "rgba(148, 163, 184, 0.10)"

                            },


                            title: {

                                display:
                                    true,

                                text:
                                    "Win Probability (%)",

                                color:
                                    "#94a3b8"

                            }

                        },


                        x: {

                            ticks: {

                                color:
                                    "#94a3b8",

                                maxTicksLimit:
                                    12

                            },


                            grid: {

                                display:
                                    false

                            },


                            title: {

                                display:
                                    true,

                                text:
                                    "Legal Ball",

                                color:
                                    "#94a3b8"

                            }

                        }

                    }

                }

            }
        );


    console.log(
        "Trend chart created successfully."
    );
}


// =====================================================
// HISTORICAL MATCH REPLAY
// =====================================================

function initializeReplay() {

    stopReplay();


    replayData = [];


    if (
        !Array.isArray(
            trendProbabilities
        ) ||
        trendProbabilities.length === 0
    ) {

        hideReplay();

        return;
    }


    // -------------------------------------------------
    // COMBINE MATCH STATES + PREDICTIONS
    // -------------------------------------------------

    trendProbabilities.forEach(
        prediction => {

            if (!prediction) {
                return;
            }


            const predictionBall =
                Number(
                    prediction.legal_balls
                );


            const state =
                matchStates.find(
                    item =>
                        Number(
                            item.legal_balls
                        ) ===
                        predictionBall
                );


            if (state) {

                replayData.push({

                    ...state,

                    ...prediction

                });

            }

        }
    );


    // -------------------------------------------------
    // SORT REPLAY BY BALL
    // -------------------------------------------------

    replayData.sort(
        (
            a,
            b
        ) =>
            Number(
                a.legal_balls
            ) -
            Number(
                b.legal_balls
            )
    );


    if (
        replayData.length === 0
    ) {

        hideReplay();

        console.warn(
            "Replay could not be created because no matching states were found."
        );

        return;
    }


    // -------------------------------------------------
    // SHOW REPLAY
    // -------------------------------------------------

    if (replaySection) {

        replaySection.style.display =
            "block";

    }


    replayIndex = 0;


    // -------------------------------------------------
    // SET SLIDER
    // -------------------------------------------------

    if (replaySlider) {

        replaySlider.min =
            "0";

        replaySlider.max =
            String(
                replayData.length - 1
            );

        replaySlider.value =
            "0";

        replaySlider.disabled =
            false;

    }


    // -------------------------------------------------
    // BUTTON STATES
    // -------------------------------------------------

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


    // -------------------------------------------------
    // DISPLAY FIRST BALL
    // -------------------------------------------------

    renderReplayState();


    console.log(
        `Historical replay initialized with ${replayData.length} states.`
    );
}


// =====================================================
// HIDE REPLAY
// =====================================================

function hideReplay() {

    stopReplay();


    if (replaySection) {

        replaySection.style.display =
            "none";

    }
}


// =====================================================
// RENDER REPLAY STATE
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


    // -------------------------------------------------
    // SCOREBOARD
    // -------------------------------------------------

    if (replayBall) {

        replayBall.textContent =
            item.legal_balls ?? "-";

    }


    if (replayOver) {

        replayOver.textContent =
            `Over ${item.over ?? "-"}`;

    }


    if (replayScore) {

        replayScore.textContent =
            item.score ?? "-";

    }


    if (replayWickets) {

        replayWickets.textContent =
            item.wickets_lost ?? "-";

    }


    // -------------------------------------------------
    // TEAMS
    // -------------------------------------------------

    if (replayBattingTeam) {

        replayBattingTeam.textContent =
            item.batting_team ||
            "Batting Team";

    }


    if (replayBowlingTeam) {

        replayBowlingTeam.textContent =
            item.bowling_team ||
            "Bowling Team";

    }


    // -------------------------------------------------
    // PROBABILITIES
    // -------------------------------------------------

    const battingProbabilityValue =
        clampProbability(

            item.batting_team_win_probability ??
            item.batting_probability ??
            item.batting_win_probability ??
            0

        );


    const bowlingProbabilityValue =
        clampProbability(

            item.bowling_team_win_probability ??
            item.bowling_probability ??
            item.bowling_win_probability ??
            0

        );


    if (replayBattingProbability) {

        replayBattingProbability.textContent =
            `${battingProbabilityValue.toFixed(2)}%`;

    }


    if (replayBowlingProbability) {

        replayBowlingProbability.textContent =
            `${bowlingProbabilityValue.toFixed(2)}%`;

    }


    // -------------------------------------------------
    // UPDATE MAIN RESULT
    // -------------------------------------------------

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


    // -------------------------------------------------
    // UPDATE MAIN ANALYSIS
    // -------------------------------------------------

    updateAnalysisFromState(
        item
    );


    // -------------------------------------------------
    // UPDATE MAIN BAR CHART
    // -------------------------------------------------

    updateProbabilityChart(

        item.batting_team,

        item.bowling_team,

        battingProbabilityValue,

        bowlingProbabilityValue

    );


    // -------------------------------------------------
    // UPDATE SELECTED STATE
    // -------------------------------------------------

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


    // -------------------------------------------------
    // SYNC BALL DROPDOWN
    // -------------------------------------------------

    if (
        ballSelect &&
        selectedState
    ) {

        ballSelect.value =
            selectedState.legal_balls;

    }


    // -------------------------------------------------
    // UPDATE SLIDER
    // -------------------------------------------------

    if (replaySlider) {

        replaySlider.value =
            String(
                replayIndex
            );

    }


    // -------------------------------------------------
    // UPDATE PROGRESS
    // -------------------------------------------------

    if (replayProgress) {

        replayProgress.textContent =
            `Prediction ${replayIndex + 1}` +
            ` of ${replayData.length}` +
            ` | Ball ${item.legal_balls}`;

    }


    // -------------------------------------------------
    // BUTTON STATES
    // -------------------------------------------------

    if (previousBallButton) {

        previousBallButton.disabled =
            replayIndex === 0;

    }


    if (nextBallButton) {

        nextBallButton.disabled =
            replayIndex >=
            replayData.length - 1;

    }
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


    // -------------------------------------------------
    // IF AT END, RESTART
    // -------------------------------------------------

    if (
        replayIndex >=
        replayData.length - 1
    ) {

        replayIndex = 0;

        renderReplayState();

    }


    // -------------------------------------------------
    // CLEAR OLD TIMER
    // -------------------------------------------------

    if (replayTimer !== null) {

        clearInterval(
            replayTimer
        );

        replayTimer =
            null;

    }


    // -------------------------------------------------
    // START TIMER
    // -------------------------------------------------

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
            replayData.length === 0 ||
            replayIndex >=
            replayData.length - 1;

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
// PREVIOUS BALL
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
// NEXT BALL
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


    if (
        !replayData ||
        replayData.length === 0
    ) {

        return;
    }


    replayIndex = 0;

    renderReplayState();
}


// =====================================================
// REPLAY SLIDER
// =====================================================

function changeReplayPosition() {

    pauseReplay();


    if (
        !replayData ||
        replayData.length === 0 ||
        !replaySlider
    ) {

        return;
    }


    replayIndex =
        Number(
            replaySlider.value
        );


    if (
        !Number.isFinite(
            replayIndex
        )
    ) {

        replayIndex = 0;

    }


    replayIndex =
        Math.max(
            0,
            Math.min(
                replayData.length - 1,
                replayIndex
            )
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


    const newInterval =
        Number(
            replaySpeed.value
        );


    if (
        Number.isFinite(
            newInterval
        ) &&
        newInterval > 0
    ) {

        replayInterval =
            newInterval;

    }


    const wasRunning =
        replayTimer !== null;


    if (wasRunning) {

        pauseReplay();

        startReplay();

    }
}


// =====================================================
// SAVE PREDICTION TO HISTORY
// =====================================================

function savePredictionToHistory(
    data,
    battingProbabilityValue,
    bowlingProbabilityValue
) {

    const pressure =
        calculatePressure(

            Number(
                data.runs_required
            ),

            Number(
                data.balls_remaining
            ),

            Number(
                data.current_run_rate
            ),

            Number(
                data.required_run_rate
            )

        );


    const historyItem = {

        matchId:
            data.match_id ?? "-",

        over:
            data.over ?? "-",

        legalBall:
            data.legal_balls ?? "-",

        score:
            data.score ?? "-",

        wickets:
            data.wickets_lost ?? "-",

        target:
            data.target ?? "-",

        battingTeam:
            data.batting_team ?? "-",

        bowlingTeam:
            data.bowling_team ?? "-",

        battingProbability:
            Number(
                battingProbabilityValue.toFixed(2)
            ),

        bowlingProbability:
            Number(
                bowlingProbabilityValue.toFixed(2)
            ),

        pressure:
            pressure,

        timestamp:
            new Date().toLocaleString()

    };


    predictionHistory.push(
        historyItem
    );


    // Keep latest 50
    if (
        predictionHistory.length > 50
    ) {

        predictionHistory =
            predictionHistory.slice(
                -50
            );

    }


    try {

        localStorage.setItem(

            "predictionHistory",

            JSON.stringify(
                predictionHistory
            )

        );

    } catch (error) {

        console.error(
            "Could not save prediction history:",
            error
        );

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
        (
            item,
            index
        ) => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        reversedHistory.length -
                        index
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.matchId
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.over
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.score
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.wickets
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.battingTeam
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.bowlingTeam
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.battingProbability
                    )}%
                </td>

                <td>
                    ${escapeHTML(
                        item.bowlingProbability
                    )}%
                </td>

                <td>
                    ${escapeHTML(
                        item.pressure
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.timestamp
                    )}
                </td>

            `;


            historyBody.appendChild(
                row
            );

        }
    );
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "-";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
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


    predictionHistory = [];


    localStorage.removeItem(
        "predictionHistory"
    );


    renderHistory();
}


// =====================================================
// EVENT LISTENERS
// =====================================================

function attachEventListeners() {

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


    // -------------------------------------------------
    // REPLAY EVENTS
    // -------------------------------------------------

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
}


// =====================================================
// INITIALIZE DASHBOARD
// =====================================================

async function initializeDashboard() {

    console.log(
        "IPL AI Dashboard initializing..."
    );


    // -------------------------------------------------
    // CONNECT DOM
    // -------------------------------------------------

    connectDOMElements();


    // -------------------------------------------------
    // LOAD HISTORY
    // -------------------------------------------------

    loadSavedHistory();


    // -------------------------------------------------
    // RENDER HISTORY
    // -------------------------------------------------

    renderHistory();


    // -------------------------------------------------
    // HIDE REPLAY INITIALLY
    // -------------------------------------------------

    if (replaySection) {

        replaySection.style.display =
            "none";

    }


    // -------------------------------------------------
    // RESET UI
    // -------------------------------------------------

    resetAnalysis();

    resetProbabilityBars();


    // -------------------------------------------------
    // DISABLE PREDICT UNTIL BALL SELECTED
    // -------------------------------------------------

    if (predictButton) {

        predictButton.disabled =
            true;

    }


    // -------------------------------------------------
    // ATTACH EVENTS
    // -------------------------------------------------

    attachEventListeners();


    // -------------------------------------------------
    // LOAD MATCHES
    // -------------------------------------------------

    await loadMatches();


    console.log(
        "IPL AI Dashboard initialized successfully."
    );
}


// =====================================================
// DOM READY
// =====================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard
    );

} else {

    initializeDashboard();

}