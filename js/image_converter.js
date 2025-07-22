class PixelArtConverter {
  constructor() {
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
    this.saveBtn = document.getElementById('save-btn');
    this.infoLabel = document.getElementById('info-label');
    this.canvas = document.getElementById('preview-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.originalImage = null;
    this.convertedImageData = null;
    
    this.bayerMatrix2x2 = [0, 2, 3, 1].map(v => v / 4);
    this.bayerMatrix4x4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
    
    this.initEventListeners();
    this.updateMethodNote();
  }
  
  initEventListeners() {
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
        showUploadMessage();
        showTypingOverlayMessage("Merci d'avoir chargé votre image. Grâce à vous, nous ingérons de nouvelles informations...");

      }
    });
    
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
        showUploadMessage();
        showTypingOverlayMessage("Merci d'avoir chargé votre image. Grâce à vous, nous ingérons de nouvelles informations...");

      }
    });
    
    this.pixelSizeSlider.addEventListener('input', () => this.onParamChange());
    this.pixelSizeInput.addEventListener('input', () => this.onParamChange());
    this.methodSelect.addEventListener('change', () => this.onMethodChange());
    this.thresholdSlider.addEventListener('input', () => this.onParamChange());
    this.thresholdInput.addEventListener('input', () => this.onParamChange());
    this.saveBtn.addEventListener('click', () => this.saveImage());
  }
  
  onMethodChange() {
    this.updateMethodNote();
    const method = this.methodSelect.value;
    // Les méthodes qui n'ont PAS besoin du seuil et doivent désactiver les contrôles seuil
    const disableThreshold = ['floyd-steinberg', 'atkinson', 'bayer2', 'bayer4'].includes(method);
    const thresholdGroup = document.getElementById('threshold-group');
    if (disableThreshold) {
      thresholdGroup.classList.add('disabled-group');
    } else {
    thresholdGroup.classList.remove('disabled-group');
    }
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
  
  loadImage(file) {
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
        this.saveBtn.disabled = false;

        this.onParamChange(); // met à jour les paramètres
        this.convertImage();  // convertit immédiatement
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
    
    const newWidth = Math.max(1, Math.floor(this.originalImage.width / pixelSize));
    const newHeight = Math.max(1, Math.floor(this.originalImage.height / pixelSize));
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.drawImage(
      this.originalImage,
      0, 0, this.originalImage.width, this.originalImage.height,
      0, 0, newWidth, newHeight
    );
    
    const imageData = tempCtx.getImageData(0, 0, newWidth, newHeight);
    const data = imageData.data;
    
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
      default:
        this.simpleThreshold(data, threshold);
    }
    
    tempCtx.putImageData(imageData, 0, 0);
    
    this.canvas.width = newWidth * pixelSize;
    this.canvas.height = newHeight * pixelSize;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      tempCanvas,
      0, 0, newWidth, newHeight,
      0, 0, this.canvas.width, this.canvas.height
    );
    
    this.convertedImageData = this.canvas.toDataURL('image/png');
    this.saveBtn.disabled = false;
  }
  
  simpleThreshold(data, threshold) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
      const value = gray > threshold ? 255 : 0;
      data[i] = data[i+1] = data[i+2] = value;
    }
  }
  
  floydSteinbergDither(data, width, height) {
    const newData = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const oldR = newData[idx];
        const oldG = newData[idx+1];
        const oldB = newData[idx+2];
        const gray = 0.299 * oldR + 0.587 * oldG + 0.114 * oldB;
        const newVal = gray > 128 ? 255 : 0;
        const err = gray - newVal;
        
        newData[idx] = newData[idx+1] = newData[idx+2] = newVal;
        
        const distributeError = (xOff, yOff, factor) => {
          const nx = x + xOff;
          const ny = y + yOff;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = (ny * width + nx) * 4;
            for (let c=0; c<3; c++) {
              let val = newData[nidx + c] + err * factor;
              val = Math.min(255, Math.max(0, val));
              newData[nidx + c] = val;
            }
          }
        };
        
        distributeError(1, 0, 7/16);
        distributeError(-1, 1, 3/16);
        distributeError(0, 1, 5/16);
        distributeError(1, 1, 1/16);
      }
    }
    data.set(newData);
  }
  
  atkinsonDither(data, width, height) {
    const newData = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const oldR = newData[idx];
        const oldG = newData[idx+1];
        const oldB = newData[idx+2];
        const gray = 0.299 * oldR + 0.587 * oldG + 0.114 * oldB;
        const newVal = gray > 128 ? 255 : 0;
        const err = (gray - newVal) / 8;
        
        newData[idx] = newData[idx+1] = newData[idx+2] = newVal;
        
        const distributeError = (xOff, yOff) => {
          const nx = x + xOff;
          const ny = y + yOff;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = (ny * width + nx) * 4;
            for (let c=0; c<3; c++) {
              let val = newData[nidx + c] + err;
              val = Math.min(255, Math.max(0, val));
              newData[nidx + c] = val;
            }
          }
        };
        
        distributeError(1, 0);
        distributeError(2, 0);
        distributeError(-1, 1);
        distributeError(0, 1);
        distributeError(1, 1);
        distributeError(0, 2);
      }
    }
    data.set(newData);
  }
  
  bayerDither(data, width, height, matrixSize, matrix) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2];
        const threshold = matrix[(y % matrixSize) * matrixSize + (x % matrixSize)] * 255;
        const val = gray > threshold ? 255 : 0;
        data[idx] = data[idx+1] = data[idx+2] = val;
      }
    }
  }
  
  randomDither(data, threshold) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
      const val = gray > threshold + (Math.random() * 64 - 32) ? 255 : 0;
      data[i] = data[i+1] = data[i+2] = val;
    }
  }
  
  analogHorrorDither(data, width, height, threshold) {
    // Effet VHS avec bruit, grain, distorsion horizontale et vertical
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let gray = 0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2];
        // Ajout de bruit horizontal et vertical
        gray += (Math.sin(x * 0.3 + y * 0.2) * 15) + (Math.random() * 20 - 10);
        const val = gray > threshold ? 255 : 0;
        data[idx] = data[idx+1] = data[idx+2] = val;
      }
    }
  }
  
  saveImage() {
    if (!this.convertedImageData) return;
    const a = document.createElement('a');
    a.href = this.convertedImageData;
    a.download = 'pixelart.png';
    a.click();
  }
}

