from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from murf import Murf
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_url_path='', static_folder='.')
CORS(app)

# Initialize Murf client
client = Murf(api_key=os.getenv("MURF_API_KEY"))

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/tts', methods=['POST'])
def tts():
    data = request.get_json()
    text = data.get("text")

    if not text:
        return jsonify({"error": "Text is required"}), 400

    try:
        res = client.text_to_speech.generate(
            text=text,
            voice_id="en-US-terrell"  # You can change voice here if needed
        )
        return jsonify({"audio_url": res.audio_file})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
