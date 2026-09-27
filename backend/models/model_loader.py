import hashlib
import re

try:
    import torch
except ImportError:
    torch = None

class ModelLoader:
    def __init__(self):
        print("Loading NLP Embedding Model...")
        self.device = "cuda" if torch and torch.cuda.is_available() else "cpu"
        try:
            if torch is None:
                raise ImportError("PyTorch is not installed")

            # Check torch version
            if torch.__version__ < "2.4":
                print("Disabling PyTorch because PyTorch >= 2.4 is required but found", torch.__version__)
                raise ImportError("PyTorch version too low")
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(
                "sentence-transformers/all-MiniLM-L6-v2",
                device=self.device
            )
            print("Model Loaded Successfully!")
        except Exception as e:
            print(f"Failed to load model: {e}")
            self.model = None

    def get_embedding(self, text: str):
        if self.model is None:
            vector = [0.0] * 384
            tokens = re.findall(r"[a-z0-9]+", str(text).lower())
            for token in tokens:
                digest = hashlib.sha256(token.encode("utf-8")).digest()
                index = int.from_bytes(digest[:4], "big") % len(vector)
                vector[index] += 1.0
            return vector
        return self.model.encode(text)
