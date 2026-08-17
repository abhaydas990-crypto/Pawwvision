const dropzone     = document.getElementById('dropzone');
const fileInput    = document.getElementById('fileInput');
const dzEmpty      = document.getElementById('dzEmpty');
const previewImg   = document.getElementById('previewImg');
const changeImage  = document.getElementById('changeImage');
const predictBtn   = document.getElementById('predictBtn');
const errorMsg     = document.getElementById('errorMsg');

const result           = document.getElementById('result');
const predictionIcon   = document.getElementById('predictionIcon');
const resultLabel      = document.getElementById('resultLabel');
const confidenceText   = document.getElementById('confidenceText');
const confidenceBar    = document.getElementById('confidenceBar');
const classText        = document.getElementById('classText');
const classIcon        = document.querySelector('.detail-icon.dog-bg');

let selectedFile = null;

// ---------- selecting a file ----------
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
});

['dragenter', 'dragover'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  });
});
['dragleave', 'drop'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
  });
});
dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showError('That file is not an image. Try a PNG, JPG or WEBP.');
    return;
  }
  hideError();
  selectedFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewImg.hidden = false;
    dzEmpty.hidden = true;
    changeImage.hidden = false;
    predictBtn.disabled = false;
  };
  reader.readAsDataURL(file);

  result.hidden = true;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}
function hideError() {
  errorMsg.hidden = true;
}

// ---------- running the prediction ----------
predictBtn.addEventListener('click', runPrediction);

async function runPrediction() {
  if (!selectedFile) return;
  hideError();

  predictBtn.disabled = true;
  predictBtn.classList.add('is-loading');

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    const res = await fetch('/predict', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong analyzing that image.');
    }

    renderResult(data);
  } catch (err) {
    showError(err.message);
    result.hidden = true;
  } finally {
    predictBtn.classList.remove('is-loading');
    predictBtn.disabled = false;
  }
}

function renderResult(data) {
  const isDog = data.is_dog;

  predictionIcon.textContent = isDog ? '🐶' : '🐱';

  resultLabel.textContent = isDog ? 'Dog' : 'Cat';
  resultLabel.classList.toggle('is-dog', isDog);
  resultLabel.classList.toggle('is-cat', !isDog);

  confidenceText.textContent = data.confidence.toFixed(1) + '%';
  requestAnimationFrame(() => {
    confidenceBar.style.width = data.confidence + '%';
  });

  classText.textContent = isDog ? 'Dog' : 'Cat';
  if (classIcon) {
    classIcon.textContent = isDog ? '🐶' : '🐱';
    classIcon.classList.toggle('dog-bg', isDog);
    classIcon.classList.toggle('cat-bg', !isDog);
  }

  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
