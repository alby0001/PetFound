// ======= Script per la pagina del feed =======
let map;
let radiusCircle;
let userMarker;
let allPosts = [];
let userLocation = null;

// Filtri
let currentAnimalTypeFilter = "";
let currentStatusFilter = "";
let currentDistanceFilter = 50; // Default 50km

function updateDistanceLabel(value) {
  document.getElementById('distanceLabel').textContent = `${value} km`;
  currentDistanceFilter = parseInt(value);

  // Aggiorna il cerchio sulla mappa se esiste già una posizione utente
  if (userLocation && radiusCircle) {
    map.removeLayer(radiusCircle);
    drawRadiusCircle(userLocation, currentDistanceFilter);
  }

  // Aggiorna automaticamente i post quando cambia il valore
  filterAndDisplayPosts();
}

function initMap() {
  // Configurazione della mappa con Gesture Handling per richiedere due dita 
  // per lo scorrimento su dispositivi touch
  map = L.map('map', {
    gestureHandling: true,  // Richiede il plugin leaflet-gesture-handling
    zoomControl: true
  }).setView([41.9028, 12.4964], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Aggiungi messaggio per dispositivi touch
  const touchInfo = L.control({position: 'topright'});
  touchInfo.onAdd = function() {
    const div = L.DomUtil.create('div', 'touch-info');
    div.innerHTML = 'Usa due dita per muovere la mappa';
    setTimeout(() => { div.style.opacity = 0; }, 5000); // Scompare dopo 5 secondi
    return div;
  };
  touchInfo.addTo(map);
}

function drawRadiusCircle(location, radiusKm) {
  // Rimuovi cerchio esistente se presente
  if (radiusCircle) {
    map.removeLayer(radiusCircle);
  }

  // Aggiungi nuovo cerchio
  radiusCircle = L.circle(location, {
    color: 'var(--primary-color)',
    fillColor: 'var(--primary-color)',
    fillOpacity: 0.1,
    radius: radiusKm * 1000, // Converti km in metri
    className: 'radius-circle'
  }).addTo(map);

  // Mostra marker per la posizione dell'utente
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.marker(location, {
    icon: L.divIcon({
      className: 'user-location-marker',
      html: '<div style="background-color: var(--primary-color); width: 12px; height: 12px; border-radius: 50%; border: 3px solid white;"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    })
  }).addTo(map);

  // Centra la mappa sulla posizione con lo zoom appropriato per mostrare l'intero cerchio
  const bounds = radiusCircle.getBounds();
  map.fitBounds(bounds);
}

// Calcola la distanza tra due punti in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

  const R = 6371; // Raggio della Terra in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c;
  return distance;
}

// Funzione per ottenere la posizione attuale dell'utente
function getUserLocation() {
  const locationStatus = document.getElementById('locationStatus');
  locationStatus.textContent = "Ricerca posizione in corso...";

  if (!navigator.geolocation) {
    locationStatus.textContent = "Geolocalizzazione non supportata dal browser";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      userLocation = [lat, lon];

      locationStatus.textContent = "Posizione trovata!";
      drawRadiusCircle(userLocation, currentDistanceFilter);

      // Filtra e aggiorna i post dopo aver ottenuto la posizione
      filterAndDisplayPosts();
    },
    (error) => {
      switch(error.code) {
        case error.PERMISSION_DENIED:
          locationStatus.textContent = "Permesso negato per la geolocalizzazione";
          break;
        case error.POSITION_UNAVAILABLE:
          locationStatus.textContent = "Posizione non disponibile";
          break;
        case error.TIMEOUT:
          locationStatus.textContent = "Richiesta scaduta";
          break;
        case error.UNKNOWN_ERROR:
          locationStatus.textContent = "Errore sconosciuto";
          break;
      }
    }
  );
}

// Funzione per cercare una posizione tramite OpenStreetMap Nominatim API
async function searchLocation(query) {
  if (!query.trim()) return;

  try {
    const locationStatus = document.getElementById('locationStatus');
    locationStatus.textContent = "Ricerca posizione in corso...";

    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      userLocation = [parseFloat(result.lat), parseFloat(result.lon)];

      locationStatus.textContent = `Posizione trovata: ${result.display_name}`;
      drawRadiusCircle(userLocation, currentDistanceFilter);

      // Aggiorna i post con la nuova posizione
      filterAndDisplayPosts();
    } else {
      locationStatus.textContent = "Posizione non trovata";
    }
  } catch (error) {
    console.error("Errore nella ricerca della posizione:", error);
    document.getElementById('locationStatus').textContent = "Errore nella ricerca della posizione";
  }
}

// Funzione loadPosts per visualizzare informazioni sugli animali
async function loadPosts() {
  try {
    console.log('Tentativo di caricamento post...');
    const res = await fetch('/posts');
    
    console.log('Risposta ricevuta:', res.status, res.statusText);

    if (!res.ok) {
      // Prova a leggere il corpo della risposta per avere più dettagli
      const errorText = await res.text();
      console.error('Errore dal server:', errorText);
      throw new Error(`Errore nel caricamento dei post: ${res.status} - ${errorText}`);
    }

    const posts = await res.json();
    console.log('Post caricati:', posts.length, posts);
    
    allPosts = posts;

    // Pulisci la mappa dai marker esistenti
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer !== userMarker) {
        map.removeLayer(layer);
      }
    });

    // Avvia la geolocalizzazione automaticamente
    getUserLocation();
  } catch (error) {
    console.error("Errore dettagliato nel caricamento dei post:", error);
    document.getElementById('feed').innerHTML = `
      <div class="error-message">
        Errore nel caricamento dei post: ${error.message}
        <br><small>Controlla la console per maggiori dettagli</small>
      </div>`;
  }
}

