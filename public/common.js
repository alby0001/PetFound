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
          ready() {
            // Il cropper è pronto
          }
        });
      };
      reader.readAsDataURL(file);
    } else {
      cropContainer.style.display = 'none';
      previewContainer.style.display = 'none';
    }
  });
}

// Event listener per il pulsante di ritaglio
if (cropButton) {
  cropButton.addEventListener('click', () => {
    if (!cropper) return;

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
  });
}