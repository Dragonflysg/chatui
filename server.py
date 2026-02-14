"""
TSI Assistant — Mock Flask Server
Serves the static frontend and returns random response JSON files
to simulate an LLM backend.
"""

import os
import json
import glob
import random
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder=".", static_url_path="")

RESPONSES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "responses")


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/api/ask", methods=["POST"])
def ask():
    # Get the question from the request (we don't actually use it)
    data = request.get_json(silent=True) or {}
    question = data.get("question", "")

    # Pick a random response file
    pattern = os.path.join(RESPONSES_DIR, "response*.json")
    files = glob.glob(pattern)

    if not files:
        return jsonify({"status": "error", "message": "No response files found"}), 500

    chosen = random.choice(files)

    with open(chosen, "r", encoding="utf-8") as f:
        response_data = json.load(f)

    # Override the question field with what the user actually asked
    if "modelResult" in response_data:
        response_data["modelResult"]["question"] = question

    return jsonify(response_data)


if __name__ == "__main__":
    print("Starting TSI Assistant mock server on http://localhost:5000")
    app.run(debug=True, port=5000)
