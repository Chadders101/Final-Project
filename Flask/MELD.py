from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)
CORS(app)  # Apply CORS globally

# Load your models directly from where they are saved
print("Loading model...")
model = joblib.load('Phish.joblib')
vectorizer = joblib.load('PhishVectorizer.joblib')
print("Model loaded successfully.")
 
@app.route('/test', methods=['POST', 'OPTIONS'])
def analyse_email():
    # Handle OPTIONS for CORS preflight
    if request.method == 'OPTIONS':
        print("Handling OPTIONS request...")
        return '', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }

    # Process POST request
    elif request.method == 'POST':
        #print("Received POST request...")
        data = request.get_json(force=True)
        #print("Received data:", data)
        
        if 'content' not in data:
            print("Missing content in data")
            return jsonify({'error': 'Missing content data'}), 400, {
                'Access-Control-Allow-Origin': '*'
            }
        
        content = data['content']
        #print("Content to process:", content)
        
        processed_content = vectorizer.transform([content])
        #print("Content after vectorization:", processed_content)
        
        probability = model.predict_proba(processed_content)[0][1]  # Assuming class 1 is "spam"
        print("Spam probability:", probability)
        
        # Convert probability to colour
        colour = '#00ff00' if probability < 0.33 else '#ffbf00' if probability < 0.66 else '#ff0000'
        print("Assigned colour:", colour)

        return jsonify({"colour": colour, "probability": probability}), 200, {
            'Access-Control-Allow-Origin': '*'
        }

if __name__ == '__main__':
    print("Starting Flask server...")
    app.run(debug=True)
