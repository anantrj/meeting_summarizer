# Meeting Summarizer

Upload a meeting recording and get back a transcript, key decisions, and action items — powered by local Whisper transcription and Gemini summarization.

## How it works

```
Audio/video file
      │
      ▼
Frontend (React) — upload UI
      │
      ▼
Backend (Node/Express) — receives file, saves locally
      │
      ▼
Whisper (local, via Python) — speech-to-text transcription
      │
      ▼
Gemini API — summarizes transcript into decisions + action items
      │
      ▼
Frontend displays transcript + summary
```

## Tech stack

- **Frontend**: React (Vite)
- **Backend**: Node.js, Express
- **Transcription**: OpenAI Whisper (local, via a Python subprocess)
- **Summarization**: Google Gemini API

## Project structure

```
.
├── backend/
│   ├── server.js          # Express server — upload, transcribe, summarize
│   ├── transcribe.py       # Whisper transcription script
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variable template
├── frontend/
│   └── src/
│       └── components/
│           └── MeetingSummarizer.jsx   # Main upload + results UI
└── README.md
```

## Setup

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

You'll also need **ffmpeg** installed on your system (required by Whisper):
```bash
# Mac
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

Install Node dependencies:
```bash
npm install
```

Copy the environment template and add your Gemini API key:
```bash
cp .env.example .env
```
Then edit `.env`:
```
GEMINI_API_KEY=your_key_here
```

Start the backend:
```bash
node server.js
```
Runs on `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`.

## Usage

1. Open the frontend in your browser
2. Drag in a meeting recording (mp3, wav, m4a, or mp4)
3. Click **Process recording**
4. Whisper transcribes the audio locally (this can take a few minutes for longer recordings)
5. Gemini summarizes the transcript into key decisions and action items
6. View both the summary and full transcript on screen

## Notes

- Transcription runs **locally** — no audio is sent to a third-party ASR service, only the resulting text is sent to Gemini for summarization.
- Whisper model size can be changed in `backend/transcribe.py` (`load_model("base")`) — larger models are more accurate but slower.