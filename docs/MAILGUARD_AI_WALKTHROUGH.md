# MailGuard AI — Complete Project Walkthrough & System Tour

> **AI-Based Email Spam & Threat Classification System**  
> *A production-grade, privacy-centric cybersecurity platform pairing statistical Machine Learning (TF-IDF + Logistic Regression) with Explainable AI (XAI) and rule-based heuristics.*

---

## 1. Executive Summary & Problem Statement

Modern email threats have evolved far beyond rudimentary commercial spam. Contemporary attacks deploy sophisticated social engineering, urgent credential theft lures, and obfuscated text designed to bypass legacy keyword blocklists. 

**MailGuard AI** was engineered to solve three critical challenges in automated email filtering:
1. **The Black-Box Dilemma:** Traditional deep learning models classify emails without explaining *why*. MailGuard AI provides **token-level explainability**, highlighting influential words that tipped the decision toward spam or ham.
2. **The False Positive Danger:** In enterprise security, falsely quarantining a legitimate invoice or contract (Type I Error) can paralyze operations. MailGuard AI prioritizes an ultra-low False Positive Rate (2.29%) while maintaining a 98.61% Spam Recall.
3. **Privacy & Zero-Trust Architecture:** Many web filters upload raw emails to third-party cloud APIs. MailGuard AI runs completely **on-premises** with local inference (<15ms), direct IMAP TLS mailbox synchronization, and persistent SQLite audit storage with zero credential retention.

---

## 2. Full-Stack System Architecture

MailGuard AI follows a modular, decoupled architecture where presentation, API ingestion, heuristic rules, and machine learning inference interact seamlessly.

```
                           +-----------------------------------------------+
                           |        MailGuard AI Frontend (React 18)       |
                           |  TypeScript · Vite · Tailwind · Recharts      |
                           +-----------------------+-----------------------+
                                                   |  REST JSON / Multi-part
                                                   v
                           +-----------------------------------------------+
                           |          FastAPI Application Server           |
                           |   Pydantic Validation · Route Handlers (8000) |
                           +-------+---------------+---------------+-------+
                                   |               |               |
                +------------------+               |               +------------------+
                v                                  v                                  v
+-------------------------------+  +-------------------------------+  +-------------------------------+
|     Data Ingestion Layer      |  |    Inference Engine (ML)      |  |     Forensic Database         |
| • Single Text Payload         |  | • Scikit-learn Pipeline       |  | • Local SQLite Storage        |
| • Bulk CSV Streaming          |  | • 40k TF-IDF Vectorizer       |  | • `analysis_sessions`         |
| • RFC 822 .eml MIME Parser    |  | • Logistic Regression (L2)    |  | • `analysis_records`          |
| • IMAP SSL/TLS Connector      |  | • Token Explainability (XAI)  |  | • Cascade Session Deletion    |
+-------------------------------+  +-------------------------------+  +-------------------------------+
                                                   |
                                                   v
                                   +-------------------------------+
                                   |      Heuristic Rule Engine    |
                                   | • Urgency Keyword Scanner     |
                                   | • Financial Scam Indicators   |
                                   | • Reply-To Mismatch Detection |
                                   +-------------------------------+
```

---

## 3. Guided Feature-by-Feature Tour

### 3.1 Operational SOC Overview Dashboard (`DashboardPage.tsx`)
The primary landing view provides real-time telemetry into message flow, threat ratios, and model accuracy:
* **5 Overview Metric Cards:** Total Emails Processed, Spam Intercepted, Legitimate Messages, Operational Spam Rate (%), and Model Validation Accuracy (98.14%). All data reflects actual records from the SQLite database.
* **Interactive Recharts Visualizations:**
  * **Spam vs. Legitimate Distribution:** A donut chart illustrating proportional volume.
  * **Trend Over Sessions:** An area chart mapping historical throughput and threat trajectory across past ingestion sessions.
* **Source Filtering:** Dropdown filtering by ingestion channel (All, CSV Uploads, Live IMAP, API Batches).
* **Recent Activity Table:** Displays recent sessions with direct CSV download links.

