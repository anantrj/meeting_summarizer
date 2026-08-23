#!/usr/bin/env python3

import sys
import json
import whisper


def transcribe(file_path: str, model_size: str = "base") -> str:
    model = whisper.load_model(model_size)
    result = model.transcribe(file_path)
    return result["text"]


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}), file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]

    try:
        text = transcribe(file_path)
        # Print ONLY the transcript as JSON so Node can parse it cleanly,
        # keeping stdout free of any Whisper progress/log noise.
        print(json.dumps({"transcript": text}))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()