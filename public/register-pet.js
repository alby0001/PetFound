// ======= Script per la registrazione di animali domestici =======
document.addEventListener('DOMContentLoaded', () => {
  // Controllo che sia presente l'utente loggato
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Devi effettuare il login per registrare un animale');
    window.location.href = '/';
    return;
  }
  const userId = user.userId;

  // Riferimenti agli elementi DOM
  const petForm = document.getElementById('petForm');
  const petTypeSelect = document.getElementById('petType');
  const otherTypeContainer = document.getElementById('otherTypeContainer');
  const otherTypeInput = document.getElementById('otherType');

  // NOTA: Ora utilizziamo la funzionalità condivisa in common.js
  // anziché duplicare il codice per il ritaglio dell'immagine

  // Gestione del logout
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('user');
      window.location.href = '/';
    });
  }

  // Mostra/nascondi il campo "altro tipo" in base alla selezione
  if (petTypeSelect) {
    petTypeSelect.addEventListener('change', () => {
      if (petTypeSelect.value === 'Altro') {
        otherTypeContainer.style.display = 'block';
        otherTypeInput.setAttribute('required', 'required');
      } else {
        otherTypeContainer.style.display = 'none';
        otherTypeInput.removeAttribute('required');
      }
    });
  }

  // Rinominiamo l'input per renderlo compatibile con common.js
  const petImage = document.getElementById('petImage');
  if (petImage) {
    // Imposta l'id dell'elemento a 'imageInput' in modo che common.js possa lavorarci
    petImage.id = 'imageInput';
  }

  // Gestione invio form
  if (petForm) {
    petForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validazione campi obbligatori
      const petName = document.getElementById('petName').value.trim();
      let petType = petTypeSelect.value.trim();

      if (petType === 'Altro') {
        petType = otherTypeInput.value.trim();
        if (!petType) {
          alert('Specifica il tipo di animale');
          return;
        }
      }

      if (!petName) {
        alert('Inserisci il nome dell\'animale');
        return;
      }

      if (!petType) {
        alert('Seleziona il tipo di animale');
        return;
      }

      // Controllo se è stata ritagliata l'immagine
      // Ora usiamo la variabile globale croppedImageData da common.js
      if (!croppedImageData) {
        alert('Per favore, ritaglia l\'immagine prima di registrare l\'animale');
        return;
      }

      // Raccolta dati form
      const petData = {
        userId: user.userId,
        petName: petName,
        petType: petType,
        petBreed: document.getElementById('petBreed').value.trim(),
        petAge: document.getElementById('petAge').value.trim(),
        petGender: document.getElementById('petGender').value,
        petColor: document.getElementById('petColor').value.trim(),
        petMicrochip: document.getElementById('petMicrochip').value.trim(),
        petNotes: document.getElementById('petNotes').value.trim(),
        image: croppedImageData // Ora usiamo la variabile da common.js
      };

      try {
        // Feedback all'utente
        const submitButton = petForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Registrazione in corso...';
        submitButton.disabled = true;

        // Invio dati al server
        const response = await fetch('/pets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(petData)
        });

        const result = await response.json();

        if (response.ok) {
          alert('Animale registrato con successo!');
          window.location.href = '/profile.html';
        } else {
          alert(result.error || 'Errore durante la registrazione dell\'animale');
          // Ripristina il pulsante
          submitButton.textContent = originalText;
          submitButton.disabled = false;
        }
      } catch (error) {
        console.error('Errore durante la registrazione dell\'animale:', error);
        alert('Si è verificato un errore. Riprova più tardi.');

        // Ripristina il pulsante in caso di errore
        const submitButton = petForm.querySelector('button[type="submit"]');
        if (submitButton.disabled) {
          submitButton.textContent = 'Registra animale';
          submitButton.disabled = false;
        }
      }
    });
  }
});
