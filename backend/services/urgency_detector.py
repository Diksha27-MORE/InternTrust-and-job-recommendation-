import re

class UrgencyDetector:
    """
    Urgency pattern detection service.
    Identifies high-pressure tactics and urgency expressions in job descriptions.
    """
    
    def __init__(self):
        self.urgency_patterns = {
            'limited_seats': [
                r'limited\s+seats',
                r'only\s+\d+\s+positions',
                r'limited\s+positions',
                r'urgent\s+hiring',
                r'fill\s+immediately'
            ],
            'immediate_joining': [
                r'immediate\s+joining',
                r'join\s+immediately',
                r'start\s+asap',
                r'no\s+notice\s+period',
                r'start\s+today',
                r'begin\s+immediately'
            ],
            'registration_fee': [
                r'registration\s+fee',
                r'processing\s+fee',
                r'joining\s+fee',
                r'pay\s+(?:for|to)\s+register',
                r'fee\s+required',
                r'investment\s+required'
            ],
            'salary_pressure': [
                r'huge\s+salary',
                r'high\s+pay',
                r'earn\s+(?:large|big)?\s+money\s+(?:fast|quick)',
                r'without\s+experience',
                r'no\s+experience\s+needed',
                r'instant\s+payment'
            ],
            'too_good': [
                r'work\s+from\s+home',
                r'part\s+time',
                r'easy\s+(?:work|job|money)',
                r'guaranteed\s+(?:offer|job)',
                r'without\s+interview',
                r'no\s+interview\s+process'
            ]
        }
    
    def analyze(self, text: str) -> float:
        """
        Analyze text for urgency and pressure tactics.
        Return risk score (0-100).
        
        Args:
            text: Job description or posting text
            
        Returns:
            Risk score between 0-100
        """
        if not text or not isinstance(text, str):
            return 0.0
        
        text_lower = text.lower()
        found_patterns = []
        
        # Check each category of urgency patterns
        for category, patterns in self.urgency_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    found_patterns.append(category)
                    break  # Only count once per category
        
        # Calculate risk based on patterns found
        risk_score = 0.0
        
        if 'registration_fee' in found_patterns:
            risk_score += 40.0  # High risk
        
        if 'immediate_joining' in found_patterns:
            risk_score += 25.0
        
        if 'limited_seats' in found_patterns:
            risk_score += 20.0
        
        if 'salary_pressure' in found_patterns:
            risk_score += 20.0
        
        if 'too_good' in found_patterns:
            risk_score += 15.0
        
        # Bonus for multiple patterns (combination increases risk)
        if len(found_patterns) >= 2:
            risk_score += 10.0
        
        if len(found_patterns) >= 3:
            risk_score += 10.0
        
        return min(risk_score, 100.0)
    
    def get_detected_patterns(self, text: str) -> list:
        """
        Return list of detected urgency patterns.
        Useful for debugging and detailed reporting.
        """
        if not text or not isinstance(text, str):
            return []
        
        text_lower = text.lower()
        detected = []
        
        for category, patterns in self.urgency_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    detected.append(category)
                    break
        
        return list(set(detected))
