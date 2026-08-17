"""
Flask backend for PawVision AI.

Loads the MobileNetV2 transfer-learning model trained in train_model.ipynb
(model/dog_cat_model.keras) and serves predictions to templates/index.html.

IMPORTANT: the model saved by the notebook already contains its own
`data_augmentation` layer (a no-op outside of training) and its own
`preprocess_input` rescaling to [-1, 1] baked in as the first layers of the
graph. That means this file must feed the model RAW pixel values in the
[0, 255] range, resized to 160x160 - do NOT divide by 255 here, or every
prediction will be wrong (double-preprocessing).
"""

import os
import io
import base64

import numpy as np
from flask import Flask, request, jsonify, render_template
from PIL import Image
import tensorflow as tf

APP_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(APP_DIR, "model", "dog_cat_model.keras")
IMG_SIZE = (160, 160)               # must match IMG_SIZE in the notebook
CLASS_NAMES = ["cats", "dogs"]      # order printed by the notebook's train_ds.class_names

app = Flask(__name__)
model = None


def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"Loaded model from {MODEL_PATH}")
    else:
        print(f"WARNING: no model found at {MODEL_PATH}. "
              f"Run train_model.ipynb, then copy the saved dog_cat_model.keras "
              f"into the model/ folder and restart the server.")


def preprocess_image(image_bytes):
    """Resize + convert to array only. The model's own preprocess_input layer
    handles scaling to [-1, 1], so we must NOT normalize here."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = np.array(img).astype("float32")   # stays in [0, 255]
    arr = np.expand_dims(arr, axis=0)
    return arr, img


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/health")
def health():
    return jsonify({"status": "ok", "model_loaded": model is not None, "classes": CLASS_NAMES})


@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({
            "error": "Model not loaded. Run train_model.ipynb, copy the saved "
                     "dog_cat_model.keras into the model/ folder, then restart the server."
        }), 503

    if "image" not in request.files:
        return jsonify({"error": "No image file uploaded."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename."}), 400

    try:
        image_bytes = file.read()
        arr, pil_img = preprocess_image(image_bytes)

        prob = float(model.predict(arr, verbose=0)[0][0])   # P(dog), matches notebook's class order
        is_dog = prob > 0.5
        label = CLASS_NAMES[1] if is_dog else CLASS_NAMES[0]
        confidence = prob if is_dog else 1 - prob

        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG")
        preview_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        return jsonify({
            "label": label,                              # "dogs" or "cats"
            "is_dog": is_dog,
            "confidence": round(confidence * 100, 2),
            "preview": f"data:image/jpeg;base64,{preview_b64}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    load_model()
    app.run(debug=True, host="0.0.0.0", port=5000)