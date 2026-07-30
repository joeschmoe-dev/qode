from dotenv import load_dotenv
import os

load_dotenv()

AI_ENDPOINT = os.getenv("AI_ENDPOINT", "http://aimodel.lan/v1")
AI_API_KEY = os.getenv("AI_API_KEY", "x")
AI_MODEL = os.getenv("AI_MODEL", "current")
DIFFICULTIES = ["Easy", "Medium", "Hard"]
MAX_TOKENS = 4096
