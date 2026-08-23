// server.js
// Meeting Summarizer backend — local Whisper transcription + Gemini summarization
//
// CHANGES FROM ORIGINAL AWS VERSION:
//   REMOVED: AWS SDK (S3 client), presigned URL generation (/get-upload-url),
//            S3-based polling for Lambda-generated summary (/get-summary)
//   REMOVED: multer.memoryStorage() (buffer never touched disk before)
//   ADDED:   multer.diskStorage() — saves upload locally so Whisper can read the file path
//   ADDED:   spawn() call to transcribe.py (local Whisper) — replaces Lambda transcription
//   ADDED:   direct Gemini API call — replaces whatever Lambda used to call for summarization
//   KEPT:    /upload-video route name and response shape, so frontend changes are minimal
//   NEW:     synchronous flow — upload -> transcribe -> summarize -> respond in ONE request
//            (previously: upload -> poll a separate endpoint later for the result)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ---------------------------------------------------------------------------
// Local upload storage (replaces S3 input bucket + presigned URL flow)
// ---------------------------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

// ---------------------------------------------------------------------------
// Whisper transcription (replaces Lambda transcription step)
// ---------------------------------------------------------------------------
// IMPORTANT: point this at your venv's python3, not system python3,
// since Whisper was installed inside aws_video_summarizer/backend/venv
const PYTHON_PATH = path.join(__dirname, "venv", "bin", "python3");

function transcribeAudio(filePath) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(PYTHON_PATH, [
      path.join(__dirname, "transcribe.py"),
      filePath
    ]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => { stdout += data.toString(); });
    pythonProcess.stderr.on("data", (data) => { stderr += data.toString(); });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Whisper process failed: ${stderr}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.error) return reject(new Error(parsed.error));
        resolve(parsed.transcript);
      } catch (err) {
        reject(new Error(`Failed to parse Whisper output: ${stdout}`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Gemini summarization (replaces whatever Lambda used to call)
// ---------------------------------------------------------------------------
async function summarizeTranscript(transcript) {
  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `You are an assistant that summarizes meeting transcripts.

Given the transcript below, return your response in the following structure:

## Summary
A short paragraph summarizing what the meeting was about.

## Key Decisions
- Bullet list of decisions that were made during the meeting.

## Action Items
- Bullet list of tasks that came out of the meeting.
- Include the owner and deadline if mentioned in the transcript.

Transcript:
"""
${transcript}
"""`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Gemini API error: ${JSON.stringify(data)}`);
  }

  const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!summaryText) {
    throw new Error("Gemini API returned no summary text");
  }

  return summaryText;
}

// ---------------------------------------------------------------------------
// Route: upload -> transcribe -> summarize -> respond (all in one request)
// Kept the route name "/upload-video" and field name "video" from your
// original code, so your frontend's upload call doesn't need to change.
// ---------------------------------------------------------------------------
app.post("/upload-video", upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }

  const filePath = req.file.path;

  try {
    console.log(`Transcribing: ${filePath}`);
    const transcript = await transcribeAudio(filePath);

    console.log("Summarizing transcript with Gemini...");
    const summary = await summarizeTranscript(transcript);

    res.json({
      success: true,
      transcript,
      summary
    });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: error.message });
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) console.error("Failed to delete temp file:", err);
    });
  }
});

app.listen(4000, () => console.log("Server running on port 4000"));