function showUploadMessage() {
  const info = document.getElementById('info-label');
  info.textContent = 'Image chargée. Choisissez les paramètres et cliquez sur Convertir.';
}

let currentTypingTimeout = null;
let isTyping = false;

function showTypingOverlayMessage(text, callback) {
  const overlay = document.getElementById('upload-message-overlay');
  const textElement = document.getElementById('upload-message-text');

  // Réinitialisation
  if (currentTypingTimeout) clearTimeout(currentTypingTimeout);
  isTyping = true;
  let i = 0;
  textElement.textContent = '';
  overlay.classList.remove('hidden');

  function typeChar() {
    if (!isTyping) return;
    if (i < text.length) {
      textElement.textContent += text.charAt(i);
      i++;
      currentTypingTimeout = setTimeout(typeChar, 40);
    } else {
      isTyping = false;
      currentTypingTimeout = setTimeout(() => {
        overlay.classList.add('hidden');
        if (callback) callback();
      }, 1000);
    }
  }

  function stopTypingImmediately() {
    if (isTyping) {
      isTyping = false;
      clearTimeout(currentTypingTimeout);
      overlay.classList.add('hidden');
      textElement.textContent = ''; // facultatif, au cas où du texte partiel est visible
      if (callback) callback();
    }
  }

  // Supprimer d’abord l’ancien listener (si existant) pour éviter les doublons
  overlay.removeEventListener('click', stopTypingImmediately);
  overlay.addEventListener('click', stopTypingImmediately);

  typeChar();
}



// Initialisation
const converter = new PixelArtConverter();
converter.convertBtn.disabled = true;
converter.saveBtn.disabled = true;
converter.thresholdSlider.disabled = false;
converter.thresholdInput.disabled = false;
