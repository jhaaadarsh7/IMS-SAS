# Mathematical Foundation: ML Demand Forecasting

This document outlines the mathematical formulas and logic used in the "Gradient Boosting-style" Node.js forecasting engine.

---

## 1. Feature Engineering (The Input Vector)

The algorithm transforms raw time-series data $Y = \{y_1, y_2, \dots, y_t\}$ into a supervised learning dataset. For any day $t$, the feature vector $X_t$ is calculated using only data from $y_{1}$ to $y_{t-1}$ to prevent data leakage.

### A. Lag Features
Captures autocorrelation and periodicity.
*   **Lag 1:** $L_{1,t} = y_{t-1}$
*   **Lag 7:** $L_{7,t} = y_{t-7}$ (Weekly pattern)
*   **Lag 14:** $L_{14,t} = y_{t-14}$
*   **Lag 30:** $L_{30,t} = y_{t-30}$ (Monthly pattern)

### B. Rolling Statistics
Captures local trend and volatility.
*   **Rolling Mean ($k$ days):** 
    $$\mu_{k,t} = \frac{1}{k} \sum_{i=1}^{k} y_{t-i}$$
*   **Rolling Standard Deviation ($k$ days):**
    $$\sigma_{k,t} = \sqrt{\frac{1}{k} \sum_{i=1}^{k} (y_{t-i} - \mu_{k,t})^2}$$
    *Note: Used for windows of 7 and 30 days to measure demand stability.*

### C. Calendar Features
*   **Weekend Flag:** $W_t \in \{0, 1\}$
*   **Sin/Cos Encoding (Cyclical):** While current implementation uses raw integers for Month/Day, cyclical encoding can be represented as:
    $$f_{sin} = \sin\left(\frac{2\pi \cdot \text{day}}{365}\right), \quad f_{cos} = \cos\left(\frac{2\pi \cdot \text{day}}{365}\right)$$

---

## 2. The Model: Random Forest Regression

The "Gradient Boosting-style" approach uses an ensemble of **Decision Trees**.

### A. Decision Tree Splitting
For each node in a tree, the algorithm finds the feature $j$ and threshold $s$ that minimizes the **Mean Squared Error (MSE)**:
$$\text{MSE} = \sum_{i \in R_1} (y_i - \hat{y}_{R1})^2 + \sum_{i \in R_2} (y_i - \hat{y}_{R2})^2$$
Where $R_1$ and $R_2$ are the subsets of data created by the split, and $\hat{y}$ is the mean of the target values in that subset.

### B. Ensemble Averaging (Bagging)
The final prediction $\hat{y}_t$ is the average of $N$ individual trees ($N=100$):
$$\hat{y}_t = \frac{1}{N} \sum_{n=1}^{N} f_n(X_t)$$
Where $f_n(X_t)$ is the prediction from the $n$-th tree.

---

## 3. Accuracy Metrics (Backtesting)

The model splits history (80% Train / 20% Validation) to calculate performance.

*   **Mean Absolute Error (MAE):** 
    $$\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} |y_i - \hat{y}_i|$$
*   **Root Mean Squared Error (RMSE):** 
    $$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2}$$
*   **Weighted Absolute Percentage Error (WAPE):**
    $$\text{WAPE} = \frac{\sum_{i=1}^{n} |y_i - \hat{y}_i|}{\sum_{i=1}^{n} y_i} \times 100$$

---

## 4. Recursive Prediction Logic

To forecast $H$ days into the future:
1.  Predict $\hat{y}_{T+1}$ using features $X_{T+1}$.
2.  Update the history: $Y' = \{y_1, \dots, y_T, \hat{y}_{T+1}\}$.
3.  Calculate $X_{T+2}$ using $Y'$.
4.  Repeat for $h = 1 \dots H$.

---

## 5. Inventory Optimization Logic

The forecast output is converted into actionable inventory decisions.

*   **Safety Stock ($SS$):**
    $$SS = Z \times \sigma_{forecast} \times \sqrt{LT}$$
    Where:
    *   $Z$ = Service level factor (1.65 for 95% service level).
    *   $\sigma_{forecast}$ = Standard deviation of the predicted daily demand.
    *   $LT$ = Lead Time (days).

*   **Reorder Point ($ROP$):**
    $$ROP = (\text{Total Forecasted Demand over } LT) + SS$$

*   **Suggested Order Quantity ($Q$):**
    $$Q = \max(0, ROP - \text{Current Stock})$$
