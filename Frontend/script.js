// =====================================================
// IPL AI WIN PROBABILITY PREDICTOR
// Real IPL Match Data + Transformer Model
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
// LOAD SAVED HISTORY
// =====================================================

try {

    const savedHistory =
        localStorage.getItem("predictionHistory");

    predictionHistory =
        savedHistory
            ? JSON.parse(savedHistory)
            : [];


    if (!Array.isArray(predictionHistory)) {

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
    document.getElementById("matchSelect");

const ballSelect =
    document.getElementById("ballSelect");

const selectedMatchInfo =
    document.getElementById("selectedMatchInfo");

const matchVenue =
    document.getElementById("matchVenue");

const matchDate =
    document.getElementById("matchDate");

const matchBattingTeam =
    document.getElementById("matchBattingTeam");

const matchBowlingTeam =
    document.getElementById("matchBowlingTeam");

const predictButton =
    document.getElementById("predictButton");

const loading =
    document.getElementById("loading");

const errorBox =
    document.getElementById("error");

const result =
    document.getElementById("result");


// =====================================================
// RESULT ELEMENTS
// =====================================================

const battingTeamName =
    document.getElementById("battingTeamName");

const bowlingTeamName =
    document.getElementById("bowlingTeamName");

const battingProbability =
    document.getElementById("battingProbability");

const bowlingProbability =
    document.getElementById("bowlingProbability");

const predictionText =
    document.getElementById("predictionText");


// =====================================================
// MATCH ANALYSIS ELEMENTS
// =====================================================

const currentScoreElement =
    document.getElementById("currentScore");

const currentWicketsElement =
    document.getElementById("currentWickets");

const runsRequiredElement =
    document.getElementById("runsRequired");

const ballsRemainingElement =
    document.getElementById("ballsRemaining");

const currentRunRateElement =
    document.getElementById("currentRunRate");

const requiredRunRateElement =
    document.getElementById("requiredRunRate");

const targetElement =
    document.getElementById("targetValue");

const pressureValueElement =
    document.getElementById("pressureValue");


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

    errorBox.textContent = message;

    errorBox.style.display = "block";

}


function hideError() {

    if (!errorBox) {
        return;
    }

    errorBox.textContent = "";

    errorBox.style.display = "none";

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

    loading.style.display = "block";

}


function hideLoading() {

    if (!loading) {
        return;
    }

    loading.style.display = "none";

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


        matchSelect.innerHTML = `

            <option value="">
                Unable to load matches
            </option>

        `;


    } finally {

        hideLoading();

    }

}


// =====================================================
// POPULATE MATCH DROPDOWN
// =====================================================

function populateMatchDropdown() {

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

    result.style.display = "none";


    const matchId =
        matchSelect.value;


    ballSelect.innerHTML = `

        <option value="">
            Loading match states...
        </option>

    `;


    ballSelect.disabled = true;

    predictButton.disabled = true;


    selectedMatch = null;

    selectedState = null;

    matchStates = [];

    trendProbabilities = [];


    // Clear old trend chart
    clearTrendChart();


    if (!matchId) {

        selectedMatchInfo.style.display =
            "none";


        ballSelect.innerHTML = `

            <option value="">
                Select a match first
            </option>

        `;


        return;

    }


    // -------------------------------------------------
    // Find selected match
    // -------------------------------------------------

    selectedMatch =
        matches.find(
            match =>
                String(match.match_id) ===
                String(matchId)
        );


    if (selectedMatch) {

        displayMatchInformation(
            selectedMatch
        );

    }


    // -------------------------------------------------
    // Load match states
    // -------------------------------------------------

    await loadMatchStates(
        Number(matchId)
    );


    // -------------------------------------------------
    // Load Transformer trend
    // -------------------------------------------------

    await loadTrendProbabilities(
        Number(matchId)
    );

}


// =====================================================
// DISPLAY MATCH INFORMATION
// =====================================================

function displayMatchInformation(match) {

    matchVenue.textContent =
        match.venue || "-";


    matchDate.textContent =
        match.date || "-";


    matchBattingTeam.textContent =
        match.batting_team || "-";


    matchBowlingTeam.textContent =
        match.bowling_team || "-";


    selectedMatchInfo.style.display =
        "block";

}


// =====================================================
// LOAD MATCH STATES
// =====================================================

async function loadMatchStates(matchId) {

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
            data.status !== "success"
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


        ballSelect.innerHTML = `

            <option value="">
                Unable to load match states
            </option>

        `;


    } finally {

        hideLoading();

    }

}


// =====================================================
// POPULATE BALL DROPDOWN
// =====================================================

function populateBallDropdown() {

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


    ballSelect.disabled = false;

}


// =====================================================
// MATCH STATE SELECTED
// =====================================================

function handleBallSelection() {

    hideError();

    result.style.display = "none";


    const legalBall =
        Number(
            ballSelect.value
        );


    if (
        !Number.isFinite(legalBall) ||
        !ballSelect.value
    ) {

        selectedState = null;

        predictButton.disabled = true;

        resetAnalysis();

        return;

    }


    selectedState =
        matchStates.find(
            state =>
                Number(
                    state.legal_balls
                ) === legalBall
        );


    if (!selectedState) {

        showError(
            "Could not find the selected match state."
        );


        predictButton.disabled = true;

        return;

    }


    updateAnalysisFromState(
        selectedState
    );


    predictButton.disabled = false;

}


// =====================================================
// UPDATE ANALYSIS
// =====================================================

