from pydantic import BaseModel
from typing import List, Optional

class FeedbackRequest(BaseModel):
    current_transcript: str
    previous_transcripts: Optional[List[str]] = None  # Optional memory context