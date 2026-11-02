"""
MailGuard AI - Model Training and Evaluation Pipeline.

Trains TF-IDF + Multinomial Naive Bayes and Logistic Regression classifiers
on the Kaggle training dataset, evaluates on held-out test data, selects the
optimal model, and persists the pipeline and metrics.
"""

import os
import sys
import time
import json
import logging
from typing import Dict, Any, Tuple

import pandas as pd
import numpy as np
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.preprocess import clean_text

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MailGuard-Train")


def load_dataset(filepath: str, max_rows: int = None) -> pd.DataFrame:
    """Loads and sanitizes dataset from CSV using latin1 encoding and on_bad_lines='skip'."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Dataset not found at {filepath}")
    
    logger.info(f"Loading dataset from {filepath}...")
    chunks = []
    chunk_size = 50000
    total_loaded = 0
    
    for chunk in pd.read_csv(filepath, chunksize=chunk_size, encoding="latin1", on_bad_lines="skip", low_memory=False):
        if 'label' not in chunk.columns or 'text' not in chunk.columns:
            continue
            
        chunk['label_clean'] = chunk['label'].astype(str).str.strip().str.capitalize()
        valid_mask = chunk['label_clean'].isin(['Ham', 'Spam']) & chunk['text'].notna()
        valid_chunk = chunk[valid_mask][['label_clean', 'text']].copy()
        valid_chunk = valid_chunk[valid_chunk['text'].astype(str).str.strip() != '']
        
        chunks.append(valid_chunk)
        total_loaded += len(valid_chunk)
        if max_rows and total_loaded >= max_rows:
            break
            
    df = pd.concat(chunks, ignore_index=True)
    if max_rows and len(df) > max_rows:
        df = df.iloc[:max_rows]
        
    df.rename(columns={'label_clean': 'label'}, inplace=True)
    # Map label to binary: 0 = Ham (Legitimate), 1 = Spam (Positive class)
    df['target'] = df['label'].map({'Ham': 0, 'Spam': 1})
    logger.info(f"Loaded {len(df):,} valid records (Ham: {(df['target'] == 0).sum():,}, Spam: {(df['target'] == 1).sum():,})")
    return df


def evaluate_model(model, X_test_tfidf, y_test, model_name: str) -> Dict[str, Any]:
    """Calculates comprehensive classification metrics on held-out test data."""
    logger.info(f"Evaluating {model_name}...")
    start_eval = time.time()
    
    y_pred = model.predict(X_test_tfidf)
    
    if hasattr(model, "predict_proba"):
        y_prob = model.predict_proba(X_test_tfidf)[:, 1]
        roc_auc = float(roc_auc_score(y_test, y_prob))
    elif hasattr(model, "decision_function"):
        y_prob = model.decision_function(X_test_tfidf)
        roc_auc = float(roc_auc_score(y_test, y_prob))
    else:
        roc_auc = 0.0

    acc = float(accuracy_score(y_test, y_pred))
    prec_spam = float(precision_score(y_test, y_pred, pos_label=1))
    rec_spam = float(recall_score(y_test, y_pred, pos_label=1))
    f1_spam = float(f1_score(y_test, y_pred, pos_label=1))
    f1_macro = float(f1_score(y_test, y_pred, average="macro"))
    
    prec_ham = float(precision_score(y_test, y_pred, pos_label=0))
    rec_ham = float(recall_score(y_test, y_pred, pos_label=0))
    f1_ham = float(f1_score(y_test, y_pred, pos_label=0))
    
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = [int(v) for v in cm.ravel()]
    
    eval_time = time.time() - start_eval
    
    metrics = {
        "model_name": model_name,
        "evaluation_time_seconds": round(eval_time, 2),
        "accuracy": round(acc, 4),
        "precision_spam": round(prec_spam, 4),
        "recall_spam": round(rec_spam, 4),
        "f1_spam": round(f1_spam, 4),
        "f1_macro": round(f1_macro, 4),
        "roc_auc": round(roc_auc, 4),
        "precision_ham": round(prec_ham, 4),
        "recall_ham": round(rec_ham, 4),
        "f1_ham": round(f1_ham, 4),
        "confusion_matrix": {
            "true_negatives_ham": tn,
            "false_positives_ham_as_spam": fp,
            "false_negatives_spam_as_ham": fn,
            "true_positives_spam": tp,
            "matrix_2x2": [[tn, fp], [fn, tp]]
        },
        "false_positive_rate": round(fp / (fp + tn), 4) if (fp + tn) > 0 else 0.0,
        "false_negative_rate": round(fn / (fn + tp), 4) if (fn + tp) > 0 else 0.0
    }
    
    logger.info(
        f"{model_name} Results -> Accuracy: {metrics['accuracy']:.4f} | "
        f"Spam Precision: {metrics['precision_spam']:.4f} | "
        f"Spam Recall: {metrics['recall_spam']:.4f} | "
        f"Spam F1: {metrics['f1_spam']:.4f} | "
        f"ROC-AUC: {metrics['roc_auc']:.4f} | "
        f"FP: {fp} | FN: {fn}"
    )
    return metrics


def train_and_evaluate(
    train_path: str = "data/train_dataset.csv",
    test_path: str = "data/test_dataset.csv",
    output_dir: str = "backend/models",
    max_train_samples: int = None,
    max_test_samples: int = None
) -> Dict[str, Any]:
    """Runs the full training, evaluation, comparison and serialization pipeline."""
    os.makedirs(output_dir, exist_ok=True)
    total_start = time.time()
    
    # 1. Load Datasets
    train_df = load_dataset(train_path, max_rows=max_train_samples)
    test_df = load_dataset(test_path, max_rows=max_test_samples)
    
    # 2. Preprocess Text
    logger.info("Cleaning training and test text...")
    X_train_raw = train_df['text'].tolist()
    y_train = train_df['target'].values
    
    X_test_raw = test_df['text'].tolist()
    y_test = test_df['target'].values
    
    X_train_clean = [clean_text(t) for t in X_train_raw]
    X_test_clean = [clean_text(t) for t in X_test_raw]
    
    # 3. Fit TF-IDF Vectorizer ONLY on training set to prevent data leakage
    logger.info("Fitting TF-IDF Vectorizer on training data...")
    tfidf_start = time.time()
    vectorizer = TfidfVectorizer(
        max_features=40000,
        ngram_range=(1, 2),
        stop_words="english",
        sublinear_tf=True,
        min_df=2
    )
    X_train_tfidf = vectorizer.fit_transform(X_train_clean)
    X_test_tfidf = vectorizer.transform(X_test_clean)
    logger.info(f"TF-IDF fitted in {time.time() - tfidf_start:.2f}s. Vocabulary size: {len(vectorizer.vocabulary_):,}")
    
    # 4. Train Multinomial Naive Bayes
    logger.info("Training Model 1: Multinomial Naive Bayes...")
    nb_start = time.time()
    nb_clf = MultinomialNB(alpha=0.1)
    nb_clf.fit(X_train_tfidf, y_train)
    logger.info(f"Multinomial Naive Bayes trained in {time.time() - nb_start:.2f}s")
    nb_metrics = evaluate_model(nb_clf, X_test_tfidf, y_test, "Multinomial Naive Bayes")
    
    # 5. Train Logistic Regression
    logger.info("Training Model 2: Logistic Regression...")
    lr_start = time.time()
    lr_clf = LogisticRegression(
        C=2.0,
        max_iter=1000,
        random_state=42,
        class_weight="balanced",
        solver="lbfgs"
    )
    lr_clf.fit(X_train_tfidf, y_train)
    logger.info(f"Logistic Regression trained in {time.time() - lr_start:.2f}s")
    lr_metrics = evaluate_model(lr_clf, X_test_tfidf, y_test, "Logistic Regression")
    
    # 6. Model Comparison & Selection
    # Select model based on F1-Score and False Positive Rate balance
    # In email filtering, avoiding False Positives (blocking legitimate emails) while maintaining high Recall is critical.
    if lr_metrics['f1_spam'] >= nb_metrics['f1_spam'] and lr_metrics['false_positive_rate'] <= nb_metrics['false_positive_rate'] * 1.5:
        selected_model = lr_clf
        selected_name = "Logistic Regression"
        selected_metrics = lr_metrics
        selection_reason = (
            "Logistic Regression achieved superior F1-score with well-calibrated class probability estimates "
            "and a lower/comparable false positive rate on legitimate emails."
        )
    else:
        selected_model = nb_clf
        selected_name = "Multinomial Naive Bayes"
        selected_metrics = nb_metrics
        selection_reason = (
            "Multinomial Naive Bayes demonstrated outstanding recall and precision with ultra-fast inference speed."
        )
        
    logger.info(f"Selected Primary Model: {selected_name}")
    logger.info(f"Selection Reason: {selection_reason}")
    
    # 7. Build and Save Production Pipeline
    # Include both vectorizer and selected classifier inside a unified Scikit-Learn Pipeline
    production_pipeline = Pipeline([
        ('tfidf', vectorizer),
        ('clf', selected_model)
    ])
    
    pipeline_metadata = {
        "model_name": selected_name,
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "classes": ["Ham", "Spam"],
        "class_mapping": {"Ham": 0, "Spam": 1},
        "train_samples": len(train_df),
        "test_samples": len(test_df),
        "vocab_size": len(vectorizer.vocabulary_),
        "metrics": selected_metrics
    }
    
    pipeline_save_path = os.path.join(output_dir, "mailguard_pipeline.joblib")
    joblib.dump(
        {"pipeline": production_pipeline, "metadata": pipeline_metadata},
        pipeline_save_path,
        compress=3
    )
    logger.info(f"Saved production pipeline to {pipeline_save_path}")
    
    # Save complete evaluation metrics JSON for both models
    summary = {
        "evaluation_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "dataset_info": {
            "train_file": train_path,
            "test_file": test_path,
            "train_rows_used": len(train_df),
            "test_rows_used": len(test_df),
            "train_ham_count": int((train_df['target'] == 0).sum()),
            "train_spam_count": int((train_df['target'] == 1).sum()),
            "test_ham_count": int((test_df['target'] == 0).sum()),
            "test_spam_count": int((test_df['target'] == 1).sum()),
            "positive_class": "Spam (1)",
            "negative_class": "Ham (0)",
            "positive_class_convention": "Spam is treated as positive class (1); Ham is negative (0). Precision and Recall refer to identifying Spam."
        },
        "selected_model": selected_name,
        "selection_reason": selection_reason,
        "models": {
            "multinomial_nb": nb_metrics,
            "logistic_regression": lr_metrics
        },
        "total_training_duration_seconds": round(time.time() - total_start, 2)
    }
    
    metrics_path = os.path.join(output_dir, "evaluation_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(summary, f, indent=2)
    logger.info(f"Saved evaluation metrics to {metrics_path}")
    
    return summary


if __name__ == "__main__":
    train_and_evaluate()
