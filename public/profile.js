// Controllo se l'utente è loggato
const user = JSON.parse(localStorage.getItem('user'));
if (!user) {
  window.location.href = '/login.html';
}

// Riferimenti agli elementi DOM
const profileUsername = document.getElementById('profileUsername');
const userPostsContainer = document.getElementById('userPostsContainer');
const userPetsContainer = document.getElementById('userPetsContainer');
const noPosts = document.getElementById('noPosts');
const noPets = document.getElementById('noPets');
const postModal = document.getElementById('postModal');
const petModal = document.getElementById('petModal');
const modalContent = document.getElementById('modalContent');
const petModalContent = document.getElementById('petModalContent');
const closeButton = document.querySelector('.close');
const petCloseButton = document.querySelector('.pet-close');
const modalMap = document.getElementById('modalMap');
const showPostsTab = document.getElementById('showPostsTab');
const showPetsTab = document.getElementById('showPetsTab');

let modalMapInstance = null;

// Impostare le informazioni dell'utente
profileUsername.textContent = user.username;

// Funzione per gestire i parametri URL
function handleURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  const action = urlParams.get('action');

  if (tab === 'pets') {
    // Attiva il tab "I miei animali"
    showPetsTab.click();

    if (action === 'report-lost') {
      // Attendere un po' per assicurarsi che il tab sia caricato
      setTimeout(() => {
        // Triggerare il click sul pulsante "Ho smarrito un animale"
        const reportLostBtn = document.getElementById('reportLostPetBtn');
        if (reportLostBtn) {
          reportLostBtn.click();
        }
      }, 500);
    }
  }
}

// Gestione del logout
document.getElementById('logoutButton').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('user');
  window.location.href = '/login.html';
});

// Gestione dei tab
showPostsTab.addEventListener('click', (e) => {
  e.preventDefault();
  userPostsContainer.style.display = 'grid';
  userPetsContainer.style.display = 'none';
  showPostsTab.classList.add('active');
  showPetsTab.classList.remove('active');

  // Pulisce i parametri URL quando si cambia tab
  const url = new URL(window.location);
  url.searchParams.delete('tab');
  url.searchParams.delete('action');
  window.history.replaceState({}, '', url);
});

showPetsTab.addEventListener('click', (e) => {
  e.preventDefault();
  userPostsContainer.style.display = 'none';
  userPetsContainer.style.display = 'block'; // Cambiato da 'grid' a 'block' per garantire la visualizzazione corretta
  showPostsTab.classList.remove('active');
  showPetsTab.classList.add('active');
  loadUserPets(); // Carica gli animali dell'utente
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
          <img src="${post.imageUrl}?t=${Date.now()}" alt="${post.animalType || 'Animale'}">
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

  // Bottone "Animale trovato" solo se lo stato è "smarrito"
  const foundButtonHTML = post.animalStatus === 'smarrito' 
    ? `<button id="markAsFoundBtn" data-post-id="${post.id}" class="found-btn">Animale trovato</button>`
    : '';

  modalContent.innerHTML = `
    <div class="modal-header ${statusClass}">
      <h3>${statusText}: ${post.animalType || 'Animale'}</h3>
    </div>
    <div class="modal-image">
      <img src="${post.imageUrl}?t=${Date.now()}" alt="${post.animalType || 'Animale'}">
    </div>
    <div class="modal-details">
      <p><strong>Descrizione:</strong> ${post.description || 'Nessuna descrizione disponibile'}</p>
      <p><strong>Posizione:</strong> ${post.locationName || 'Nessuna posizione specificata'}</p>
      <p><strong>Contatto:</strong> ${post.contactInfo || 'Nessun contatto specificato'}</p>
      <p><strong>Data pubblicazione:</strong> ${new Date(post.createdAt).toLocaleDateString()}</p>
      <div class="button-group">
        ${foundButtonHTML}
        <button id="deletePostBtn" data-post-id="${post.id}" class="delete-btn">Elimina segnalazione</button>
      </div>
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

petCloseButton.addEventListener('click', () => {
  petModal.style.display = 'none';
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
  if (event.target === petModal) {
    petModal.style.display = 'none';
  }
});

// Funzione per eliminare un post
async function deletePost(postId) {
  if (!confirm('Sei sicuro di voler eliminare questa segnalazione?')) {
    return;
  }

  try {
    const res = await fetch(`/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: user.userId })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Errore durante l\'eliminazione del post');
    }

    // Chiudi il modal
    postModal.style.display = 'none';
    if (modalMapInstance) {
      modalMapInstance.remove();
      modalMapInstance = null;
    }

    // Ricarica i post dell'utente per aggiornare la lista
    loadUserPosts();

    alert('Segnalazione eliminata con successo!');
  } catch (error) {
    console.error('Errore nell\'eliminazione del post:', error);
    alert(`Errore: ${error.message}`);
  }
}

// Funzione per contrassegnare un animale come trovato
async function markAsFound(postId) {
  if (!confirm('Vuoi contrassegnare questo animale come trovato?')) {
    return;
  }

  try {
    const res = await fetch(`/posts/${postId}/mark-found`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: user.userId })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Errore durante l\'aggiornamento della segnalazione');
    }

    // Chiudi il modal
    postModal.style.display = 'none';
    if (modalMapInstance) {
      modalMapInstance.remove();
      modalMapInstance = null;
    }

    // Ricarica i post dell'utente per aggiornare la lista
    loadUserPosts();

    alert('Animale contrassegnato come trovato!');
  } catch (error) {
    console.error('Errore nell\'aggiornamento del post:', error);
    alert(`Errore: ${error.message}`);
  }
}

// Event listener per il pulsante elimina
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'deletePostBtn') {
    const postId = e.target.getAttribute('data-post-id');
    deletePost(postId);
  }
});

// Event listener per il pulsante "Animale trovato"
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'markAsFoundBtn') {
    const postId = e.target.getAttribute('data-post-id');
    markAsFound(postId);
  }
});

// Carica i post dell'utente quando la pagina è pronta e gestisce i parametri URL
document.addEventListener('DOMContentLoaded', () => {
  loadUserPosts();
  handleURLParameters(); // Gestisce i parametri URL dopo il caricamento della pagina
});
