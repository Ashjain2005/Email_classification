# MailGuard AI — AI-Based Email Spam Classification System

[![Python Version](https://img.shields.io/badge/Python-3.13%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-emerald.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan.svg)](https://tailwindcss.com)
[![License: Academic](https://img.shields.io/badge/License-Academic%20Project-lightgrey.svg)]()

> **Engineering Project Title:** *"Design, Development and Implementation of an AI-Based Spam Classification System"*  
> **Application Name:** **MailGuard AI**  
> **Status:** Production-Ready & Verified on 193,842 Kaggle Benchmark Emails.

---

## 1. Project Overview

**MailGuard AI** is an email-security analysis platform engineered to protect inboxes by classifying email messages into **Legitimate (Ham)** or **Spam**. 

Unlike basic text classification demos, MailGuard AI is built as a complete software product:
- **Trained on 155,074 authentic emails** with an empirical **98.14% Accuracy** and **98.04% F1-Score**.
- **Vectorized Bulk CSV Analysis:** Ingest, analyze, search, filter, and export batches of thousands of emails in seconds.
- **Live IMAP Mailbox Sync & Scanning:** Direct TLS/SSL connection to Gmail, Outlook 365, Yahoo, or custom IMAP servers to scan inboxes in real-time with zero credential retention.
- **RFC 822 / .EML Forensic Inspector:** Upload and parse raw `.eml` email files, analyze headers for Reply-To spoofing, DKIM/SPF signatures, and hop counts.
- **AI Model Explainability:** Local feature contribution analysis displaying significant tokens (TF-IDF × Logistic Regression weights) that push predictions toward Spam or Ham.
- **Deep Email Security Inspector:** Probability breakdown (Ham vs Spam), confidence levels, risk ratings, and heuristic phishing pattern recognition.
- **Clean SaaS UI/UX:** Dual Dark/Light theme interface built with React, TypeScript, Tailwind CSS, and Lucide line icons.
- **SQLite Audit Store:** Automatically persists historical analysis sessions with privacy-preserving text snippets.
- **Future Gmail Connector:** Decoupled connector architecture designed for Google OAuth 2.0 read-only integration.

---

## 2. System Architecture

```
MailGuard-AI/
├── backend/
│   ├── app/
│   │   ├── api/              # REST endpoints (/health, /predict, /predict/csv, /metrics, /history)
│   │   ├── connectors/       # Decoupled ingestion: BaseConnector, CSVConnector, GmailConnector
│   │   ├── database/         # SQLite persistence layer (analysis_sessions, classification_records)
│   │   ├── schemas/          # Pydantic request/response validation schemas
│   │   ├── services/         # Heuristic pattern analyzer & security diagnostics
│   │   └── main.py           # FastAPI application entry point with SPA static serving
│   ├── ml/
│   │   ├── preprocess.py     # Token standardizer, URL/Currency tokenizer, escape code cleaner
│   │   ├── train.py          # TF-IDF fitting (train-only), model training, evaluation & Joblib save
│   │   ├── evaluate.py       # Metrics loader and evaluation report generator
│   │   └── predict.py        # Cached production pipeline inference engine
│   ├── models/
│   │   ├── mailguard_pipeline.joblib   # Persisted Scikit-learn Pipeline
│   │   └── evaluation_metrics.json    # Official measured benchmark report
│   └── tests/
│       ├── test_ml_pipeline.py        # Preprocessing & inference unit tests
│       └── test_api.py                # FastAPI endpoint integration tests
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI: Sidebar, Header, EmailDetailModal
│   │   ├── pages/            # Overview, Bulk Analysis, Single Tester, Performance, History, Settings
│   │   ├── services/         # Typed API client
│   │   └── types/            # TypeScript domain interfaces
│   └── dist/                 # Pre-compiled production React SPA
├── data/
│   ├── train_dataset.csv     # 155k Kaggle training dataset (261 MB)
│   ├── test_dataset.csv      # 38k Kaggle held-out evaluation dataset (64 MB)
│   └── samples/              # Sample test CSVs for quick viva demos
├── docs/
│   └── ARCHITECTURE_AND_VIVA_GUIDE.md  # Comprehensive viva prep, diagrams & FAQ
├── run_application.bat       # One-click Windows unified server launcher
├── run_backend.bat           # Backend API launcher
├── run_frontend.bat          # Vite frontend development server launcher
├── run_tests.bat             # Automated test suite launcher
└── README.md
```

---

## 3. Empirical Model Performance & Evaluation

The system was trained on `train_dataset.csv` (155,074 valid emails) and evaluated strictly on `test_dataset.csv` (38,768 held-out emails) with **zero data leakage**:

| Metric | Logistic Regression (Primary Model) | Multinomial Naive Bayes (Baseline) |
| :--- | :---: | :---: |
| **Accuracy** | **98.14%** | 96.03% |
| **Spam Precision** | **97.48%** | 98.08% |
| **Spam Recall** | **98.61%** | 93.44% |
| **Spam F1-Score** | **98.04%** | 95.70% |
| **ROC-AUC Score** | **0.9979** | 0.9953 |
| **False Positives (Ham as Spam)** | 468 (2.29%) | **335 (1.64%)** |
| **False Negatives (Spam as Ham)** | **255 (1.39%)** | 1,203 (6.56%) |

> **Class Convention:** Spam is the positive class (1); Ham is the negative class (0). Precision and Recall measure the system's effectiveness at identifying spam while avoiding false alarms on legitimate emails.

---

## 4. Quick Start Guide (Windows)

### Option A: One-Click Launch (Easiest)
Simply double-click:
```cmd
run_application.bat
```
This starts the unified FastAPI server. Open your browser and navigate to:
👉 **`http://127.0.0.1:8000`**

Both the full React UI and the REST API are served simultaneously from this address.

---

### Option B: Manual Command Line

#### 1. Start Backend API Server
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Web Application: `http://127.0.0.1:8000`
- Interactive Swagger API Docs: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

#### 2. Start Frontend Development Server (Optional)
```powershell
.\run_frontend.bat
```
*(Or `cd frontend; npm run dev`)* -> Accessible on `http://localhost:5173`.

---

## 5. Running Automated Tests

MailGuard AI includes automated test suites covering text cleaning, model persistence, vectorization, batch classification, and API routes:

```powershell
python -m pytest backend/tests/ -v
```
*(Or double-click `run_tests.bat`)*

**Result:** `22 passed in 2.46s (100% passing)`

---

## 6. How to Retrain the Model

The model is pre-trained and serialized in `backend/models/mailguard_pipeline.joblib`. To retrain on updated data:

```powershell
python backend/ml/train.py
```
This will:
1. Stream and clean `data/train_dataset.csv`.
2. Fit TF-IDF only on training text.
3. Train both Naive Bayes and Logistic Regression.
4. Measure evaluation metrics on held-out `test_dataset.csv`.
5. Serialize the winning model to `backend/models/mailguard_pipeline.joblib`.
6. Write benchmark reports to `backend/models/evaluation_metrics.json`.

---

## 7. Future Gmail API Integration

MailGuard AI separates message ingestion from classification via `BaseEmailConnector`:
- **Current Support:** CSV Ingestion Connector + Single Workbench Analyzer.
- **Future Extension:** `GmailConnector` located in `backend/app/connectors/gmail_connector.py`.
- **Protocol:** Official Google OAuth 2.0 authorization with strictly read-only scope (`https://www.googleapis.com/auth/gmail.readonly`).
- **Security:** Zero password retention, minimum necessary privilege, and non-destructive analysis (never modifies, moves, or deletes user emails).

---

## 8. College Project Report & Viva Reference

For detailed system diagrams, data flow specifications, confusion matrix explanations, and prepared viva questions, see:
📖 [docs/ARCHITECTURE_AND_VIVA_GUIDE.md](docs/ARCHITECTURE_AND_VIVA_GUIDE.md)
