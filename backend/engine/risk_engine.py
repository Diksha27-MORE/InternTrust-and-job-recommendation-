from services.text_analyzer import TextAnalyzer
from services.email_checker import EmailChecker
from services.url_checker import URLChecker
from services.urgency_detector import UrgencyDetector


class RiskEngine:
    """
    Main fraud detection engine that combines multiple signals
    to produce comprehensive risk assessment.

    This version includes a logistic regression model trained on the
    dataset in `backend/data`. It predicts the probability that a posting
    is fraudulent using engineered features (scam-text similarity, urgency
    signal, and text length) built by the SAME function used at prediction
    time, and is used as the primary risk score. Training happens at
    initialization; if the dataset is missing or malformed the model is
    silently skipped and the heuristic-only score is used instead.

    Weighting:
    - Text Similarity: 40%
    - Email Analysis: 20%
    - URL Analysis: 20%
    - Urgency Detection: 10%
    - Company Validation: 10%
    """

    # Weights for each signal
    WEIGHTS = {
        'text': 0.40,
        'email': 0.20,
        'url': 0.20,
        'urgency': 0.10,
        'company': 0.10
    }

    # Risk level thresholds
    # 0-30 -> Low, 31-60 -> Medium, 61-100 -> High
    RISK_LEVELS = {
        'low': (0, 30),
        'medium': (30, 60),
        'high': (60, 100)
    }

    # Human-readable labels for the urgency detector's pattern categories
    URGENCY_REASON_LABELS = {
        'registration_fee': 'Payment or registration fee requested',
        'immediate_joining': 'Pressure for immediate joining detected',
        'limited_seats': 'Urgent hiring / limited seats tactic detected',
        'salary_pressure': 'Unrealistic salary or "easy money" promises detected',
        'too_good': 'Guaranteed placement / no-interview claim detected',
    }

    def __init__(self):
        """Initialize all detection services and train logistic model."""
        self.text_analyzer = TextAnalyzer()
        self.email_checker = EmailChecker()
        self.url_checker = URLChecker()
        self.urgency_detector = UrgencyDetector()

        # logistic regression model (from sklearn).  If training fails,
        # the attribute remains None and downstream code will ignore it.
        self.model = None
        self._train_logistic_model()
    
    def analyze(self, title: str, description: str, email: str, website: str, company_name: str = "") -> dict:
        """
        Comprehensive fraud detection analysis.
        
        Args:
            title: Job title or posting title
            description: Full job description/posting text
            email: Contact email from posting
            website: Company website or posting URL
            company_name: Official company name (optional, for validation)
        
        Returns:
            Dictionary containing:
            {
                'final_risk_score': float (0-100),
                'risk_level': str ('Low', 'Medium', 'High'),
                'fraud_probability': float (0-1) if logistic model available,
                'signals': { ... }
            }
        """
        
        # Analyze each signal
        text_score = self._analyze_text(title, description)
        email_score = self._analyze_email(email, company_name)
        url_score = self._analyze_url(website)
        urgency_score = self._analyze_urgency(description)
        company_score = self._analyze_company(company_name)
        
        # Combine scores with weights (heuristic)
        heuristic_score = (
            text_score * self.WEIGHTS['text'] +
            email_score * self.WEIGHTS['email'] +
            url_score * self.WEIGHTS['url'] +
            urgency_score * self.WEIGHTS['urgency'] +
            company_score * self.WEIGHTS['company']
        )
        
        reasons = self._collect_reasons(
            email=email,
            website=website,
            description=description,
            title=title,
            company_name=company_name,
            text_score=text_score
        )

        # NOTE: risk_level, prediction, recommendation, and is_safe are
        # intentionally NOT set here. They are computed exactly once, at
        # the very end of this method, from whatever risk_score ends up
        # being (heuristic or model-based) - see the "SINGLE SOURCE OF
        # TRUTH" block below. This is what guarantees risk_level can never
        # disagree with risk_score.
        result = {
            'final_risk_score': round(heuristic_score, 2),
            'risk_score': round(heuristic_score, 2),
            'confidence': round(max(heuristic_score, 100 - heuristic_score), 2),
            'model_confidence': None,
            'heuristic_risk_score': round(heuristic_score, 2),
            'reasons': reasons,
            'signals': {
                'text': {
                    'score': round(text_score, 2),
                    'weight': self.WEIGHTS['text'],
                    'description': 'Similarity to known scam patterns'
                },
                'email': {
                    'score': round(email_score, 2),
                    'weight': self.WEIGHTS['email'],
                    'description': 'Email address risk assessment'
                },
                'url': {
                    'score': round(url_score, 2),
                    'weight': self.WEIGHTS['url'],
                    'description': 'Website URL and domain reputation'
                },
                'urgency': {
                    'score': round(urgency_score, 2),
                    'weight': self.WEIGHTS['urgency'],
                    'description': 'Pressure and urgency tactics detected'
                },
                'company': {
                    'score': round(company_score, 2),
                    'weight': self.WEIGHTS['company'],
                    'description': 'Company validation and legitimacy'
                }
            }
        }

        # If the trained logistic model is available, retain its fraud
        # probability as an ML signal and combine it with the other checks.
        if self.model is not None:
            try:
                features = self._extract_features(title, description)
                probabilities = self.model.predict_proba([features])[0]
                class_labels = list(self.model.classes_)
                fraud_class_index = class_labels.index(1)
                prob_fraud = float(probabilities[fraud_class_index])
                safe_confidence = 1.0 - prob_fraud

                model_risk_score = round(prob_fraud * 100, 2)
                # Keep the ML probability separate from the final assessment.
                # A weakly trained model must not erase explicit risk signals
                # detected by the independent email, URL, and text checks.
                model_confidence = round(max(prob_fraud, safe_confidence) * 100, 2)

                result['fraud_probability'] = round(prob_fraud, 4)
                result['safe_confidence'] = round(safe_confidence, 4)
                result['model_risk_score'] = model_risk_score
                result['final_risk_score'] = round(
                    max(model_risk_score, heuristic_score),
                    2
                )
                result['risk_score'] = result['final_risk_score']
                result['model_confidence'] = model_confidence
            except Exception as e:
                print(f"Error computing logistic model probability: {e}")

        # ------------------------------------------------------------------
        # SINGLE SOURCE OF TRUTH: risk_level (and everything derived from it)
        # is computed exactly once, here, from the final risk_score.
        # This line runs unconditionally, after both the heuristic path and
        # the model path above, so risk_level can never diverge from
        # risk_score - and confidence is never involved in this decision.
        #   0-30  -> Low
        #   31-60 -> Medium
        #   61-100 -> High
        # ------------------------------------------------------------------
        final_score = result['risk_score']
        # Confidence describes certainty in the final assessment, not risk
        # magnitude. It is derived only after the final score is selected.
        result['confidence'] = round(max(final_score, 100 - final_score), 2)
        result['risk_level'] = self._get_risk_level(final_score)
        result['is_safe'] = result['risk_level'] == 'Low'
        result['prediction'] = self._prediction_label(result['risk_level'])
        result['recommendation'] = self._get_recommendation(result['risk_level'])

        return result

    def _prediction_label(self, risk_level: str) -> str:
        """Human-readable verdict shown to the student."""
        return {
            'Low': 'Trustworthy',
            'Medium': 'Proceed with Caution',
            'High': 'Not Trustworthy',
        }.get(risk_level, 'Unknown')

    def _get_recommendation(self, risk_level: str) -> str:
        """Plain-language recommendation matched to the risk level."""
        return {
            'Low': 'This internship looks legitimate based on our checks. You may proceed, but always stay alert.',
            'Medium': 'Some suspicious signs were detected. Proceed with caution and verify the company independently before sharing personal details or paying any fee.',
            'High': 'Do not proceed. This posting shows strong indicators of being fraudulent.',
        }.get(risk_level, 'Review the details carefully before proceeding.')

    def _collect_reasons(self, email: str, website: str, description: str,
                          title: str, company_name: str, text_score: float) -> list:
        """
        Turn the existing detectors' own internal signals into a short,
        human-readable list of reasons. This reuses the checks each
        service already performs - no new detection logic is introduced.
        """
        reasons = []

        # Email signals (reuses EmailChecker's existing sub-checks)
        try:
            if email:
                if self.email_checker._is_disposable_domain(email):
                    reasons.append('Disposable or temporary email domain detected')
                if self.email_checker._has_random_username(email):
                    reasons.append('Suspicious, randomly generated-looking email address')
                if company_name and self.email_checker._is_domain_mismatch(email, company_name):
                    reasons.append('Email domain does not match the company name')
        except Exception:
            pass

        # URL signals (reuses URLChecker's existing sub-checks)
        try:
            if website:
                normalized = self.url_checker._normalize_url(website)
                if normalized:
                    if self.url_checker._has_suspicious_tld(normalized):
                        reasons.append('Suspicious website domain extension')
                    if not self.url_checker._is_reachable(normalized):
                        reasons.append('Website could not be verified or reached')
                    if self.url_checker._looks_temporary(normalized):
                        reasons.append('Website looks like a temporary or throwaway site')
                else:
                    reasons.append('Website/URL could not be parsed')
        except Exception:
            pass

        # Urgency / pressure-tactic signals (uses UrgencyDetector's public API)
        try:
            combined_text = f"{title} {description}"
            for pattern in self.urgency_detector.get_detected_patterns(combined_text):
                label = self.URGENCY_REASON_LABELS.get(pattern)
                if label:
                    reasons.append(label)
        except Exception:
            pass

        # Text similarity signal
        try:
            if text_score >= 50:
                reasons.append('Message closely matches known scam job-posting patterns')
        except Exception:
            pass

        # Company validation signal
        try:
            if not company_name or len(company_name.strip()) < 2:
                reasons.append('Company name is missing or could not be validated')
        except Exception:
            pass

        return reasons
    
    def _analyze_text(self, title: str, description: str) -> float:
        """Analyze text using sentence embeddings."""
        try:
            combined_text = f"{title} {description}"
            score = self.text_analyzer.analyze(combined_text)
            return float(score)
        except Exception as e:
            print(f"Error in text analysis: {e}")
            return 0.0
    
    def _analyze_email(self, email: str, company_name: str = "") -> float:
        """Analyze email for suspicious patterns."""
        try:
            score = self.email_checker.analyze(email, company_name)
            return float(score)
        except Exception as e:
            print(f"Error in email analysis: {e}")
            return 0.0
    
    def _analyze_url(self, website: str) -> float:
        """Analyze URL for suspicious patterns."""
        try:
            score = self.url_checker.analyze(website)
            return float(score)
        except Exception as e:
            print(f"Error in URL analysis: {e}")
            return 0.0
    
    def _analyze_urgency(self, description: str) -> float:
        """Detect urgency and pressure tactics."""
        try:
            score = self.urgency_detector.analyze(description)
            return float(score)
        except Exception as e:
            print(f"Error in urgency detection: {e}")
            return 0.0
    
    def _analyze_company(self, company_name: str) -> float:
        """
        Validate company legitimacy.
        This is a placeholder for future company validation API integration.
        """
        try:
            # Placeholder: Basic validation
            if not company_name or len(company_name.strip()) == 0:
                return 40.0  # No company name = higher risk
            
            if len(company_name.strip()) < 2:
                return 50.0  # Too short = suspicious
            
            # If company name exists, assume lower risk (0)
            return 0.0
        except Exception as e:
            print(f"Error in company validation: {e}")
            return 20.0
    
    def _get_risk_level(self, score: float) -> str:
        """
        Convert numeric risk score to risk level.
        
        Args:
            score: Risk score (0-100)
        
        Returns:
            Risk level: 'Low', 'Medium', or 'High'
        """
        if score <= self.RISK_LEVELS['low'][1]:
            return 'Low'
        elif score <= self.RISK_LEVELS['medium'][1]:
            return 'Medium'
        else:
            return 'High'

    # Cap on training rows sampled from the CSV. Feature extraction now
    # runs the real text-similarity and urgency detectors per row (instead
    # of a free len() call), so this keeps startup training time bounded
    # while still using the full existing dataset/training pipeline.
    MAX_TRAINING_SAMPLES = 800

    def _extract_features(self, title: str, text: str) -> list:
        """
        Build the feature vector for the logistic regression model.

        This is the SAME function used both when training on the CSV
        dataset and when scoring a live submission. Previously, training
        used len(requirements) while prediction used len(description) -
        two different, unrelated distributions - which is a large part of
        why the model was effectively guessing. Raw text length also
        carries almost no fraud signal by itself, so the features here
        reuse the app's own existing scam-detection signals instead.
        """
        combined_text = f"{title or ''} {text or ''}".strip()

        try:
            text_score = float(self.text_analyzer.analyze(combined_text))
        except Exception:
            text_score = 0.0

        try:
            urgency_score = float(self.urgency_detector.analyze(text or ''))
        except Exception:
            urgency_score = 0.0

        # Length kept only as a weak auxiliary signal, scaled to roughly
        # the same 0-100 range as the other two features.
        length_score = min(len(combined_text) / 5.0, 100.0)

        return [text_score, urgency_score, length_score]

    def _train_logistic_model(self):
        """Train a simple logistic regression on the CSV dataset."""
        try:
            import csv
            import random
            from sklearn.linear_model import LogisticRegression
            from pathlib import Path

            csv_path = Path(__file__).resolve().parent.parent / 'data' / 'Fake_Real_Job_Posting.csv'
            if not csv_path.exists():
                print("Logistic model training skipped; dataset not found.")
                return

            rows = []
            with open(csv_path, newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    fraud = str(row.get('fraudulent', '')).strip().lower()
                    if fraud in {'real', '0', 'false', 'legitimate'}:
                        target = 0
                    elif fraud in {'fake', '1', 'true', 'fraud', 'fraudulent', 'scam'}:
                        target = 1
                    else:
                        continue
                    title_val = row.get('title', '') or ''
                    # Prefer 'description' (what the live app actually
                    # analyzes); fall back to 'requirements' if a row has
                    # no description. Either way this is the SAME field
                    # semantics used at prediction time.
                    text_val = row.get('description') or row.get('requirements') or ''
                    rows.append((title_val, text_val, target))

            if len(rows) < 10:
                print("Not enough data to train logistic model.")
                return

            # Balance and cap the sample so feature extraction (which now
            # runs the real text/urgency detectors, not a free len() call)
            # completes quickly at startup, while still drawing from the
            # full existing dataset.
            rng = random.Random(42)
            rng.shuffle(rows)
            fraud_rows = [r for r in rows if r[2] == 1]
            real_rows = [r for r in rows if r[2] == 0]
            per_class_cap = max(1, self.MAX_TRAINING_SAMPLES // 2)
            sampled = fraud_rows[:per_class_cap] + real_rows[:per_class_cap]
            rng.shuffle(sampled)

            if len({target for _, _, target in sampled}) < 2:
                print("Not enough class diversity to train logistic model.")
                return

            X = [self._extract_features(title_val, text_val) for title_val, text_val, _ in sampled]
            y = [target for _, _, target in sampled]

            model = LogisticRegression(max_iter=1000)
            model.fit(X, y)
            self.model = model
            print(f"Logistic regression model trained with {len(X)} rows (engineered features)")
        except Exception as e:
            print(f"Failed to train logistic regression model: {e}")
            self.model = None