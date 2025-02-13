from fastapi import FastAPI, Form
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from twilio.twiml.messaging_response import MessagingResponse
import requests
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
import googlemaps
from io import BytesIO
from PIL import Image
from twilio.rest import Client
import google.generativeai as genai
import json

load_dotenv()

# Load API keys
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Initialize Twilio Client
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Firestore
cred = credentials.Certificate("C:\\Users\\yugay\\Downloads\\ecovoice-8dff0-firebase-adminsdk-fbsvc-53923e2d9f.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize Google Maps API
gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)

# 🔴 Store user conversation progress
user_state = {}


@app.post("/whatsapp")
async def whatsapp_webhook(
    NumMedia: int = Form(0),
    MediaUrl0: str = Form(None),
    MediaContentType0: str = Form(None),
    Body: str = Form(""),
    From: str = Form("")
):
    response = MessagingResponse()

    # **Step 1: Check if it's a new user interaction**
    if From not in user_state:
        user_state[From] = {"step": "welcome"}
        show_welcome_message(response)
        return Response(str(response), media_type="application/xml")

    step = user_state[From].get("step")

    # **Step 2: Report Initiation**
    if step == "welcome":
        if "report" in Body.lower():
            user_state[From]["step"] = "select_report_type"
            ask_report_type(response)
        else:
            show_welcome_message(response)

    # **Step 3: Ask for Report Type**
    elif step == "select_report_type":
        if "text" in Body.lower():
            user_state[From]["step"] = "ask_waste_details"
            response.message("Okay! Please describe the waste:\n- Type of waste\n- Approximate quantity (Small/Medium/Large)")
        elif "voice" in Body.lower():
            user_state[From]["step"] = "awaiting_voice"
            response.message("🎙 Please send a voice note describing the waste.")
        elif "image" in Body.lower():
            user_state[From]["step"] = "awaiting_image"
            response.message("📷 Please send an image of the waste.")
        else:
            ask_report_type(response)

    # **Step 4A: Handle Voice Input**
    elif step == "awaiting_voice" and NumMedia > 0 and "audio" in MediaContentType0:
        response.message("🎙 Processing voice note with AI...")
        summary = transcribe_voice_gemini(MediaUrl0)
        user_state[From]["description"] = summary
        user_state[From]["step"] = "ask_location"
        ask_for_location(response)

    # **Step 4B: Handle Image Input**
    elif step == "awaiting_image" and NumMedia > 0 and "image" in MediaContentType0:
        response.message("📷 Processing image with AI...")
        image_summary = analyze_image_gemini(MediaUrl0)
        user_state[From]["description"] = image_summary
        user_state[From]["imageUrl"] = MediaUrl0
        user_state[From]["step"] = "ask_location"
        ask_for_location(response)

    # **Step 5: Handle Location**
    elif step == "ask_location":
        location = parse_location(Body)
        if location:
            finalize_report(From, location)
            response.message("✅ Thanks for your time! We will get the issue resolved ASAP. 🌍")
            del user_state[From]
        else:
            response.message("⚠ Location format not recognized. Please try again.")

    return Response(str(response), media_type="application/xml")


def show_welcome_message(response):
    """Send the welcome message with an interactive button."""
    response.message(
        "👋 Hi! Welcome to EcoVoice!\n\n"
        "How can we help you today? Please select an option:\n"
        "👉 *1. I want to report waste at an unwanted place*"
    )



def analyze_image_gemini(media_url):
    """Download & analyze an image using Gemini AI Vision."""
    image_data = requests.get(media_url).content
    image_bytes = BytesIO(image_data)
    img = Image.open(image_bytes)

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content([img, "Extract structured data: waste type, quantity, severity."])

    structured_data = json.loads(response.text.strip())
    return structured_data


def transcribe_voice_gemini(media_url):
    """Download audio & analyze using Gemini AI."""
    audio_data = requests.get(media_url).content
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content([
        audio_data,
        "Extract structured data: waste type, quantity, severity."
    ])
    return json.loads(response.text.strip())


def finalize_report(user_phone, location):
    """Save report to Firestore in the structured format."""
    structured_data = user_state[user_phone]["description"]
    
    # Assign points dynamically based on waste type & severity
    points = assign_points(structured_data["type"], structured_data["quantity"])

    report_data = {
        "description": structured_data["type"] + " waste",
        "type": structured_data["type"],
        "amount": structured_data["quantity"],
        "location": location,
        "points": points,
        "status": "unattended",
        "reported_by": user_phone
    }

    db.collection("reports").add(report_data)


def assign_points(waste_type, quantity):
    """Dynamically assign points based on waste type & quantity."""
    base_points = {
        "Plastic": 30,
        "Organic": 20,
        "Sewage": 40,
        "Hazardous": 50
    }
    quantity_modifier = {
        "Small": 1,
        "Medium": 1.5,
        "Large": 2
    }

    return base_points.get(waste_type, 10) * quantity_modifier.get(quantity, 1)


@app.get("/reports")
async def get_reports():
    """Fetch all reports from Firestore."""
    reports_ref = db.collection("reports").stream()
    reports = [{"id": doc.id, **doc.to_dict()} for doc in reports_ref]
    return reports