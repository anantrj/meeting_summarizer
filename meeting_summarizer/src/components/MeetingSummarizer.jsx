import { useState, useRef, useCallback } from "react";

// Points at your local Express server (server.js from the backend rewrite).
// Change if your backend runs on a different port.
const API_URL = "http://localhost:4000/upload-video";

export default function MeetingSummarizer() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setTranscript("");
    setSummary("");
    setErrorMsg("");
  };

  const handleFile = (f) => {
    if (!f) return;
    reset();
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  }, []);

  const submit = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("video", file); // field name matches multer.single("video") in server.js

    try {
      const res = await fetch(API_URL, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong while processing the file.");
      }

      setTranscript(data.transcript || "");
      setSummary(data.summary || "");
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  return (
    <div style={styles.page}>
      <style>{fontImport}</style>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.eyebrow}>MEETING SUMMARIZER</div>
          <h1 style={styles.h1}>Turn the recording into the record.</h1>
          <p style={styles.subhead}>
            Drop in a meeting recording. Get back a transcript, the decisions
            that were made, and the tasks that came out of it.
          </p>
        </header>

        {/* Upload zone */}
        <div
          style={{
            ...styles.dropzone,
            ...(dragActive ? styles.dropzoneActive : {}),
            ...(file ? styles.dropzoneHasFile : {}),
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,video/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Waveform active={status === "uploading"} />
          {!file && (
            <>
              <div style={styles.dropTitle}>Drop your recording here</div>
              <div style={styles.dropSub}>or click to browse — mp3, wav, m4a, mp4</div>
            </>
          )}
          {file && status !== "done" && (
            <>
              <div style={styles.dropTitle}>{file.name}</div>
              <div style={styles.dropSub}>
                {(file.size / (1024 * 1024)).toFixed(1)} MB — ready to process
              </div>
            </>
          )}
        </div>

        {/* Action row */}
        {file && status !== "done" && (
          <div style={styles.actionRow}>
            <button
              style={{
                ...styles.primaryBtn,
                ...(status === "uploading" ? styles.btnDisabled : {}),
              }}
              onClick={submit}
              disabled={status === "uploading"}
            >
              {status === "uploading" ? "Transcribing & summarizing…" : "Process recording"}
            </button>
            <button style={styles.ghostBtn} onClick={reset} disabled={status === "uploading"}>
              Clear
            </button>
          </div>
        )}

        {status === "uploading" && (
          <p style={styles.processingNote}>
            This runs speech-to-text locally, so longer recordings take a few minutes.
            Keep this tab open.
          </p>
        )}

        {status === "error" && (
          <div style={styles.errorBox}>
            <strong>Couldn't process that file.</strong>
            <div style={{ marginTop: 4 }}>{errorMsg}</div>
          </div>
        )}

        {/* Results */}
        {status === "done" && (
          <div style={styles.results}>
            <div style={styles.resultsHeader}>
              <div>
                <div style={styles.dropTitle}>{file?.name}</div>
                <div style={styles.dropSub}>Processed successfully</div>
              </div>
              <button style={styles.ghostBtn} onClick={reset}>
                Summarize another
              </button>
            </div>

            <section style={styles.summaryCard}>
              <div style={styles.sectionLabel}>Summary &amp; action items</div>
              <div style={styles.summaryText}>{summary}</div>
            </section>

            <section style={styles.transcriptCard}>
              <div style={styles.sectionLabel}>Full transcript</div>
              <div style={styles.transcriptText}>{transcript}</div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// Signature element: a waveform that idles as a flat line and animates
// while the file is being processed — a visual echo of what's happening
// under the hood (audio being turned into text).
function Waveform({ active }) {
  const bars = 28;
  return (
    <svg width="220" height="48" viewBox="0 0 220 48" style={{ marginBottom: 18 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const baseHeight = 4 + Math.abs(Math.sin(i * 0.9)) * 20;
        return (
          <rect
            key={i}
            x={i * 8}
            y={24 - baseHeight / 2}
            width="4"
            height={baseHeight}
            rx="2"
            fill={active ? "#D4A24C" : "#5B564D"}
            style={
              active
                ? {
                    animation: `wave 0.9s ease-in-out ${i * 0.045}s infinite`,
                    transformOrigin: "center",
                  }
                : {}
            }
          />
        );
      })}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          rect { animation: none !important; }
        }
      `}</style>
    </svg>
  );
}

const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
`;

const styles = {
  page: {
    minHeight: "100vh",
    background: "#1C1B1A",
    color: "#F2EFE9",
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: "48px 20px 80px",
    display: "flex",
    justifyContent: "center",
  },
  shell: {
    width: "100%",
    maxWidth: 640,
  },
  header: {
    marginBottom: 40,
  },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    letterSpacing: "0.14em",
    color: "#D4A24C",
    marginBottom: 14,
    fontWeight: 600,
  },
  h1: {
    fontSize: 34,
    lineHeight: 1.15,
    fontWeight: 700,
    margin: "0 0 12px",
    letterSpacing: "-0.02em",
  },
  subhead: {
    fontSize: 16,
    lineHeight: 1.55,
    color: "#B8B2A6",
    margin: 0,
    maxWidth: 480,
  },
  dropzone: {
    border: "1.5px dashed #45423C",
    borderRadius: 14,
    padding: "48px 24px",
    textAlign: "center",
    cursor: "pointer",
    background: "#221F1C",
    transition: "border-color 0.2s ease, background 0.2s ease",
  },
  dropzoneActive: {
    borderColor: "#D4A24C",
    background: "#26221B",
  },
  dropzoneHasFile: {
    borderStyle: "solid",
    borderColor: "#5B564D",
  },
  dropTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4,
  },
  dropSub: {
    fontSize: 13,
    color: "#8A8478",
    fontFamily: "'JetBrains Mono', monospace",
  },
  actionRow: {
    display: "flex",
    gap: 10,
    marginTop: 20,
  },
  primaryBtn: {
    flex: 1,
    background: "#D4A24C",
    color: "#1C1B1A",
    border: "none",
    borderRadius: 9,
    padding: "13px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  ghostBtn: {
    background: "transparent",
    color: "#B8B2A6",
    border: "1px solid #45423C",
    borderRadius: 9,
    padding: "13px 18px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  processingNote: {
    fontSize: 13,
    color: "#8A8478",
    marginTop: 14,
    fontFamily: "'JetBrains Mono', monospace",
  },
  errorBox: {
    marginTop: 18,
    padding: "14px 16px",
    background: "#2B1E1B",
    border: "1px solid #6B3A32",
    borderRadius: 10,
    fontSize: 14,
    color: "#E8B4A8",
  },
  results: {
    marginTop: 28,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  resultsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.1em",
    color: "#5B8C7B",
    fontWeight: 600,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  summaryCard: {
    background: "#212C28",
    border: "1px solid #33453E",
    borderRadius: 12,
    padding: 20,
  },
  summaryText: {
    fontSize: 14.5,
    lineHeight: 1.7,
    color: "#DCE8E2",
    whiteSpace: "pre-wrap",
  },
  transcriptCard: {
    background: "#221F1C",
    border: "1px solid #33302A",
    borderRadius: 12,
    padding: 20,
    maxHeight: 320,
    overflowY: "auto",
  },
  transcriptText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    lineHeight: 1.8,
    color: "#B8B2A6",
    whiteSpace: "pre-wrap",
  },
};