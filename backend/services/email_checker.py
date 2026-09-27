import re

class EmailChecker:
    """
    Email validation service for detecting suspicious email patterns.
    Checks for disposable domains, random usernames, and domain mismatches.
    """
    
    def __init__(self):
        # Common disposable email domains
        self.disposable_domains = {
            'tempmail.com', 'guerrillamail.com', '10minutemail.com',
            'mailinator.com', 'throwaway.email', 'temp-mail.org',
            'yopmail.com', 'maildrop.cc', 'sharklasers.com',
            'trashmail.com', 'fakeinbox.com', 'mockemail.com',
            'spam4.me', 'tempmail.de', 'mailtrap.io', 'ethereal.email'
        }
    
    def analyze(self, email: str, company_name: str = "") -> float:
        """
        Analyze email for red flags and return risk score (0-100).
        
        Args:
            email: Email address to analyze
            company_name: Expected company name for domain mismatch check
            
        Returns:
            Risk score between 0-100
        """
        if not email or not isinstance(email, str):
            return 30.0  # Invalid email format
        
        risk_score = 0.0
        
        # Check 1: Disposable domain detection
        if self._is_disposable_domain(email):
            risk_score += 50.0
        
        # Check 2: Random string username detection
        if self._has_random_username(email):
            risk_score += 30.0
        
        # Check 3: Domain mismatch with company name
        if company_name and self._is_domain_mismatch(email, company_name):
            risk_score += 20.0
        
        return min(risk_score, 100.0)
    
    def _is_disposable_domain(self, email: str) -> bool:
        """Check if email domain is in disposable domains list."""
        try:
            domain = email.split('@')[1].lower() if '@' in email else ""
            return domain in self.disposable_domains
        except:
            return False
    
    def _has_random_username(self, email: str) -> bool:
        """
        Detect if username (before @) is random strings of numbers/special chars.
        Examples: 'user123456@company.com', 'akjsdhaksjd@company.com'
        """
        try:
            username = email.split('@')[0].lower() if '@' in email else ""
            
            # Check if username is mostly numbers (random generated)
            if len(username) > 0:
                digit_ratio = sum(c.isdigit() for c in username) / len(username)
                if digit_ratio > 0.6:
                    return True
            
            # Check for random character patterns (no vowels, all special chars combined)
            if len(username) > 8:
                vowel_count = sum(1 for c in username if c.lower() in 'aeiou')
                vowel_ratio = vowel_count / len(username)
                if vowel_ratio < 0.15:  # Very few vowels = likely random
                    return True
            
            return False
        except:
            return False
    
    def _is_domain_mismatch(self, email: str, company_name: str) -> bool:
        """
        Check if domain in email matches the company name.
        Example: email is from gmail.com but company is TechCorp
        """
        try:
            email_domain = email.split('@')[1].lower() if '@' in email else ""
            company_clean = company_name.lower().replace(' ', '').replace('-', '')
            
            # Extract domain without TLD
            domain_parts = email_domain.split('.')
            domain_name = domain_parts[0] if domain_parts else ""
            
            # Check if company name appears in domain
            return company_clean not in email_domain and domain_name not in company_clean
        except:
            return False