---

### 3.2 Single Email Analyzer & Explainable AI (`SingleTestPage.tsx`)
Designed for ad-hoc inspection of suspicious text, subject headers, and sender identities:
* **Inspection Inputs:** Subject header, sender address, and message body with real-time word and character counts.
* **1-Click Test Presets:** Built-in scenarios (Lottery Scams, Phishing Alerts, Pharma Bulk Spam, and Verified Workplace Syncs) to demonstrate model discrimination instantly.
* **Verdict & Risk Gauge:** Displays classification (*Spam Detected* vs. *Legitimate Ham*), probability percentages, risk tier (*High*, *Medium*, *Low*), and confidence rating.
* **Explainable AI (XAI):**
  * **Vocabulary Weight Badges:** Identifies influential tokens pushing prediction toward Spam (`+weight`) or Ham (`-weight`).
  * **Heuristic Signal Scanner:** Matches rule-based red flags (e.g., urgency demands, wire transfer requests).
  * **Interactive Body Highlighting:** Visualizes trigger words highlighted directly inside the email body text.
* **Cybersecurity Advisory:** Clear ethical disclosure noting that machine learning outputs are probabilistic assessments and zero-trust caution is always required.

---

### 3.3 Bulk Email Ingestion & Batch CSV Pipeline (`BulkAnalysisPage.tsx`)
Engineered to process high-volume email datasets without blocking browser performance:
* **Drag-and-Drop Ingestion:** Supports files up to 25 MB with validation against non-CSV formats.
* **Data Preview & Column Mapping:**
  * Extracts and previews the first 5 rows of data before classification.
  * **Automatic column detection:** Intelligently matches columns containing `text`, `body`, `message`, `content`, or `subject`.
  * **Manual mapping:** Dropdown selectors allow users to map custom CSV headers to target classification fields.
* **Vectorized Batch Processing:** Asynchronous inference processing hundreds of messages in milliseconds.
* **Exploration Table:** Search bar, filter pills (*All*, *Spam*, *Ham*, *High Risk*), sortable table headers, and pagination (15 records per page).
* **Export Options:** Download fully classified CSV files or export a formatted Markdown summary report.

---

### 3.4 Live Mailbox & EML Forensic Security (`InboxPage.tsx`)
Connects MailGuard AI directly to incoming mail streams:
* **Direct IMAP TLS Sync:** Configured for Gmail, Outlook / Office 365, Yahoo Mail, or custom mail servers via secure IMAP SSL (Port 993).
* **Connection Testing:** "Test Connection" button tests authentication and verifies available inbox folders.
* **Zero Credential Retention:** Passwords and tokens are used exclusively in-memory during active network handshakes and are never stored on disk.
* **1-Click Stream Simulation:** Generates synthetic inbox mailstreams for live demonstrations when credentials are unavailable.
* **RFC 822 `.eml` MIME Parser:**
  * Extracts transmission headers, hop counts, and message IDs.
  * Checks DKIM signature presence.
  * Flags **Reply-To domain mismatches** (e.g., From displays `paypal.com` but Reply-To points to an external server).
  * Safely enumerates attachments and embedded hyperlinks without executing payloads.

---

### 3.5 Model Performance & Evaluation (`ModelPerformancePage.tsx`)
A dedicated empirical benchmark screen showing how the production model was selected:
* **Evaluation Metrics:** Held-out benchmark metrics evaluated on 38,768 test emails:
  * Accuracy: **98.14%**
  * Precision: **96.88%**
  * Recall: **98.61%**
  * F1-Score: **98.04%**
  * ROC-AUC: **0.9979**
* **Side-by-Side Architectural Comparison:** Benchmarks the production **Logistic Regression** model against the baseline **Multinomial Naive Bayes** classifier.
* **Confusion Matrices:** Visual 2x2 heatmaps showing True Negatives (TN), False Positives (FP), False Negatives (FN), and True Positives (TP).
* **Cybersecurity Education Callout:** Explains the impact of **Type I Errors** (False Positives: legitimate emails blocked) versus **Type II Errors** (False Negatives: malicious emails admitted).
* **Zero Data Leakage Protocol:** Certifies that the 40k TF-IDF vocabulary was fitted strictly on the training partition.

