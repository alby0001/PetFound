// Variabili globali
let marker, map;
let croppedImageData; // Variabile per memorizzare l'immagine ritagliata

// Riferimenti agli elementi DOM
const locationInput = document.getElementById('locationName');
const suggestionsBox = document.getElementById('suggestions');
const petNameHeader = document.getElementById('petNameHeader');
const animalTypeInput = document.getElementById('animalType');
const contactInfoInput = document.getElementById('contactInfo');
const petImage = document.getElementById('petImage');
const postForm = document.getElementById('postForm');

// Controlla se l'utente è loggato
const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
  window.location.href = '/login.html';
}

// Controlla se è stato selezionato un animale smarrito
const lostPet = JSON.parse(localStorage.getItem('lostPet'));
if (!lostPet) {
  alert('Nessun animale selezionato. Verrai reindirizzato alla pagina del profilo.');
  window.location.href = '/profile.html';
}

// Inizializza la mappa
function initMap() {
  map = L.map('createMap').setView([41.9028, 12.4964], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Aggiungi l'evento click sulla mappa
  map.on('click', function(e) {
    addMarker(e.latlng.lat, e.latlng.lng);
  });
}

// Funzione per aggiungere un marker sulla mappa
function addMarker(lat, lon) {
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);
  map.setView([lat, lon], 13);
}

// Funzione per precompilare i campi con i dati dell'animale selezionato
function prefilData() {
  petNameHeader.textContent = lostPet.petName;
  animalTypeInput.value = lostPet.petType;

  // Precompila il campo di contatto con il numero dell'utente se disponibile
  if (user.telefono) {
    contactInfoInput.value = user.telefono;
  }

  // Imposta l'immagine dell'animale
  petImage.src = lostPet.imageUrl;

  // Salva l'URL dell'immagine per utilizzarla nel form
  croppedImageData = lostPet.imageUrl;
}

// Gestione dell'input per la localizzazione
if (locationInput) {
  locationInput.addEventListener('input', async () => {
    const query = locationInput.value;
    if (query.length < 3) {
      suggestionsBox.innerHTML = '';
      return;
    }

    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const places = await res.json();

    suggestionsBox.innerHTML = '';
    places.forEach(place => {
      const div = document.createElement('div');
      div.textContent = place.display_name;
      div.addEventListener('click', () => {
        locationInput.value = place.display_name;
        suggestionsBox.innerHTML = '';
        addMarker(place.lat, place.lon);
      });
      suggestionsBox.appendChild(div);
    });
  });
}

// Event listener per il form di segnalazione
if (postForm) {
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!user) return alert('Non sei loggato');

    // Controlla se c'è un marker sulla mappa
    if (!marker) {
      return alert('Per favore, seleziona una posizione sulla mappa dove hai smarrito l\'animale.');
    }

    const form = e.target;
    const formData = new FormData();

    // Aggiungi i campi del form
    formData.append('description', form.description.value);
    formData.append('locationName', form.locationName.value);
    formData.append('userId', user.userId);

    // Aggiungi i campi specifici per gli animali
    formData.append('animalStatus', 'smarrito'); // Sempre "smarrito" per questa funzionalità
    formData.append('animalType', form.animalType.value);
    formData.append('contactInfo', form.contactInfo.value);

    // Ottieni l'immagine dell'animale dall'URL e convertila in Blob
    try {
      const response = await fetch(croppedImageData);
      const blob = await response.blob();
      formData.append('image', blob, 'pet-image.jpg');
    } catch (error) {
      console.error('Errore nel caricamento dell\'immagine:', error);
      return alert('Errore nel caricamento dell\'immagine. Riprova.');
    }

    // Aggiungi le coordinate della posizione
    const latitude = marker.getLatLng().lat;
    const longitude = marker.getLatLng().lng;

    formData.append('latitude', latitude);
    formData.append('longitude', longitude);

    try {
      const res = await fetch('/posts', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert('Segnalazione di smarrimento pubblicata con successo!');
        // Rimuovi l'animale smarrito da localStorage
        localStorage.removeItem('lostPet');

        // Reindirizza alla pagina del feed
        window.location.href = '/feed.html';
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Errore nella pubblicazione della segnalazione');
      }
    } catch (error) {
      console.error('Errore nella creazione del post:', error);
      alert(`Errore: ${error.message}`);
    }
  });
}

// Inizializza quando il documento è pronto
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  prefilData();

  // Gestione logout
  document.getElementById('logoutButton').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('user');
    localStorage.removeItem('lostPet');
    window.location.href = '/login.html';
  });
});
