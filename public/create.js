// ======= Script per la pagina di creazione segnalazione =======
let marker, map;
const locationInput = document.getElementById('locationName');
const suggestionsBox = document.getElementById('suggestions');

function initMap() {
  map = L.map('createMap').setView([41.9028, 12.4964], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

function addMarker(lat, lon) {
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);
  map.setView([lat, lon], 13);
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

document.addEventListener('DOMContentLoaded', () => {
  initMap();

  // Event listener per il form di creazione post
  const postForm = document.getElementById('postForm');
  if (postForm) {
    postForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return alert('Non sei loggato');

      // Controlla se l'immagine è stata ritagliata
      if (!croppedImageData) {
        return alert('Per favore, ritaglia l\'immagine prima di pubblicare la segnalazione.');
      }

      const form = e.target;
      const formData = new FormData();

      // Aggiungi i campi del form
      formData.append('description', form.description.value);
      formData.append('locationName', form.locationName.value);
      formData.append('userId', user.userId);

      // Aggiungi i nuovi campi specifici per gli animali
      const animalStatus = form.querySelector('input[name="animalStatus"]:checked').value;
      formData.append('animalStatus', animalStatus);
      formData.append('animalType', form.animalType.value);
      formData.append('contactInfo', form.contactInfo.value);

      // Converti l'immagine ritagliata in Blob e aggiungila al FormData
      const response = await fetch(croppedImageData);
      const blob = await response.blob();
      formData.append('image', blob, 'cropped-image.jpg');

      const latitude = marker ? marker.getLatLng().lat : null;
      const longitude = marker ? marker.getLatLng().lng : null;

      formData.append('latitude', latitude);
      formData.append('longitude', longitude);

      const res = await fetch('/posts', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert('Segnalazione pubblicata!');
        form.reset();
        window.location.href = '/feed.html';
      } else {
        alert('Errore nella pubblicazione della segnalazione');
      }
    });
  }
});