import requests
import tldextract
from urllib.parse import urlparse

class URLChecker:
    """
    URL validation service for detecting suspicious website patterns.
    Checks for suspicious TLDs, reachability, and domain reputation.
    """
    
    def __init__(self):
        self.suspicious_tlds = {
            'xyz', 'click', 'top', 'tk', 'ml', 'ga', 'cf',
            'stream', 'win', 'bid', 'download', 'review',
            'work', 'party', 'men', 'fail', 'gdn', 'trade',
            'accountant', 'cricket', 'date', 'loan', 'online',
            'faith', 'gq', 'beauty', 'repair', 'support'
        }
        
        self.timeout = 5  # Timeout for URL connectivity check
    
    def analyze(self, website: str) -> float:
        """
        Analyze website URL for red flags and return risk score (0-100).
        
        Args:
            website: URL or domain to analyze
            
        Returns:
            Risk score between 0-100
        """
        if not website or not isinstance(website, str):
            return 30.0  # Invalid URL
        
        # Normalize URL
        url = self._normalize_url(website)
        if not url:
            return 40.0  # Could not parse URL
        
        risk_score = 0.0
        
        # Check 1: Suspicious TLD detection
        if self._has_suspicious_tld(url):
            risk_score += 40.0
        
        # Check 2: Website reachability
        if not self._is_reachable(url):
            risk_score += 35.0
        
        # Check 3: Domain age and reputation (basic checks)
        if self._looks_temporary(url):
            risk_score += 15.0
        
        return min(risk_score, 100.0)
    
    def _normalize_url(self, website: str) -> str:
        """Normalize URL to standard format."""
        try:
            # Add http if no scheme
            if '://' not in website:
                website = 'http://' + website
            
            parsed = urlparse(website)
            return f"{parsed.scheme}://{parsed.netloc}"
        except:
            return None
    
    def _has_suspicious_tld(self, url: str) -> bool:
        """Check if URL uses suspicious top-level domain."""
        try:
            extracted = tldextract.extract(url)
            tld = extracted.suffix.lower().split('.')[-1]  # Get last part (e.g., 'xyz' from 'co.xyz')
            return tld in self.suspicious_tlds
        except:
            return False
    
    def _is_reachable(self, url: str) -> bool:
        """
        Check if website is reachable by sending a HEAD request.
        """
        try:
            response = requests.head(
                url,
                timeout=self.timeout,
                allow_redirects=True,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            # Accept any response code except connection errors (2xx, 3xx, 4xx are okay)
            return response.status_code < 500
        except requests.exceptions.RequestException:
            # Try GET as fallback
            try:
                response = requests.get(
                    url,
                    timeout=self.timeout,
                    allow_redirects=True,
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'},
                    stream=True
                )
                return response.status_code < 500
            except:
                return False
    
    def _looks_temporary(self, url: str) -> bool:
        """
        Check for signs of temporary/throwaway hosting.
        """
        try:
            extracted = tldextract.extract(url)
            domain = extracted.domain.lower()
            
            # Check for common temporary domain patterns
            temporary_patterns = [
                'temp', 'test', 'demo', 'example', 'localhost',
                'tmp', 'staging', 'dev', 'phishing'
            ]
            
            for pattern in temporary_patterns:
                if pattern in domain:
                    return True
            
            return False
        except:
            return False
