# 🏏 IPL AI Win Probability Prediction

An AI-powered IPL cricket analytics system that predicts the win probability of the batting and bowling teams using a Transformer-based deep learning model.

The system analyzes ball-by-ball match-state information and uses a sequence of recent legal balls to generate win-probability predictions. The trained PyTorch Transformer model is served through a Flask REST API and presented through an interactive web dashboard.

---

## 🚀 Live Demo

🌐 **Live Application:**

https://ipl-ai-win-probability-frontend.onrender.com

🔗 **Backend API:**

https://ipl-ai-win-probability.onrender.com

💻 **GitHub Repository:**

https://github.com/Vasantha2110/ipl-ai-win-probability

---

## 📌 Project Overview

IPL matches change rapidly from one ball to another. A team's winning chances depend on several factors such as:

- Current score
- Wickets lost
- Runs required
- Balls remaining
- Current run rate
- Required run rate
- Recent runs
- Recent wickets
- Target
- Current match situation

This project uses a Transformer deep learning model to analyze a sequence of recent match states and estimate the winning probability of the teams.

The prediction is displayed through an interactive dashboard along with match analytics, probability charts, trend analysis, historical replay, and prediction history.

---

## 🎯 Objectives

The main objectives of this project are:

1. Analyze IPL ball-by-ball match-state data.
2. Prepare sequential data for deep learning.
3. Develop a Transformer-based win-probability model.
4. Predict the winning probability of the batting and bowling teams.
5. Build a Flask REST API for model inference.
6. Develop an interactive web dashboard.
7. Visualize probability changes throughout a match.
8. Provide historical match replay functionality.

---

## ✨ Features

### 🤖 AI Win Probability Prediction

The system predicts the probability of winning for:

- Batting Team
- Bowling Team

The probabilities are displayed dynamically on the dashboard.

---

### 📊 Match State Analysis

The dashboard displays important match-state information including:

- Current Score
- Wickets Lost
- Runs Required
- Balls Remaining
- Current Run Rate (CRR)
- Required Run Rate (RRR)
- Target
- Match Pressure

---

### 📈 Win Probability Visualization

The application provides visual representations of the model's predictions.

#### Current Win Probability

Displays the predicted probability of both teams for the selected match state.

#### Win Probability Trend

Displays Transformer predictions across multiple legal balls to show how the estimated winning probability changes throughout the innings.

---

### 🔄 Historical Match Replay

The application provides a ball-by-ball historical replay system.

Users can:

- Start replay
- Pause replay
- Move to previous ball
- Move to next ball
- Restart replay
- Change replay speed
- Use the replay slider

The replay displays:

- Ball number
- Over
- Score
- Wickets
- Batting team
- Bowling team
- Win probabilities

---

### 📜 Prediction History

Previous predictions are stored in the browser and displayed in a prediction-history table.

The history includes:

- Match
- Over
- Score
- Wickets
- Batting team
- Bowling team
- Batting win probability
- Bowling win probability
- Match pressure
- Date and time

---

## 🧠 Machine Learning Model

The project uses a **Transformer-based deep learning architecture** implemented using PyTorch.

Instead of considering only one ball, the model receives a sequence of recent legal-ball match states.

### Model Configuration

| Parameter | Value |
|---|---:|
| Model | Transformer |
| Framework | PyTorch |
| Sequence Length | 12 legal balls |
| Input Features | 15 |
| Embedding Dimension | 64 |
| Attention Heads | 4 |
| Transformer Layers | 2 |
| Dropout | 0.1 |
| Activation | GELU |

---

## 🔢 Input Features

The model uses numerical match-state features such as:

- Over
- Legal Balls
- Balls Remaining
- Score
- Wickets Lost
- Wickets Remaining
- Target
- Runs Required
- Batter Runs
- Extras Runs
- Total Runs
- Current Run Rate
- Required Run Rate
- Recent Runs
- Recent Wickets

These features represent the current state and recent progression of an IPL innings.

---

## 🔄 Model Workflow

```text
IPL Ball-by-Ball Data
        │
        ▼
Data Cleaning & Preprocessing
        │
        ▼
Feature Extraction
        │
        ▼
Sequence Preparation
        │
        ▼
12 Legal-Ball Sequence
        │
        ▼
Transformer Model
        │
        ├── Self-Attention
        │
        ├── Transformer Layers
        │
        └── Classification
        │
        ▼
Win Probability
        │
        ▼
Flask REST API
        │
        ▼
Web Dashboard