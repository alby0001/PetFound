// Funzione per caricare gli animali dell'utente
async function loadUserPets() {
  try {
    // Recupera l'utente corrente dal localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      console.error('Utente non trovato');
      return;
    }

    const res = await fetch(`/pets/${user.userId}`);

    if (!res.ok) {
      throw new Error('Errore nel caricamento degli animali');
    }

    const pets = await res.json();
    const petsContent = document.getElementById('petsContent');

    if (pets.length === 0) {
      noPets.style.display = 'block';
      petsContent.innerHTML = '';
      return;
    }

    petsContent.innerHTML = ''; // Pulisci il contenuto precedente
    noPets.style.display = 'none';

    pets.forEach(pet => {
      const petElement = document.createElement('div');
      petElement.className = 'post-card pet-card';
      petElement.innerHTML = `
        <div class="post-header">
          <div class="pet-type">${pet.petType}</div>
          <div class="post-date">${new Date(pet.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="post-image">
          <img src="${pet.imageUrl}?t=${Date.now()}" alt="${pet.petName}">
        </div>
        <div class="post-info">
          <h4>${pet.petName}</h4>
          <p>${pet.petBreed || 'Nessuna razza specificata'}</p>
        </div>
      `;

      // Aggiunta dell'event listener per aprire il modal con i dettagli dell'animale
      petElement.addEventListener('click', () => openPetModal(pet));

      petsContent.appendChild(petElement);
    });
  } catch (error) {
    console.error('Errore nel caricamento degli animali:', error);
    document.getElementById('petsContent').innerHTML = `
      <div class="error-message">
        Si è verificato un errore nel caricamento degli animali. Riprova più tardi.
      </div>
    `;
  }
}

// Funzione per aprire il modal con i dettagli dell'animale
function openPetModal(pet) {
  // Formatta le informazioni opzionali
  const petBreedInfo = pet.petBreed ? `<p><strong>Razza:</strong> ${pet.petBreed}</p>` : '';
  const petAgeInfo = pet.petAge ? `<p><strong>Età:</strong> ${pet.petAge}</p>` : '';
  const petGenderInfo = pet.petGender ? `<p><strong>Sesso:</strong> ${pet.petGender}</p>` : '';
  const petColorInfo = pet.petColor ? `<p><strong>Colore:</strong> ${pet.petColor}</p>` : '';
  const petMicrochipInfo = pet.petMicrochip ? `<p><strong>Microchip:</strong> ${pet.petMicrochip}</p>` : '';
  const petNotesInfo = pet.petNotes ? `<p><strong>Note:</strong> ${pet.petNotes}</p>` : '';

  petModalContent.innerHTML = `
    <div class="modal-header pet-header">
      <h3>${pet.petName}</h3>
    </div>
    <div class="modal-image">
      <img src="${pet.imageUrl}?t=${Date.now()}" alt="${pet.petName}">
    </div>
    <div class="modal-details">
      <p><strong>Tipo:</strong> ${pet.petType}</p>
      ${petBreedInfo}
      ${petAgeInfo}
      ${petGenderInfo}
      ${petColorInfo}
      ${petMicrochipInfo}
      ${petNotesInfo}
      <p><strong>Registrato il:</strong> ${new Date(pet.createdAt).toLocaleDateString()}</p>
      <div class="button-group">
        <button id="deletePetBtn" data-pet-id="${pet.id}" class="delete-btn">Elimina animale</button>
      </div>
    </div>
  `;

  petModal.style.display = 'block';
}

// Event listener per il pulsante elimina animale
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'deletePetBtn') {
    const petId = e.target.getAttribute('data-pet-id');
    deletePet(petId);
  }
});

// Funzione per eliminare un animale
async function deletePet(petId) {
  if (!confirm('Sei sicuro di voler eliminare questo animale?')) {
    return;
  }

  try {
    const user = JSON.parse(localStorage.getItem('user'));

    const res = await fetch(`/pets/${petId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: user.userId })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Errore durante l\'eliminazione dell\'animale');
    }

    // Chiudi il modal
    petModal.style.display = 'none';

    // Ricarica gli animali dell'utente per aggiornare la lista
    loadUserPets();

    alert('Animale eliminato con successo!');
  } catch (error) {
    console.error('Errore nell\'eliminazione dell\'animale:', error);
    alert(`Errore: ${error.message}`);
  }
}

// Aggiungi uno stile personalizzato per le schede degli animali
document.addEventListener('DOMContentLoaded', function() {
  // Se il foglio di stile non esiste già, crealo
  if (!document.getElementById('pet-styles')) {
    const style = document.createElement('style');
    style.id = 'pet-styles';
    style.textContent = `
      .pet-card {
        border: 2px solid #4a9c80;
      }
      .pet-type {
        background-color: #4a9c80;
        color: white;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: bold;
      }
      .pet-header {
        background-color: #4a9c80;
        color: white;
      }
      #petsContent {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
      }
    `;
    document.head.appendChild(style);
  }
});
