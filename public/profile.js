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
let currentPostId = null;

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
  // Salva l'ID del post corrente
  currentPostId = post.id;

  const statusClass = post.animalStatus === 'smarrito' ? 'lost-animal' : 'found-animal';
  const statusText = post.animalStatus === 'smarrito' ? 'SMARRITO' : 'TROVATO';

  // Aggiungi i pulsanti di azione solo se l'animale è ancora smarrito
  const actionButtons = post.animalStatus === 'smarrito' ? `
    <div class="modal-actions">
      <button id="markAsFoundButton" class="btn btn-success">Animale trovato</button>
      <button id="deletePostButton" class="btn btn-danger">Elimina post</button>
    </div>
  ` : `
    <div class="modal-actions">
      <button id="deletePostButton" class="btn btn-danger">Elimina post</button>
    </div>
  `;

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
    ${actionButtons}
  `;

  postModal.style.display = 'block';

  // Aggiungi event listener per i pulsanti
  const deleteButton = document.getElementById('deletePostButton');
  if (deleteButton) {
    deleteButton.addEventListener('click', () => deletePost(post.id));
  }

  const foundButton = document.getElementById('markAsFoundButton');
  if (foundButton) {
    foundButton.addEventListener('click', () => markAsFound(post.id));
  }

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

// Funzione per eliminare un post
async function deletePost(postId) {
  if (!confirm('Sei sicuro di voler eliminare questo post?')) {
    return;
  }

  try {
    const response = await fetch(`/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Errore durante l\'eliminazione del post');
    }

    // Chiudi il modal e ricarica i post
    postModal.style.display = 'none';
    if (modalMapInstance) {
      modalMapInstance.remove();
      modalMapInstance = null;
    }

    // Mostra messaggio di successo
    showNotification('Post eliminato con successo', 'success');

    // Ricarica i post dell'utente
    loadUserPosts();
  } catch (error) {
    console.error('Errore:', error);
    showNotification('Errore durante l\'eliminazione del post', 'error');
  }
}

// Funzione per segnare un animale come trovato
async function markAsFound(postId) {
  try {
    const response = await fetch(`/posts/${postId}/found`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Errore durante l\'aggiornamento dello stato del post');
    }

    // Chiudi il modal e ricarica i post
    postModal.style.display = 'none';
    if (modalMapInstance) {
      modalMapInstance.remove();
      modalMapInstance = null;
    }

    // Mostra messaggio di successo
    showNotification('Stato aggiornato a TROVATO', 'success');

    // Ricarica i post dell'utente
    loadUserPosts();
  } catch (error) {
    console.error('Errore:', error);
    showNotification('Errore durante l\'aggiornamento dello stato', 'error');
  }
}

// Funzione per mostrare notifiche all'utente
function showNotification(message, type = 'info') {
  // Crea elemento notifica
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Aggiungi alla pagina
  document.body.appendChild(notification);

  // Mostra con animazione
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Rimuovi dopo 3 secondi
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Gestione della chiusura del modal
closeButton.addEventListener('click', () => {
  postModal.style.display = 'none';
  if (modalMapInstance) {
    modalMapInstance.remove();
    modalMapInstance = null;
  }
  currentPostId = null;
});

// Chiudi il modal se si fa clic all'esterno
window.addEventListener('click', (event) => {
  if (event.target === postModal) {
    postModal.style.display = 'none';
    if (modalMapInstance) {
      modalMapInstance.remove();
      modalMapInstance = null;
    }
    currentPostId = null;
  }
});

// Carica i post dell'utente quando la pagina è pronta
document.addEventListener('DOMContentLoaded', loadUserPosts);
