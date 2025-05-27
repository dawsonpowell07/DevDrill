from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import tempfile
import os
from dotenv import load_dotenv
from models.feedback import FeedbackRequest

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

TRANSCRIPTION_PROMPT = (
    "The following audio is a candidate's spoken explanation of a coding problem solution "
    "in a mock technical interview. The candidate describes their approach, algorithm, time and space complexity, "
    "edge cases, and tests. Focus on transcribing the explanation clearly and accurately, "
    "capturing technical terminology and reasoning structure. The goal is to provide a clean transcript "
    "suitable for expert-level critique of communication clarity, problem-solving strategy, and computational analysis."
)

@app.get("/")
async def root():
    return {"status": "ok"}

@app.post("/transcribe")
async def transcribe_audio(request: Request, file: UploadFile = File(...)):
    # Log request headers and content-type
    # print("Headers:", request.headers)
    # print("Content-Type:", request.headers.get("content-type"))
    # print("Filename:", file.filename)
    # print("Content type of file:", file.content_type)

    # Save uploaded audio to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    # Transcribe with OpenAI
    with open(tmp_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="gpt-4o-transcribe", 
            file=audio_file,
            prompt=TRANSCRIPTION_PROMPT
        )
    print(transcription.text)
    return {"transcription": transcription.text}



@app.post("/generate-feedback")
async def generate_feedback(payload: FeedbackRequest):
    transcript = payload.current_transcript
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a senior software engineer conducting mock technical interviews."},
            {"role": "user", "content": build_feedback_prompt(transcript)},
        ],
        temperature=0.4
    )
    
    print(response.choices[0].message.content)
    return {"feedback": response.choices[0].message.content}

def build_feedback_prompt(transcript: str) -> str:
    return f"""
You are acting as a senior software engineer conducting a mock coding interview. 
Analyze the candidate's spoken explanation of a coding problem solution.

Provide detailed feedback in the following structure:

1. **Problem Understanding** – Does the candidate clearly state what the problem is?
2. **Approach** – Do they explain their strategy well? Are they using an appropriate algorithm?
3. **Time & Space Complexity** – Did they analyze the complexity correctly and completely?
4. **Communication Clarity** – Was their explanation organized and easy to follow?
5. **Suggestions for Improvement** – Specific tips to improve their interview response.

---

### Transcript:
\"\"\"
{transcript}
\"\"\"

Now return a structured markdown response following the format above.
"""