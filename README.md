# 🐾 PawVision AI — Dog & Cat Classifier

Your MobileNetV2 transfer-learning notebook, wired up to a Flask backend and
served through your PawVision AI frontend.

```
pawvision-app/
├── train_model.ipynb          ← your notebook (1 bug fixed, see below), run FIRST
├── app.py                     ← Flask backend / prediction API
├── requirements.txt
├── model/
│   └── dog_cat_model.keras     ← put your trained model here
├── templates/
│   └── index.html               (yours, unchanged)
└── static/
    ├── css/style.css            (yours, +1 small addition, see below)
    └── js/script.js             (new — wires the UI to /predict)
```

## 1. Install dependencies

```bash
pip install -r requirements.txt
```

## 2. Train the model

Run `train_model.ipynb` top to bottom (Colab/Kaggle with a GPU recommended —
your local run showed no GPU on native Windows, which TensorFlow ≥2.11 doesn't
support; WSL2 or Colab will be much faster). It:

1. Downloads `tongpython/cat-and-dog` directly via `kagglehub.dataset_download(...)`
2. Trains a MobileNetV2 head (frozen base), then fine-tunes the last 30 layers
3. Evaluates on the held-out test set and prints a classification report + confusion matrix
4. Saves **`dog_cat_model.keras`**

**One bug fixed:** the confusion-matrix cell called `sns.heatmap(...)` but never
imported `seaborn` — this crashed that cell with a `NameError`. Added
`import seaborn as sns` alongside your other imports in cell 2.

Copy the saved model into this project:

```
pawvision-app/model/dog_cat_model.keras
```

## 3. Run the web app

```bash
python app.py
```

Open **http://localhost:5000**. Drag a photo (or click to browse), then
**Analyze Image** — the result card animates in with the predicted class,
confidence bar, and detail chips.

## Important wiring detail

Your model bakes `preprocess_input` (scales pixels to `[-1, 1]`) and
`data_augmentation` (a no-op outside training) **into the model graph itself**
— they're Keras layers, not a separate preprocessing step. So `app.py`
resizes uploaded images to `160×160` and hands the model **raw `[0, 255]`
pixel values**, no `/255` division. If you ever retrain with a different
preprocessing scheme, update `preprocess_image()` in `app.py` to match.

## Notes

- `CLASS_NAMES = ["cats", "dogs"]` in `app.py` matches the alphabetical order
  Keras's `image_dataset_from_directory` assigned in your notebook output
  (`Classes: ['cats', 'dogs']`) — index 0 = cat, index 1 = dog.
- If `model/dog_cat_model.keras` is missing, `/predict` returns a clear JSON
  error instead of crashing, surfaced in the UI's error banner.
- Added a `.cat-bg` rule to `style.css` (a few lines, alongside your existing
  `.dog-bg`) so the "CLASS" detail chip's icon background actually matches
  when the result is a cat — the original only styled the dog case.
