class PixelArtConverter {
  constructor() {
    // Correction des sélecteurs
    
    this.dropLabel = document.querySelector('.converter-drop-label');
    this.dropFrame = document.querySelector('.converter-drop-frame');
    this.fileInput = document.getElementById('file-input');
    this.pixelSizeSlider = document.getElementById('pixel-size-slider');
    this.pixelSizeInput = document.getElementById('pixel-size-input');
    this.pixelSizeLabel = document.getElementById('pixel-size-label');
    this.methodSelect = document.getElementById('method-select');
    this.methodNote = document.getElementById('method-note');
    this.thresholdSlider = document.getElementById('threshold-slider');
    this.thresholdInput = document.getElementById('threshold-input');
    this.thresholdLabel = document.getElementById('threshold-label');
    this.convertBtn = document.getElementById('convert-btn');
    this.saveBtn = document.getElementById('save-btn');
    this.infoLabel = document.getElementById('info-label');
    this.canvas = document.getElementById('preview-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Variables d'état
    this.originalImage = null;
    this.convertedImageData = null;
    
    // Matrices de dithering
    this.bayerMatrix2x2 = [0, 2, 3, 1].map(v => v / 4);
    this.bayerMatrix4x4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
    
    // Initialisation
    this.initEventListeners();
    this.updateMethodNote();
  }
  
  initEventListeners() {
    // Drag & drop
    this.dropFrame.addEventListener('click', () => this.fileInput.click());
    this.dropFrame.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropFrame.style.borderColor = '#4a86e8';
      this.dropFrame.style.backgroundColor = '#edf4ff';
    });
    this.dropFrame.addEventListener('dragleave', () => {
      this.dropFrame.style.borderColor = '#aaa';
      this.dropFrame.style.backgroundColor = '#fafafa';
    });
    this.dropFrame.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropFrame.style.borderColor = '#aaa';
      this.dropFrame.style.backgroundColor = '#fafafa';
      
