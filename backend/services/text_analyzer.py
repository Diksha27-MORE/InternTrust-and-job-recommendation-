from sklearn.metrics.pairwise import cosine_similarity
from models.model_loader import ModelLoader

class TextAnalyzer:
    def __init__(self):
        print("Initializing Advanced Text Analyzer...")
        self.model_loader = ModelLoader()

        self.scam_patterns = [
            "Pay registration fee to get internship",
            "Guaranteed job offer without interview",
            "Immediate joining with high salary no experience required",
            "Limited seats apply fast",
            "Work from home and earn huge money instantly"
        ]

        self.scam_embeddings = [
            self.model_loader.get_embedding(text)
            for text in self.scam_patterns
        ]

    def analyze(self, text: str):
        job_embedding = self.model_loader.get_embedding(text)

        similarities = [
            cosine_similarity(
                [job_embedding],
                [scam_embedding]
            )[0][0]
            for scam_embedding in self.scam_embeddings
        ]

        max_similarity = max(similarities)
        risk_score = float(max_similarity * 100)

        return round(min(risk_score, 100), 2)