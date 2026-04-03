# 💎 SalesIQ Pro — Advanced AI Sales Intelligence Platform
## React + PHP + MySQL + Python ML/AI

---

## 🚀 Features

| Module | Description |
|--------|-------------|
| 🧠 **AI Root Cause Analyzer** | Detects WHY sales dropped — price, stock, season, competition |
| 🔮 **Multi-Factor Prediction** | ML forecast using season, festival, day-of-week, campaigns |
| 👥 **Customer Intelligence** | Segments customers: Loyal, Premium, One-Time, At-Risk |
| ⚠️ **Smart Risk Score** | 0–100 risk score per product with AI recommendations |
| 🎯 **What-If Simulation** | Price change, campaign ROI, stock shortage simulation |
| 📊 **Dashboard** | Live KPIs, revenue trends, alerts |
| 📦 **Products** | Full CRUD product management |

---

## 🏗️ Project Structure

```
sales-intelligence/
├── frontend/               # React App (UI)
│   ├── src/
│   │   ├── App.jsx          # Main app with navigation
│   │   ├── App.css          # Premium dark theme
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── RootCause.jsx
│   │       ├── Prediction.jsx
│   │       ├── CustomerIntelligence.jsx
│   │       ├── RiskScore.jsx
│   │       ├── WhatIfSimulation.jsx
│   │       └── Products.jsx
│   └── package.json
│
├── backend/                # PHP REST API
│   ├── config/
│   │   └── database.php    # DB config + helpers
│   └── api/
│       ├── dashboard.php   # Dashboard KPIs
│       ├── root_cause.php  # AI root cause analysis
│       ├── predict.php     # Sales prediction
│       ├── customers.php   # Customer intelligence
│       ├── risk.php        # Risk score engine
│       ├── simulate.php    # What-If simulation
│       └── products.php    # Products CRUD
│
├── ml_service/             # Python ML Service
│   ├── app.py             # Flask ML API (GradientBoosting)
│   └── requirements.txt
│
└── database/
    └── schema.sql          # MySQL tables + sample data
```

---

## ⚙️ Installation

### Step 1: MySQL Database
```sql
mysql -u root -p < database/schema.sql
```

### Step 2: PHP Backend
- Copy `backend/` to your web server (Apache/Nginx)
- Edit `backend/config/database.php`:
  ```php
  define('DB_HOST', 'localhost');
  define('DB_USER', 'your_username');
  define('DB_PASS', 'your_password');
  define('DB_NAME', 'sales_intelligence');
  ```
- Access via: `http://localhost/backend/api/dashboard.php`

### Step 3: Python ML Service (Optional but recommended)
```bash
cd ml_service
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000
```

### Step 4: React Frontend
```bash
cd frontend
npm install
# For development:
npm start

# For production build:
npm run build
# Deploy `build/` folder to web server
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard.php` | GET | Dashboard KPIs |
| `/api/products.php` | GET/POST/PUT/DELETE | Product CRUD |
| `/api/root_cause.php` | POST | AI root cause analysis |
| `/api/predict.php` | POST | Multi-factor prediction |
| `/api/customers.php` | GET | Customer segments |
| `/api/risk.php` | GET | Risk scores for all products |
| `/api/simulate.php` | POST | What-If simulation |

### Example API calls:

**Root Cause Analysis:**
```json
POST /api/root_cause.php
{ "product_id": 7, "period": 30 }
```

**Prediction:**
```json
POST /api/predict.php
{ "product_id": 1 }
```

**What-If Simulation:**
```json
POST /api/simulate.php
{
  "product_id": 1,
  "scenario": "price_change",
  "change_percent": 10
}
```

---

## 🤖 ML Models Used

| Model | Use Case |
|-------|----------|
| **Gradient Boosting Regressor** | Sales forecasting (30-day) |
| **Random Forest** | Risk factor classification |
| **K-Means Clustering** | Customer segmentation |
| **Price Elasticity Model** | What-If price simulations |

---

## 🎨 Tech Stack

- **Frontend:** React 18, Recharts, React Router
- **Backend:** PHP 8.x, MySQL 8.x
- **ML Service:** Python 3.10+, Flask, scikit-learn, pandas, numpy
- **Design:** Custom dark theme, Google Fonts (Syne + DM Mono + Inter)

---

## 📱 Screenshots

The platform features:
- Premium dark theme with cyan/gold accents
- Animated risk score bars
- Interactive 30-day forecast charts
- Drag-slider What-If simulation controls
- Expandable risk factor cards
- Customer segment click-to-expand recommendations

---

## 🔧 Configuration

Edit `frontend/src/App.jsx` to change API base URL:
```js
export const API_BASE = 'http://your-server.com/backend/api';
```

---

## 📞 Support

Built with ❤️ using React + PHP + MySQL + scikit-learn ML