function filterAndDisplayPosts() {
  const feed = document.getElementById('feed');
  feed.innerHTML = '';

  // Rimuovi i marker degli animali
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker && layer !== userMarker) {
      map.removeLayer(layer);
    }
  });

  // Controllo se ci sono post da filtrare
  if (!allPosts || allPosts.length === 0) {
    feed.innerHTML = '<div class="no-results">Nessun post disponibile.</div>';
    return;
  }

  // Filtro dei post
  const filteredPosts = allPosts.filter(post => {
    // Filtro per tipo di animale
    if (currentAnimalTypeFilter && post.animalType !== currentAnimalTypeFilter) {
      return false;
    }

    // Filtro per stato (smarrito/trovato)
    if (currentStatusFilter && post.animalStatus !== currentStatusFilter) {
      return false;
    }

    // Filtro per distanza se è stata impostata una posizione utente
    if (userLocation && post.latitude && post.longitude) {
      const distance = calculateDistance(
        userLocation[0], userLocation[1], 
        parseFloat(post.latitude), parseFloat(post.longitude)
      );

      // Aggiungi la distanza al post per mostrarla nella UI
      post.distance = distance.toFixed(1);

      // Filtro per distanza
      if (distance > currentDistanceFilter) {
        return false;
      }
    }

    return true;
  });

  // Ordina i post per distanza se è disponibile una posizione utente
  if (userLocation) {
    filteredPosts.sort((a, b) => {
      if (!a.distance) return 1;
      if (!b.distance) return -1;
      return parseFloat(a.distance) - parseFloat(b.distance);
    });
  }

  // Mostra i post filtrati
  if (filteredPosts.length > 0) {
    filteredPosts.forEach(post => {
      const statusClass = post.animalStatus === 'smarrito' ? 'lost-animal' : 'found-animal';
      const statusText = post.animalStatus === 'smarrito' ? 'SMARRITO' : 'TROVATO';

      const div = document.createElement('div');
      div.className = `post ${statusClass}`;

      // Aggiunta distanza se disponibile
      const distanceHtml = post.distance 
        ? `<span class="distance-tag">📍 ${post.distance} km</span>` 
        : '';

      div.innerHTML = `
        <div class="username">@${post.User.username}</div>
        <div class="animal-status ${statusClass}">${statusText}: ${post.animalType || 'Animale'}</div>
        <div class="post-image">
          <img src="${post.imageUrl}" alt="${post.animalType || 'Animale'} ${statusText}"/>
        </div>
        <p><strong>Descrizione: </strong> ${post.description}</p>
        ${post.locationName ? `<p class="location"><strong>Posizione:</strong> ${post.locationName} ${distanceHtml}</p>` : ''}
        ${post.contactInfo ? `<p><strong>Contatto:</strong> ${post.contactInfo}</p>` : ''}
      `;
      feed.appendChild(div);

      if (post.latitude && post.longitude) {
        // Colore diverso in base allo stato
        const iconColor = post.animalStatus === 'smarrito' ? 'var(--lost-color)' : 'var(--found-color)';

        // Crea un'icona personalizzata
        const customIcon = L.divIcon({
          className: `marker-icon ${post.animalStatus}`,
          html: `<div style="background-color: ${iconColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const marker = L.marker([post.latitude, post.longitude], { icon: customIcon }).addTo(map);
        marker.bindPopup(`
          <strong>${post.User.username}</strong><br>
          <strong>${statusText}:</strong> ${post.animalType || 'Animale'}<br>
          ${post.locationName || ''}
          ${post.distance ? `<br>Distanza: ${post.distance} km` : ''}
        `);
      }
    });
  } else {
    // Mostra messaggio se non ci sono risultati
    const noResults = document.createElement('div');
    noResults.className = 'no-results';
    noResults.textContent = 'Nessun risultato trovato con i filtri selezionati.';
    feed.appendChild(noResults);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadPosts();

  // Event listeners per i filtri - aggiornamento automatico
  document.getElementById('animalTypeFilter')?.addEventListener('change', (e) => {
    currentAnimalTypeFilter = e.target.value;
    filterAndDisplayPosts(); // Aggiorna automaticamente
  });

  document.getElementById('statusFilter')?.addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    filterAndDisplayPosts(); // Aggiorna automaticamente
  });

  document.getElementById('distanceFilter')?.addEventListener('input', (e) => {
    updateDistanceLabel(e.target.value);
    // filterAndDisplayPosts viene già chiamato in updateDistanceLabel
  });

  // Gestione della posizione utente
  document.getElementById('useMyLocation')?.addEventListener('click', () => {
    getUserLocation();
  });

  // Gestione della ricerca di posizione
  document.getElementById('searchLocationBtn')?.addEventListener('click', () => {
    const locationQuery = document.getElementById('locationSearch').value.trim();
    if (locationQuery) {
      searchLocation(locationQuery);
    }
  });

  // Invio della ricerca con il tasto Enter
  document.getElementById('locationSearch')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const locationQuery = e.target.value.trim();
      if (locationQuery) {
        searchLocation(locationQuery);
      }
    }
  });
});
