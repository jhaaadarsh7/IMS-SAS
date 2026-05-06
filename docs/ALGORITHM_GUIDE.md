# ML-Based Demand Forecasting Module

This module implements a professional-grade **Machine Learning Demand Forecasting System** using Gradient Boosting-style regression in Node.js. It replaces traditional statistical methods like Simple Exponential Smoothing (SES) with a modern, feature-rich ensemble model.

---

## 🚀 Overview
The system converts historical sales transactions into a supervised learning problem. It uses a **Random Forest Regressor** (an ensemble of 100 decision trees) to learn complex patterns, including seasonality (weekly/monthly) and trends, to predict future demand and optimize inventory levels.

---

## 🧠 How the Algorithm Works

### 1. Data Aggregation
The system fetches raw sales ledger entries (`SALE_OUT_BRANCH`) and groups them by day. 
- **Contiguous Series:** It automatically fills "gap days" (days with zero sales) to ensure the model understands the true frequency of demand.

### 2. Feature Engineering (The Mathematical Inputs)
The model doesn't "see" dates; it sees **Features**. For every day $t$, we calculate a feature vector $X_t$:

| Feature Group | Formula / Logic | What it captures |
| :--- | :--- | :--- |
| **Lags** | $L_k = \text{Sales at } (t - k)$ | Captures immediate trends (Lag 1) and seasonality (Lag 7, 30). |
| **Rolling Mean** | $\mu_k = \frac{1}{k} \sum_{i=1}^{k} \text{Sales}_{t-i}$ | Captures the "average" level of demand over 7, 14, and 30 days. |
| **Rolling Std** | $\sigma_k = \sqrt{\text{Variance}}$ | Captures the volatility or "risk" in demand. |
| **Calendar** | DayOfWeek, Month, IsWeekend | Captures human behavior (e.g., weekend spikes). |

### 3. Ensemble Model (Random Forest)
Instead of one calculation, we use **100 Decision Trees**. 
- Each tree tries to find "If/Then" rules (e.g., *If it is Friday AND the 7-day average is > 10, then expect 15 sales*).
- The final forecast is the **average** of all 100 trees, making the model highly resistant to outliers.

### 4. Recursive Prediction
To forecast 30 days ahead:
1. Predict Day 1.
2. Treat that prediction as "real history."
3. Re-calculate features (lags/means) using that prediction.
4. Predict Day 2.
5. Repeat.

---

## 📊 Understanding the Outputs

### Accuracy Metrics (Backtesting)
The system trains on 80% of data and tests on the last 20%. It provides three metrics:

1.  **MAE (Mean Absolute Error):** The average number of units the forecast is "off" by. If MAE is 5, our forecast is usually $\pm 5$ units away from reality.
2.  **RMSE (Root Mean Squared Error):** Similar to MAE but penalizes large errors more heavily. High RMSE means the model had some "big misses."
3.  **WAPE (Weighted Absolute Percentage Error):** The total error divided by total sales. A WAPE of 10% means the model is **90% accurate**.

### Inventory Decisions
The forecast is automatically converted into business logic:

*   **Safety Stock ($SS$):** Buffer stock to prevent stockouts.
    *   *Formula:* $SS = Z \times \text{Forecast\_StdDev} \times \sqrt{\text{Lead\_Time}}$
*   **Reorder Point ($ROP$):** The level at which you should place a new order.
    *   *Formula:* $ROP = \text{Demand\_During\_LeadTime} + SS$
*   **Suggested Order:** How much you should buy *right now*.
    *   *Formula:* $\max(0, ROP - \text{Current\_Stock})$

---

## 🛠️ Inputs and Parameters (API/UI)

| Input | Type | Description |
| :--- | :--- | :--- |
| `productId` | UUID | The specific item to forecast. |
| `horizonDays` | Integer | How many days into the future to predict (e.g., 7, 30, 90). |
| `serviceLevelZ` | Float | **Service Level Goal.** 1.65 (95% standard) or 2.05 (98% high-priority). |
| `leadTimeDays`| Integer | How long it takes for a new shipment to arrive. |

---

## 🎓 Why This Is Better Than SES
1.  **Automatic Seasonality:** SES requires manual "alpha" tuning; this model learns weekly patterns automatically via Lag 7.
2.  **Trend Handling:** SES often lags behind rapid trends; the Random Forest detects changes in the Rolling Mean immediately.
3.  **Context Aware:** SES doesn't know it's a Saturday. This model does, and it adjusts expectations accordingly.
4.  **Risk Management:** By using Rolling Standard Deviation, the model understands demand uncertainty, allowing for more scientific Safety Stock calculations.
