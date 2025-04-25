// ======= Script per la pagina di registrazione =======
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Prendi tutti i campi del form
      const username = document.getElementById('regUsername').value;
      const password = document.getElementById('regPassword').value;
      const confirmPassword = document.getElementById('regConfirmPassword').value;
      const nome = document.getElementById('regNome').value;
      const cognome = document.getElementById('regCognome').value;
      const email = document.getElementById('regEmail').value;
      const dataNascita = document.getElementById('regDataNascita').value;
      const telefono = document.getElementById('regTelefono').value;

      // Validazione basica
      if (password !== confirmPassword) {
        alert('Le password non coincidono');
        return;
      }

      // Per ora inviamo solo username e password come nel server attuale
      // In futuro puoi estendere il server per accettare anche gli altri campi
      const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        alert('Registrazione riuscita! Ora puoi effettuare il login.');
        // Redirect alla pagina di login dopo la registrazione
        window.location.href = '/login.html';
      } else {
        alert(data.error);
      }
    });
  }
});