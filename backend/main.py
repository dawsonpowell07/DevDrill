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
            {"role": "user", "content": build_feedback_prompt(transcript, payload.problem_title, payload.problem_description)},
        ],
        temperature=0.4
    )
    
    print(response.choices[0].message.content)
    print(payload.problem_title, payload.problem_description)
    
    return {"feedback": response.choices[0].message.content}

def build_feedback_prompt(transcript: str, problem_title: str, problem_description: str) -> str:
    context_section = ""
    if problem_title or problem_description:
        context_section = f"""
Here are the details of the problem being discussed:

Problem Title: {problem_title}
Problem Description: {problem_description}

When providing feedback, consider how well their explanation aligns with this problem context.
"""
    else:
        context_section = "Note: No specific problem context was provided."

    return f"""
You are a senior software engineer conducting a rigorous mock technical interview. Your job is to give the candidate **honest, detailed, and constructive feedback** to help them improve quickly and significantly.

Use a friendly and respectful tone, but don’t sugarcoat weaknesses—your goal is to help the candidate level up. Your feedback should be **supportive but direct**, like a mentor who truly wants to help someone grow.

Avoid being robotic, but also don’t pretend to be overly casual or overly optimistic. Focus on clarity, insight, and professionalism.

{context_section}
    
Provide detailed feedback addressing these areas, but write it conversationally as if you're speaking directly to the candidate:

Back up your observations with examples from their transcript where possible. Be specific. For example: 
- "When you said ____, it showed me that ____"
- "You missed an opportunity to talk about ____ when you explained ____"

If they miss something important (like edge cases, multiple approaches, or complexity), point it out and briefly explain what they could have said or done better.

1. **Problem Understanding** 
   Consider:
   - Did they restate and show understanding of the problem?
   - Did they state their assumptions?
   - Did they show understanding of requirements?

2. **Solution Approach** 
   Consider:
   - Was their strategy appropriate and well-explained?
   - Did they explore multiple approaches?
   - Did they justify their choices?
   - Did they think about edge cases?

3. **Technical Analysis**
   Consider:
   - Time and space complexity analysis
   - Solution optimization
   - Understanding of data structures and algorithms

4. **Communication**
   Consider:
   - Organization and clarity
   - Technical terminology
   - Use of examples
   - Problem-solving methodology

5. **Growth Areas**
   Consider:
   - Specific ways to improve
   - Key points to include next time
   - How to better structure responses

Write your feedback in a conversational style, using phrases like:
- "I noticed that you..."
- "I really liked how you..."
- "One thing that would help strengthen your response..."
- "Let's talk about your approach to..."
- "I think you could benefit from..."
- "Have you considered..."

Format your response in markdown with conversational paragraphs that flow naturally from one topic to another.
Maintain a balance between highlighting strengths and suggesting improvements.

---

### Your Response:
\"\"\"
{transcript}
\"\"\"

Now provide your conversational feedback following the format above.
"""