---

### 3.6 Forensic Audit Archive (`HistoryPage.tsx`)
Provides a persistent compliance ledger of all analyzed batches:
* **Session Details:** Indexed list of historical sessions showing timestamp, ingestion origin, volume, spam count, and threat ratio.
* **Search & Filters:** Search by session ID, source type, or filename.
* **CSV Export:** Direct download link for any past batch.
* **Single Session Deletion:** Interactive confirmation modal to safely delete an individual session and its child records.
* **Clear All History:** Administrative modal to purge all historical data and reset dashboard counters.

---

### 3.7 Settings & Architecture (`SettingsPage.tsx`)
* **Theme Customizer:** Light mode default with dark mode toggle, and 4 accent color presets (*Executive Sky Blue*, *SaaS Indigo*, *Security Mint*, *Monochrome Slate*).
* **Technical Specifications:** Displays runtime versions (Python 3.13, Scikit-learn, FastAPI, React 18, SQLite).
* **Google OAuth 2.0 Roadmap:** Detailed configuration guide for enabling Google Cloud Console OAuth 2.0 read-only credentials.

---

## 4. Machine Learning Pipeline Highlights

| Component | Technical Implementation |
| :--- | :--- |
| **Dataset Corpus** | 193,842 curated emails (155,074 training instances, 38,768 held-out test instances) |
| **Preprocessing** | HTML stripping, case normalization, regex token cleanup, whitespace regularization |
| **Vectorization** | Scikit-learn `TfidfVectorizer` (1-2 word n-grams, sublinear term-frequency scaling) |
| **Vocabulary Size** | 40,000 highly discriminative feature dimensions |
| **Production Algorithm** | `LogisticRegression(C=1.0, max_iter=1000, penalty='l2', solver='lbfgs')` |
| **Inference Latency** | $< 15\text{ ms}$ per single message evaluation |
| **Persistence** | Joblib binary artifact (`mailguard_pipeline.joblib`, 835 KB) |

---

## 5. Live Demonstration Guide (Presentation Script)

When showcasing MailGuard AI to professors, reviewers, or team members:

1. **Step 1: The Operational Dashboard (`http://127.0.0.1:8000`)**
   * Highlight the clean Linear/Stripe SaaS design.
   * Point out the **5 Overview Cards** and explain that all statistics are dynamically queried from local SQLite sessions.
   * Point out the **Spam vs. Ham Donut Chart** and the **Trends Area Chart**.

2. **Step 2: Single Message Analysis & Explainable AI**
   * Navigate to **Single Analyzer**.
   * Click the **"🎰 Lottery Scam"** or **"🔐 Phishing Alert"** template button.
   * Click **"Analyze Message"**.
   * Show the **Verdict Card** (Spam Detected, High Risk, 99.8% probability).
   * Scroll to the **Influential Words** section to demonstrate Explainable AI: show how tokens like `lottery`, `wire`, `claim`, and `beneficiary` pushed the decision to spam.
   * Click the **"Highlights On"** toggle to show the highlighted words in the body text.

3. **Step 3: Bulk CSV Classification**
   * Navigate to **Bulk CSV Analysis**.
   * Click **"Load Demonstration Sample"**.
   * Highlight the **CSV Preview & Column Mapping** card showing the first 5 rows and detected columns.
   * Click **"Run Batch Classification"**.
   * Show the categorized table, filter by **Spam** or **High Risk**, and demonstrate sorting by probability.
   * Click **"Export Classified CSV"** or **"Summary Report"**.

4. **Step 4: Model Evaluation Benchmarks**
   * Navigate to **Model Performance**.
   * Show the **Side-by-Side Comparison Table** and the **2x2 Confusion Matrices**.
   * Explain why Logistic Regression was selected over Naive Bayes: Logistic Regression reduced False Negatives down to **1.39%** compared to **6.56%** in Naive Bayes, preventing dangerous spam from slipping into the inbox.
