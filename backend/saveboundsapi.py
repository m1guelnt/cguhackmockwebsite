from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import json
import subprocess
import os
from chatbot import analyze_with_chatbot

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/save-bounds")
async def save_bounds(request: Request):
    data = await request.json()

    # ---- 1. Save bounds json ----
    with open("selected_bounds.json", "w") as f:
        json.dump(data, f)

    # ---- 2. Run boundsparser.py automatically ----
    try:
        subprocess.run(["python3", "boundsparser.py"], check=True)
        status = "filtered"
    except Exception as e:
        status = f"error running boundsparser: {str(e)}"

    return {"status": "ok", "saved": True, "filter_status": status}


@app.post("/chat")
async def chat(request: Request):
    """
    Chat endpoint that accepts a user message, reads the filtered CSV,
    and returns a Gemini-powered analysis.
    """
    data = await request.json()
    user_message = data.get("message", "").strip()

    if not user_message:
        return {"reply": "Please send a message."}

    # Path to the filtered CSV (same directory as this script)
    csv_filepath = os.path.join(os.path.dirname(__file__), "filtered_combined_output.csv")

    if not os.path.exists(csv_filepath):
        return {"reply": f"Error: CSV file not found at {csv_filepath}"}

    try:
        # Call the chatbot function to get the analysis
        reply = analyze_with_chatbot(user_message, csv_filepath)
        return {"reply": reply}
    except Exception as e:
        return {"reply": f"Error contacting chatbot: {str(e)}"}