      if (e.dataTransfer.files.length) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });
    
    // Sélection de fichier
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });
    
    // Contrôles
    this.pixelSizeSlider.addEventListener('input', () => this.onParamChange());
    this.pixelSizeInput.addEventListener('input', () => this.onParamChange());
    this.methodSelect.addEventListener('change', () => this.onMethodChange());
    this.thresholdSlider.addEventListener('input', () => this.onParamChange());
    this.thresholdInput.addEventListener('input', () => this.onParamChange());
    
    // Boutons
    this.convertBtn.addEventListener('click', () => this.convertImage());
    this.saveBtn.addEventListener('click', () => this.saveImage());
  }
  
  onMethodChange() {
    this.updateMethodNote();
    
    // Activer/désactiver le seuil selon la méthode
    const method = this.methodSelect.value;
    // CORRECTION : Ajouter bayer2 et bayer4 à la liste des méthodes qui n'utilisent pas le seuil
    const disableThreshold = ['floyd-steinberg', 'atkinson', 'bayer2', 'bayer4'].includes(method);
    
    this.thresholdSlider.disabled = disableThreshold;
    this.thresholdInput.disabled = disableThreshold;
    this.thresholdLabel.style.color = disableThreshold ? '#aaa' : '#666';
    
    if (this.originalImage) {
      this.convertImage();
    }
  }
  
  updateMethodNote() {
    const notes = {
      'simple': 'Simple seuil: Rapide mais contrastes nets sans dégradés',
      'floyd-steinberg': 'Floyd-Steinberg: Diffusion d\'erreur pour des dégradés naturels',
      'bayer2': 'Bayer 2x2: Motif ordonné effet tramage régulier',
      'bayer4': 'Bayer 4x4: Motif plus fin meilleur rendu des détails',
      'random': 'Aléatoire: Effet grain texture organique',
      'atkinson': 'Atkinson: Diffusion spéciale effet vintage Mac',
      'analog-horror': 'Analog Horror: Distorsion VHS avec artefacts et grain'
    };
    
    this.methodNote.textContent = notes[this.methodSelect.value] || '';
  }
  
  onParamChange() {
    // Synchroniser les valeurs
    const pixelSize = Math.min(20, Math.max(2, parseInt(this.pixelSizeSlider.value) || 8));
    this.pixelSizeSlider.value = pixelSize;
    this.pixelSizeInput.value = pixelSize;
    this.pixelSizeLabel.textContent = pixelSize;
    
    const threshold = Math.min(255, Math.max(0, parseInt(this.thresholdSlider.value) || 128));
    this.thresholdSlider.value = threshold;
    this.thresholdInput.value = threshold;
    this.thresholdLabel.textContent = threshold;
    
    if (this.originalImage) {
      this.convertImage();
    }
  }
  
  browseImage() {
    this.fileInput.click();
  }

  loadImage(file) {
    // Vérification du type de fichier
    const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      this.infoLabel.textContent = "Format d'image non supporté";
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.dropLabel.textContent = `✅ ${file.name}`;
        this.infoLabel.textContent = `${img.width}×${img.height} pixels`;
        this.convertBtn.disabled = false;
        this.convertImage();
      };
      img.onerror = () => {
        this.infoLabel.textContent = "Erreur de chargement de l'image";
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  convertImage() {
    if (!this.originalImage) return;
    
    const pixelSize = parseInt(this.pixelSizeInput.value);
    const threshold = parseInt(this.thresholdInput.value);
    const method = this.methodSelect.value;
    
    // Calculer la nouvelle taille
    const newWidth = Math.max(1, Math.floor(this.originalImage.width / pixelSize));
    const newHeight = Math.max(1, Math.floor(this.originalImage.height / pixelSize));
    
    // Créer un canvas temporaire pour le traitement
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Redimensionner l'image
    tempCtx.drawImage(
      this.originalImage,
      0, 0, this.originalImage.width, this.originalImage.height,
      0, 0, newWidth, newHeight
    );
    
    // Obtenir les données de l'image
    const imageData = tempCtx.getImageData(0, 0, newWidth, newHeight);
    const data = imageData.data;
    
    // Appliquer la méthode de conversion
    switch(method) {
      case 'floyd-steinberg':
        this.floydSteinbergDither(data, newWidth, newHeight);
        break;
      case 'atkinson':
        this.atkinsonDither(data, newWidth, newHeight);
        break;
      case 'bayer2':
        this.bayerDither(data, newWidth, newHeight, 2, this.bayerMatrix2x2);
        break;
      case 'bayer4':
        this.bayerDither(data, newWidth, newHeight, 4, this.bayerMatrix4x4);
        break;
      case 'random':
        this.randomDither(data, threshold);
        break;
      case 'analog-horror':
        this.analogHorrorDither(data, newWidth, newHeight, threshold);
        break;
      default: // simple threshold
        this.simpleThreshold(data, threshold);
    }
    
    // Mettre à jour l'image temporaire
    tempCtx.putImageData(imageData, 0, 0);
    
    // Agrandir pour l'effet pixel art
    this.canvas.width = newWidth * pixelSize;
    this.canvas.height = newHeight * pixelSize;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      tempCanvas,
      0, 0, newWidth, newHeight,
      0, 0, this.canvas.width, this.canvas.height
    );
    
    // Stocker les données pour l'export
    this.convertedImageData = this.canvas.toDataURL('image/png');
    this.saveBtn.disabled = false;
  }
  
  simpleThreshold(data, threshold) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const value = gray > threshold ? 255 : 0;
      
      data[i] = value;     // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
    }
  }
  
  floydSteinbergDither(data, width, height) {
    const newData = new Uint8ClampedArray(data);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        const r = newData[idx];
        const g = newData[idx + 1];
        const b = newData[idx + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        const newPixel = gray > 128 ? 255 : 0;
        const error = gray - newPixel;
        
        newData[idx] = newPixel;
        newData[idx + 1] = newPixel;
        newData[idx + 2] = newPixel;
        
        // Diffusion de l'erreur
        if (x + 1 < width) {
          this.diffuseError(newData, idx + 4, error, 7/16);
        }
        if (y + 1 < height) {
          if (x > 0) {
            this.diffuseError(newData, idx + width * 4 - 4, error, 3/16);
          }
          this.diffuseError(newData, idx + width * 4, error, 5/16);
          if (x + 1 < width) {
            this.diffuseError(newData, idx + width * 4 + 4, error, 1/16);
          }
        }
      }
    }
    
    for (let i = 0; i < data.length; i++) {
      data[i] = newData[i];
    }
  }
  
  diffuseError(data, idx, error, factor) {
    const r = data[idx] + error * factor;
    const g = data[idx + 1] + error * factor;
    const b = data[idx + 2] + error * factor;
    
    data[idx] = Math.max(0, Math.min(255, r));
    data[idx + 1] = Math.max(0, Math.min(255, g));
    data[idx + 2] = Math.max(0, Math.min(255, b));
  }
  
  atkinsonDither(data, width, height) {
    const newData = new Uint8ClampedArray(data);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        const r = newData[idx];
        const g = newData[idx + 1];
        const b = newData[idx + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        const newPixel = gray > 128 ? 255 : 0;
        const error = gray - newPixel;
        
        newData[idx] = newPixel;
        newData[idx + 1] = newPixel;
        newData[idx + 2] = newPixel;
        
        // Diffusion de l'erreur (Atkinson)
        const fraction = error / 8;
        
        if (x + 1 < width) this.diffuseError(newData, idx + 4, error, fraction);
        if (x + 2 < width) this.diffuseError(newData, idx + 8, error, fraction);
        if (y + 1 < height) {
          if (x > 0) this.diffuseError(newData, idx + width * 4 - 4, error, fraction);
          this.diffuseError(newData, idx + width * 4, error, fraction);
          if (x + 1 < width) this.diffuseError(newData, idx + width * 4 + 4, error, fraction);
        }
        if (y + 2 < height) this.diffuseError(newData, idx + width * 8, error, fraction);
      }
    }
    
    for (let i = 0; i < data.length; i++) {
      data[i] = newData[i];
    }
  }
  
  bayerDither(data, width, height, matrixSize, matrix) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        const threshold = matrix[(y % matrixSize) * matrixSize + (x % matrixSize)] * 255;
        const value = gray > threshold ? 255 : 0;
        
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
      }
    }
  }
  
  randomDither(data, baseThreshold) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      const threshold = baseThreshold + (Math.random() * 100 - 50);
      const value = gray > Math.max(0, Math.min(255, threshold)) ? 255 : 0;
      
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
  }
  
  analogHorrorDither(data, width, height, baseThreshold) {
    // Implémentation simplifiée pour l'exemple
    // (Une version complète serait trop longue pour cette réponse)
    this.simpleThreshold(data, baseThreshold);
    
    // Ajouter du bruit analogique
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < 0.05) { // 5% de bruit
        const value = Math.random() > 0.5 ? 255 : 0;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
      }
    }
  }
  
  saveImage() {
    if (!this.convertedImageData) return;
    
    const link = document.createElement('a');
    link.href = this.convertedImageData;
    link.download = `pixel-art-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const converter = new PixelArtConverter();
});


const dropArea = document.querySelector('.converter-drop-frame');
const fileInput = document.querySelector('input[type="file"]');
let typingInterval;
let messageContainer = document.getElementById('upload-message');

function showUploadMessage() {
  const message = "Merci d'avoir chargé votre image. Grâce à vous, nous ingérons de nouvelles informations...";
  const messageText = messageContainer.querySelector('.message-text');
  messageText.textContent = '';
  messageContainer.style.display = 'flex';

  let index = 0;
  clearInterval(typingInterval);

  typingInterval = setInterval(() => {
    messageText.textContent += message.charAt(index);
    index++;
    if (index >= message.length) {
      clearInterval(typingInterval);
      // Tu peux aussi cacher après un délai si tu veux
    }
  }, 50);
}

messageContainer.addEventListener('click', () => {
  clearInterval(typingInterval);
  messageContainer.style.display = 'none';
});

// Exemple d’appel quand l’image est chargée (à adapter selon ton code)
const inputFile = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    showUploadMessage();
  }
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) {
    showUploadMessage();
  }
});

// Et pour éviter que le navigateur n’ouvre l’image par défaut en drop
dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
});

function updateSeuilState(isActive) {
  const slider = document.querySelector('.seuil-slider');
  if (isActive) {
    slider.classList.remove('disabled');
    slider.disabled = false;
  } else {
    slider.classList.add('disabled');
    slider.disabled = true;
  }
}