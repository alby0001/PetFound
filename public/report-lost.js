// Seleziona il modal per la scelta dell'animale smarrito
const selectPetModal = document.getElementById('selectPetModal');
const selectPetContent = document.getElementById('selectPetContent');
const selectPetCloseButton = document.querySelector('.select-pet-close');
const reportLostPetBtn = document.getElementById('reportLostPetBtn');

// Aggiungi l'event listener al pulsante "Ho smarrito un animale"
if (reportLostPetBtn) {
  reportLostPetBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    // Carica gli animali dell'utente e mostra il modal
    await loadPetsForSelection();
    selectPetModal.style.display = 'block';
  });
}

// Gestione della chiusura del modal di selezione animale
if (selectPetCloseButton) {
  selectPetCloseButton.addEventListener('click', () => {
    selectPetModal.style.display = 'none';
  });
}

// Chiudi il modal se si fa clic all'esterno
window.addEventListener('click', (event) => {
  if (event.target === selectPetModal) {
    selectPetModal.style.display = 'none';
  }
});

// Funzione per caricare gli animali dell'utente per la selezione
async function loadPetsForSelection() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    const res = await fetch(`/pets/${user.userId}`);

    if (!res.ok) {
      throw new Error('Errore nel caricamento degli animali');
    }

    const pets = await res.json();

    if (pets.length === 0) {
      selectPetContent.innerHTML = `
        <div class="no-pets-message">
          <p>Non hai ancora registrato nessun animale.</p>
          <a href="register-pet.html" class="btn">Registra il tuo primo animale</a>
        </div>
      `;
      return;
    }

    // Svuota il contenitore
    selectPetContent.innerHTML = '';

    // Crea le tesserine per ogni animale
    pets.forEach(pet => {
      const petCard = document.createElement('div');
      petCard.className = 'pet-card select-pet-card';
      petCard.innerHTML = `
        <div class="pet-image">
          <img src="${pet.imageUrl}?t=${Date.now()}" alt="${pet.petName}">
        </div>
        <div class="pet-info">
          <h4>${pet.petName}</h4>
          <p>${pet.petType}</p>
        </div>
      `;

      // Aggiungi l'event listener per la selezione dell'animale
      petCard.addEventListener('click', () => {
        // Salva l'animale selezionato in localStorage
        localStorage.setItem('lostPet', JSON.stringify({
          id: pet.id,
          petName: pet.petName,
          petType: pet.petType,
          imageUrl: pet.imageUrl
        }));

        // Chiudi il modal
        selectPetModal.style.display = 'none';

        // Reindirizza alla pagina di segnalazione smarrimento
        window.location.href = 'report-lost.html';
      });

      selectPetContent.appendChild(petCard);
    });
  } catch (error) {
    console.error('Errore nel caricamento degli animali:', error);
    selectPetContent.innerHTML = `
      <div class="error-message">
        Si è verificato un errore nel caricamento degli animali. Riprova più tardi.
      </div>
    `;
  }
}
