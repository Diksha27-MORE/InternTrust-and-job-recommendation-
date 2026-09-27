"""
Configuration module for InternTrust backend.
Centralized configuration management.
"""

import os


class Config:
    """Base configuration."""
    
    # Flask settings
    DEBUG = False
    TESTING = False
    
    # API settings
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = True
    
    # Model settings
    NLP_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
    USE_GPU = True  # Automatically use CUDA if available
    
    # Risk thresholds
    LOW_RISK_THRESHOLD = 30
    MEDIUM_RISK_THRESHOLD = 60
    
    # URL checking
    URL_TIMEOUT = 5  # seconds
    MAX_REDIRECTS = 3


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True


# Configuration dictionary
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(config_name: str = None) -> Config:
    """
    Get configuration object by name.
    
    Args:
        config_name: Configuration name (development, production, testing)
    
    Returns:
        Configuration object
    """
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    return config_by_name.get(config_name, DevelopmentConfig)