function updateAnalysisFromState(state) {

    currentScoreElement.textContent =
        state.score;


    currentWicketsElement.textContent =
        state.wickets_lost;


    runsRequiredElement.textContent =
        state.runs_required;


    ballsRemainingElement.textContent =
        state.balls_remaining;


    currentRunRateElement.textContent =
        Number(
            state.current_run_rate
        ).toFixed(2);


    requiredRunRateElement.textContent =
        Number(
            state.required_run_rate
        ).toFixed(2);


    targetElement.textContent =
        state.target;


    const pressure =
        calculatePressure(

            state.runs_required,

            state.balls_remaining,

            state.current_run_rate,

            state.required_run_rate

        );


    pressureValueElement.textContent =
        pressure;

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

    currentScoreElement.textContent =
        "-";


    currentWicketsElement.textContent =
        "-";


    runsRequiredElement.textContent =
        "-";


    ballsRemainingElement.textContent =
        "-";


    currentRunRateElement.textContent =
        "-";


    requiredRunRateElement.textContent =
        "-";


    targetElement.textContent =
        "-";


    pressureValueElement.textContent =
        "-";

}


// =====================================================
// LOAD REAL TRANSFORMER TREND
// =====================================================

async function loadTrendProbabilities(matchId) {

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
            data.probabilities || [];


        if (
            trendProbabilities.length === 0
        ) {

            clearTrendChart();

            throw new Error(
                "No probability trend data was returned."
            );

        }


        // -------------------------------------------------
        // Draw complete real trend
        // -------------------------------------------------

        updateTrendChart(
            trendProbabilities
        );


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


    result.style.display = "none";

    predictButton.disabled = true;


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

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

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
            data.status !== "success"
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

        battingTeamName.textContent =
            data.batting_team;


        bowlingTeamName.textContent =
            data.bowling_team;


        battingProbability.textContent =
            battingWinProbability.toFixed(2);


        bowlingProbability.textContent =
            bowlingWinProbability.toFixed(2);


        if (
            battingWinProbability >
            bowlingWinProbability
        ) {

            predictionText.textContent =
                `${data.batting_team} is more likely to win.`;

        }

        else if (
            bowlingWinProbability >
            battingWinProbability
        ) {

            predictionText.textContent =
                `${data.bowling_team} is more likely to win.`;

        }

        else {

            predictionText.textContent =
                "The match is currently evenly balanced.";

        }


        result.style.display =
            "block";


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
            predictionHistory.length > 50
        ) {

            predictionHistory =
                predictionHistory.slice(-50);

        }


        localStorage.setItem(
            "predictionHistory",
            JSON.stringify(
                predictionHistory
            )
        );


        // =================================================
        // UPDATE HISTORY TABLE
        // =================================================

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

        predictButton.disabled = false;

    }

}


// =====================================================
// CURRENT PROBABILITY CHART
// =====================================================

function updateProbabilityChart(

    battingTeamValue,

    bowlingTeamValue,

    battingProbabilityValue,

    bowlingProbabilityValue

) {

    if (
        !probabilityChartCanvas
    ) {

        return;

    }


    if (
        probabilityChart
    ) {

        probabilityChart.destroy();

    }


    probabilityChart =
        new Chart(

            probabilityChartCanvas,

            {

                type: "bar",


                data: {

                    labels: [

                        battingTeamValue,

                        bowlingTeamValue

                    ],


                    datasets: [

                        {

                            label:
                                "Win Probability (%)",

                            data: [

                                battingProbabilityValue,

                                bowlingProbabilityValue

                            ],

                            borderWidth: 1

                        }

                    ]

                },


                options: {

                    responsive: true,

                    scales: {

                        y: {

                            beginAtZero: true,

                            max: 100,

                            title: {

                                display: true,

                                text:
                                    "Win Probability (%)"

                            }

                        }

                    },


                    plugins: {

                        legend: {

                            display: false

                        }

                    }

                }

            }

        );

}


// =====================================================
// CLEAR TREND CHART
// =====================================================

function clearTrendChart() {

    if (
        trendChart
    ) {

        trendChart.destroy();

        trendChart = null;

    }

}


// =====================================================
// REAL WIN PROBABILITY TREND CHART
// =====================================================

function updateTrendChart(
    probabilities
) {

    if (
        !trendChartCanvas
    ) {

        return;

    }


    // Destroy old chart
    clearTrendChart();


    if (
        !probabilities ||
        probabilities.length === 0
    ) {

        return;

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

                type: "line",


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

                    responsive: true,

                    maintainAspectRatio: true,


                    interaction: {

                        mode: "index",

                        intersect: false

                    },


                    scales: {

                        y: {

                            beginAtZero: true,

                            max: 100,

                            title: {

                                display: true,

                                text:
                                    "Win Probability (%)"

                            }

                        },


                        x: {

                            title: {

                                display: true,

                                text:
                                    "Legal Ball"

                            },


                            ticks: {

                                // Prevent too many labels
                                autoSkip: true,

                                maxTicksLimit: 15

                            }

                        }

                    },


                    plugins: {

                        title: {

                            display: true,

                            text:
                                "Real Transformer Win Probability Trend"

                        },


                        legend: {

                            display: true,

                            position: "top"

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
// RENDER HISTORY
// =====================================================

function renderHistory() {

    historyBody.innerHTML = "";


    const reversedHistory =
        [...predictionHistory].reverse();


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


    predictionHistory = [];


    localStorage.removeItem(
        "predictionHistory"
    );


    renderHistory();

}


// =====================================================
// EVENT LISTENERS
// =====================================================

matchSelect.addEventListener(
    "change",
    handleMatchSelection
);


ballSelect.addEventListener(
    "change",
    handleBallSelection
);


predictButton.addEventListener(
    "click",
    predictWinProbability
);


clearHistoryButton.addEventListener(
    "click",
    clearHistory
);


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