// Controllo se l'utente è loggato
const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
  window.location.href = '/login.html';
}

// Riferimenti agli elementi DOM
const profileUsername = document.getElementById('profileUsername');
const userPostsContainer = document.getElementById('userPostsContainer');
const noPosts = document.getElementById('noPosts');
const postModal = document.getElementById('postModal');
const modalContent = document.getElementById('modalContent');
const closeButton = document.querySelector('.close');
const modalMap = document.getElementById('modalMap');

let modalMapInstance = null;

// Impostare le informazioni dell'utente
profileUsername.textContent = user.username;

// Gestione del logout
document.getElementById('logoutButton').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('user');
  window.location.href = '/login.html';
});

// Caricamento dei post dell'utente
async function loadUserPosts() {
  try {
    const res = await fetch(`/user-posts/${user.userId}`);

    if (!res.ok) {
      throw new Error('Errore nel caricamento dei post');
    }

    const posts = await res.json();

    if (posts.length === 0) {
      noPosts.style.display = 'block';
      return;
    }

    userPostsContainer.innerHTML = '';

    posts.forEach(post => {
      const statusClass = post.animalStatus === 'smarrito' ? 'lost-animal' : 'found-animal';
      const statusText = post.animalStatus === 'smarrito' ? 'SMARRITO' : 'TROVATO';

      const postElement = document.createElement('div');
      postElement.className = `post-card ${statusClass}`;
      postElement.innerHTML = `
        <div class="post-header">
          <div class="animal-status ${statusClass}">${statusText}</div>
          <div class="post-date">${new Date(post.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="post-image">
          <img src="${post.imageUrl}" alt="${post.animalType || 'Animale'}">
        </div>
        <div class="post-info">
          <h4>${post.animalType || 'Animale'}</h4>
          <p class="location">${post.locationName || 'Nessuna posizione specificata'}</p>
        </div>
      `;

      // Aggiunta dell'event listener per aprire il modal
      postElement.addEventListener('click', () => openPostModal(post));

      userPostsContainer.appendChild(postElement);
    });
  } catch (error) {
    console.error('Errore nel caricamento dei post:', error);
    userPostsContainer.innerHTML = `
      <div class="error-message">
        Si è verificato un errore nel caricamento dei post. Riprova più tardi.
      </div>
    `;
  }
}

// Funzione per aprire il modal con i dettagli del post
function openPostModal(post) {
  const statusClass = post.animalStatus === 'smarrito' ? 'lost-animal' : 'found-animal';
  const statusText = post.animalStatus === 'smarrito' ? 'SMARRITO' : 'TROVATO';

  modalContent.innerHTML = `
    <div class="modal-header ${statusClass}">
      <h3>${statusText}: ${post.animalType || 'Animale'}</h3>
    </div>
    <div class="modal-image">
      <img src="${post.imageUrl}" alt="${post.animalType || 'Animale'}">
    </div>
    <div class="modal-details">
      <p><strong>Descrizione:</strong> ${post.description || 'Nessuna descrizione disponibile'}</p>
      <p><strong>Posizione:</strong> ${post.locationName || 'Nessuna posizione specificata'}</p>
      <p><strong>Contatto:</strong> ${post.contactInfo || 'Nessun contatto specificato'}</p>
      <p><strong>Data pubblicazione:</strong> ${new Date(post.createdAt).toLocaleDateString()}</p>
    </div>
  `;

  postModal.style.display = 'block';

  // Inizializza la mappa nel modal se ci sono le coordinate
  setTimeout(() => {
    if (post.latitude && post.longitude) {
      if (modalMapInstance) {
        modalMapInstance.remove();
      }

      modalMapInstance = L.map('modalMap').setView([post.latitude, post.longitude], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(modalMapInstance);

      const iconColor = post.animalStatus === 'smarrito' ? 'red' : 'green';

      const customIcon = L.divIcon({
        className: `marker-icon ${post.animalStatus}`,
        html: `<div style="background-color: ${iconColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      L.marker([post.latitude, post.longitude], { icon: customIcon }).addTo(modalMapInstance);

      // Forza il ridimensionamento della mappa dopo che il modal è visibile
      modalMapInstance.invalidateSize();
    } else {
      modalMap.style.display = 'none';
    }
  }, 300); // Piccolo ritardo per garantire che il modal sia visibile
}

// Gestione della chiusura del modal
closeButton.addEventListener('click', () => {
  postModal.style.display = 'none';
  if (modalMapInstance) {
    modalMapInstance.remove();
    modalMapInstance = null;
  }
});

// Chiudi il modal se si fa clic all'esterno
window.addEventListener('click', (event) => {
  if (event.target === postModal) {
    postModal.style.display = 'none';
    if (modalMapInstance) {
      modalMapInstance.remove();
      modalMapInstance = null;
    }
  }
});

// Carica i post dell'utente quando la pagina è pronta
document.addEventListener('DOMContentLoaded', loadUserPosts);