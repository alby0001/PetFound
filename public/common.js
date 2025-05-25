// ======= Funzionalità comuni =======
const imageInput = document.getElementById('imageInput');
const imageToEdit = document.getElementById('imageToEdit');
const cropContainer = document.getElementById('cropContainer');
const cropButton = document.getElementById('cropButton');
const previewContainer = document.getElementById('previewContainer');
const croppedPreview = document.getElementById('croppedPreview');
const imageCanvas = document.getElementById('imageCanvas');

let cropper = null;
let croppedImageData = null;
let imageClickedForCrop = false; // Flag per tracciare se l'immagine è stata cliccata

// Funzione di gestione del ritaglio immagine
if (imageInput) {
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        // Mostra l'immagine nel container per il ritaglio
        imageToEdit.src = e.target.result;
        cropContainer.style.display = 'block';

        // Reset del flag di click
        imageClickedForCrop = false;

        // Nascondi l'anteprima precedente se presente
        previewContainer.style.display = 'none';
        croppedImageData = null;

        // Distruggi il cropper esistente se c'è
        if (cropper) {
          cropper.destroy();
        }

        // Inizializza il cropper con un ritaglio quadrato
        cropper = new Cropper(imageToEdit, {
          aspectRatio: 1, // Rapporto 1:1 per immagini quadrate
          viewMode: 1,    // Limita la vista alla dimensione dell'immagine
          guides: true,   // Mostra le guide del ritaglio
          autoCropArea: 0.8, // L'area di ritaglio predefinita è l'80% della dimensione dell'immagine
          responsive: true,
          // Disabilita il movimento iniziale fino al primo click
          movable: false,
          zoomable: false,
          rotatable: false,
          scalable: false,
          ready() {
            // Il cropper è pronto ma non ancora attivo
            console.log('Cropper pronto. Clicca sull\'immagine per iniziare il ritaglio.');
          }
        });

        // Aggiungi event listener per il click sull'immagine
        imageToEdit.addEventListener('click', function enableCropping() {
          if (!imageClickedForCrop) {
            imageClickedForCrop = true;

            // Abilita tutte le funzionalità del cropper
            cropper.enable();
            cropper.setMovable(true);
            cropper.setZoomable(true);
            cropper.setRotatable(true);
            cropper.setScalable(true);

            // Aggiungi una classe per indicare che è attivo
            imageToEdit.style.cursor = 'move';

            // Mostra un messaggio temporaneo
            showTemporaryMessage('Ora puoi ritagliare l\'immagine!');

            // Rimuovi questo listener dopo il primo click
            imageToEdit.removeEventListener('click', enableCropping);
          }
        });

        // Aggiungi un messaggio iniziale
        showTemporaryMessage('Clicca sull\'immagine per iniziare il ritaglio');
      };
      reader.readAsDataURL(file);
    } else {
      cropContainer.style.display = 'none';
      previewContainer.style.display = 'none';
      imageClickedForCrop = false;
    }
  });
}

// Funzione per mostrare messaggi temporanei
function showTemporaryMessage(message) {
  // Rimuovi messaggi esistenti
  const existingMessage = document.querySelector('.crop-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  // Crea nuovo messaggio
  const messageDiv = document.createElement('div');
  messageDiv.className = 'crop-message';
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
    background-color: rgba(52, 152, 219, 0.9);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    transition: opacity 0.5s ease;
  `;

  // Aggiungi il messaggio al container del crop
  if (cropContainer) {
    cropContainer.style.position = 'relative';
    cropContainer.appendChild(messageDiv);

    // Rimuovi il messaggio dopo 3 secondi
    setTimeout(() => {
      messageDiv.style.opacity = '0';
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 500);
    }, 3000);
  }
}

// Event listener per il pulsante di ritaglio
if (cropButton) {
  cropButton.addEventListener('click', () => {
    if (!cropper) {
      alert('Seleziona prima un\'immagine');
      return;
    }


    // Ottieni l'immagine ritagliata come data URL
    const croppedCanvas = cropper.getCroppedCanvas({
      width: 600,   // Dimensione standard per tutte le immagini
      height: 600,  // Dimensione standard per tutte le immagini
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    croppedImageData = croppedCanvas.toDataURL('image/jpeg', 0.9);

    // Mostra l'anteprima dell'immagine ritagliata
    croppedPreview.src = croppedImageData;
    previewContainer.style.display = 'block';

    // Mostra messaggio di successo
    showTemporaryMessage('Immagine ritagliata con successo!');
  });
}

// Previeni il movimento del cropper durante lo scroll della pagina
document.addEventListener('DOMContentLoaded', () => {
  // Aggiungi stili CSS per migliorare l'esperienza del cropper
  const style = document.createElement('style');
  style.textContent = `
    .cropper-container {
      position: relative !important;
    }

    .crop-message {
      pointer-events: none;
    }

    .image-container {
      position: relative;
      overflow: hidden;
    }

    #imageToEdit {
      cursor: pointer;
      transition: opacity 0.3s ease;
    }

    #imageToEdit:hover {
      opacity: 0.9;
    }
  `;
  document.head.appendChild(style);
});
