class PetFinderSearch {
    constructor() {
        this.currentSearchType = 'user';
        this.init();
    }

    init() {
        this.bindEvents();
        this.updatePlaceholder();
        // Aggiungi un delay per assicurarti che la pagina sia completamente caricata
        setTimeout(() => {
            this.checkUrlParameters();
        }, 100);
    }

    checkUrlParameters() {
        console.log('Controllo parametri URL...');
        console.log('Current URL:', window.location.href);
        console.log('Pathname:', window.location.pathname);
        console.log('Search:', window.location.search);
        
        const urlPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        
        // Metodo 1: Controlla parametri nel path come /search.html/IDanimale=2
        const pathMatch = urlPath.match(/\/search\.html\/ID(animale|utente)=(\d+)/i);
        console.log('Path match:', pathMatch);
        
        // Metodo 2: Controlla parametri query string come ?IDanimale=2
        const animalId = urlParams.get('IDanimale') || urlParams.get('idanimale');
        const userId = urlParams.get('IDutente') || urlParams.get('idutente');
        console.log('Query params - animalId:', animalId, 'userId:', userId);
        
        if (pathMatch) {
            const type = pathMatch[1].toLowerCase();
            const id = pathMatch[2];
            console.log('Trovato match nel path:', type, id);
            
            if (type === 'animale') {
                this.setSearchType('pet');
                this.performDirectSearch('pet', id);
            } else if (type === 'utente') {
                this.setSearchType('user');
                this.performDirectSearch('user', id);
            }
        } else if (animalId) {
            console.log('Trovato animalId nei query params:', animalId);
            this.setSearchType('pet');
            this.performDirectSearch('pet', animalId);
        } else if (userId) {
            console.log('Trovato userId nei query params:', userId);
            this.setSearchType('user');
            this.performDirectSearch('user', userId);
        } else {
            console.log('Nessun parametro URL trovato');
        }
    }

    async performDirectSearch(type, id) {
        console.log('Esecuzione ricerca diretta:', type, id);
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        if (!searchInput || !searchBtn) {
            console.error('Elementi input non trovati, riprovo tra 500ms...');
            setTimeout(() => {
                this.performDirectSearch(type, id);
            }, 500);
            return;
        }
        
        // Imposta il valore nell'input
        searchInput.value = id;
        
        // Disabilita il bottone durante la ricerca
        searchBtn.disabled = true;
        searchBtn.textContent = 'Cercando...';

        try {
            this.showLoading();

            if (type === 'user') {
                await this.searchUser(parseInt(id));
            } else {
                await this.searchPet(parseInt(id));
            }
        } catch (error) {
            console.error('Errore durante la ricerca automatica:', error);
            this.showError('Errore durante la ricerca automatica. Riprova più tardi.');
        } finally {
            // Riabilita il bottone
            searchBtn.disabled = false;
            searchBtn.textContent = 'Cerca';
        }
    }

    bindEvents() {
        // Aspetta che gli elementi siano disponibili
        const waitForElements = () => {
            const searchTypeButtons = document.querySelectorAll('.search-type-btn');
            const searchBtn = document.getElementById('searchBtn');
            const searchInput = document.getElementById('searchInput');
            
            if (searchTypeButtons.length === 0 || !searchBtn || !searchInput) {
                console.log('Elementi non ancora disponibili, riprovo...');
                setTimeout(waitForElements, 100);
                return;
            }
            
            console.log('Elementi trovati, binding eventi...');
            
            // Gestione bottoni tipo ricerca
            searchTypeButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.setSearchType(e.target.dataset.type);
                });
            });

            // Gestione bottone ricerca
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });

            // Gestione invio con Enter
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
            
            console.log('Eventi collegati con successo');
        };
        
        waitForElements();
    }

    setSearchType(type) {
        console.log('Impostazione tipo ricerca:', type);
        this.currentSearchType = type;
        
        // Aggiorna UI bottoni
        document.querySelectorAll('.search-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-type="${type}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Aggiorna placeholder
        this.updatePlaceholder();
        
        // Pulisci risultati precedenti
        this.hideResults();
    }

    updatePlaceholder() {
        const input = document.getElementById('searchInput');
        if (input) {
            const placeholder = this.currentSearchType === 'user' 
                ? 'Inserisci ID utente...' 
                : 'Inserisci ID animale...';
            input.placeholder = placeholder;
            // Non pulire il valore se stiamo caricando da URL
            if (!window.location.pathname.includes('/ID') && !window.location.search.includes('ID')) {
                input.value = '';
            }
        }
    }

    async performSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const id = searchInput.value.trim();

        if (!id) {
            this.showError('Inserisci un ID valido');
            return;
        }

        if (!/^\d+$/.test(id)) {
            this.showError('L\'ID deve essere un numero');
            return;
        }

        // Disabilita il bottone durante la ricerca
        searchBtn.disabled = true;
        searchBtn.textContent = 'Cercando...';

        try {
            this.showLoading();

            if (this.currentSearchType === 'user') {
                await this.searchUser(parseInt(id));
            } else {
                await this.searchPet(parseInt(id));
            }
        } catch (error) {
            console.error('Errore durante la ricerca:', error);
            this.showError('Errore durante la ricerca. Riprova più tardi.');
        } finally {
            // Riabilita il bottone
            searchBtn.disabled = false;
            searchBtn.textContent = 'Cerca';
        }
    }

    async searchUser(userId) {
        console.log('Ricerca utente ID:', userId);
        try {
            // Cerca l'utente tramite i suoi post (non abbiamo un endpoint diretto per gli utenti)
            const response = await fetch(`/user-posts/${userId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    this.showNoResults(`Utente con ID ${userId} non trovato`);
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const posts = await response.json();
            
            // Ottieni informazioni utente dal primo post (se esiste)
            let username = 'Sconosciuto';
            if (posts.length > 0) {
                // Cerca di ottenere l'username da tutti i post
                const allPostsResponse = await fetch('/posts');
                if (allPostsResponse.ok) {
                    const allPosts = await allPostsResponse.json();
                    const userPost = allPosts.find(post => post.UserId === userId);
                    if (userPost && userPost.User) {
                        username = userPost.User.username;
                    }
                }
            }

            // Cerca anche gli animali dell'utente
            const petsResponse = await fetch(`/pets/${userId}`);
            let pets = [];
            if (petsResponse.ok) {
                pets = await petsResponse.json();
            }

            this.displayUserResults(userId, username, posts, pets);
        } catch (error) {
            console.error('Errore nella ricerca utente:', error);
            this.showError('Errore nella ricerca dell\'utente');
        }
    }

    async searchPet(petId) {
        console.log('Ricerca animale ID:', petId);
        try {
            const response = await fetch(`/pets/details/${petId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    this.showNoResults(`Animale con ID ${petId} non trovato`);
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const pet = await response.json();
            this.displayPetResults(pet);
        } catch (error) {
            console.error('Errore nella ricerca animale:', error);
            this.showError('Errore nella ricerca dell\'animale');
        }
    }

    displayUserResults(userId, username, posts, pets) {
        const resultsHeader = document.getElementById('resultsHeader');
        const resultsContent = document.getElementById('resultsContent');

        if (!resultsHeader || !resultsContent) {
            console.error('Elementi risultati non trovati');
            return;
        }

        resultsHeader.textContent = `Risultati per Utente ID: ${userId}`;

        resultsContent.innerHTML = `
            <div class="result-card user-result">
                <div class="result-header">
                    <h3>👤 ${username}</h3>
                    <span class="result-id">ID: ${userId}</span>
                </div>
                
                <div class="result-details">
                    <div class="detail-item">
                        <span class="detail-label">Username</span>
                        <span class="detail-value">${username}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Post pubblicati</span>
                        <span class="detail-value">${posts.length}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Animali registrati</span>
                        <span class="detail-value">${pets.length}</span>
                    </div>
                </div>

                ${posts.length > 0 ? `
                    <div class="posts-list">
                        <h4>Post recenti:</h4>
                        ${posts.slice(0, 5).map(post => `
                            <div class="post-item">
                                <strong>${post.animalType || 'Animale'}</strong> - ${post.animalStatus || 'Stato sconosciuto'}
                                <br><small>${post.description ? post.description.substring(0, 100) + '...' : 'Nessuna descrizione'}</small>
                                <br><small>📅 ${new Date(post.createdAt).toLocaleDateString('it-IT')}</small>
                            </div>
                        `).join('')}
                        ${posts.length > 5 ? `<small>... e altri ${posts.length - 5} post</small>` : ''}
                    </div>
                ` : ''}

                ${pets.length > 0 ? `
                    <div class="posts-list">
                        <h4>Animali domestici registrati:</h4>
                        ${pets.slice(0, 3).map(pet => `
                            <div class="post-item">
                                <strong>${pet.petName}</strong> - ${pet.petType}
                                ${pet.petBreed ? `<br><small>Razza: ${pet.petBreed}</small>` : ''}
                                <br><small>📅 Registrato il ${new Date(pet.createdAt).toLocaleDateString('it-IT')}</small>
                            </div>
                        `).join('')}
                        ${pets.length > 3 ? `<small>... e altri ${pets.length - 3} animali</small>` : ''}
                    </div>
                ` : ''}
            </div>
        `;

        this.showResults();
    }

    displayPetResults(pet) {
        const resultsHeader = document.getElementById('resultsHeader');
        const resultsContent = document.getElementById('resultsContent');

        if (!resultsHeader || !resultsContent) {
            console.error('Elementi risultati non trovati');
            return;
        }

        resultsHeader.textContent = `Risultati per Animale ID: ${pet.id}`;

        resultsContent.innerHTML = `
            <div class="result-card pet-result">
                <div class="result-header">
                    <h3>🐕 ${pet.petName}</h3>
                    <span class="result-id">ID: ${pet.id}</span>
                </div>
                
                <div style="display: flex; align-items: flex-start; gap: 1rem;">
                    ${pet.imageUrl ? `<img src="${pet.imageUrl}" alt="${pet.petName}" class="pet-image">` : ''}
                    <div class="result-details" style="flex: 1;">
                        <div class="detail-item">
                            <span class="detail-label">Nome</span>
                            <span class="detail-value">${pet.petName}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Tipo</span>
                            <span class="detail-value">${pet.petType}</span>
                        </div>
                        ${pet.petBreed ? `
                            <div class="detail-item">
                                <span class="detail-label">Razza</span>
                                <span class="detail-value">${pet.petBreed}</span>
                            </div>
                        ` : ''}
                        ${pet.petAge ? `
                            <div class="detail-item">
                                <span class="detail-label">Età</span>
                                <span class="detail-value">${pet.petAge}</span>
                            </div>
                        ` : ''}
                        ${pet.petGender ? `
                            <div class="detail-item">
                                <span class="detail-label">Sesso</span>
                                <span class="detail-value">${pet.petGender}</span>
                            </div>
                        ` : ''}
                        ${pet.petColor ? `
                            <div class="detail-item">
                                <span class="detail-label">Colore</span>
                                <span class="detail-value">${pet.petColor}</span>
                            </div>
                        ` : ''}
                        ${pet.petMicrochip ? `
                            <div class="detail-item">
                                <span class="detail-label">Microchip</span>
                                <span class="detail-value">${pet.petMicrochip}</span>
                            </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-label">Proprietario</span>
                            <span class="detail-value">${pet.User ? pet.User.username : 'Sconosciuto'} (ID: ${pet.UserId})</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Registrato il</span>
                            <span class="detail-value">${new Date(pet.createdAt).toLocaleDateString('it-IT')}</span>
                        </div>
                    </div>
                </div>
                
                ${pet.petNotes ? `
                    <div style="margin-top: 1rem;">
                        <span class="detail-label">Note:</span>
                        <p style="margin-top: 0.5rem; padding: 0.5rem; background: white; border-radius: 4px; border: 1px solid #e0e0e0;">
                            ${pet.petNotes}
                        </p>
                    </div>
                ` : ''}
            </div>
        `;

        this.showResults();
    }

    showLoading() {
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsContent = document.getElementById('resultsContent');
        
        if (resultsContent) {
            resultsContent.innerHTML = '<div class="loading">🔍 Ricerca in corso...</div>';
        }
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
        }
    }

    showResults() {
        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
        }
    }

    hideResults() {
        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }

    showNoResults(message) {
        const resultsHeader = document.getElementById('resultsHeader');
        const resultsContent = document.getElementById('resultsContent');

        if (resultsHeader) resultsHeader.textContent = 'Nessun risultato';
        if (resultsContent) resultsContent.innerHTML = `<div class="no-results">${message}</div>`;
        
        this.showResults();
    }

    showError(message) {
        const resultsHeader = document.getElementById('resultsHeader');
        const resultsContent = document.getElementById('resultsContent');

        if (resultsHeader) resultsHeader.textContent = 'Errore';
        if (resultsContent) resultsContent.innerHTML = `<div class="error-message">❌ ${message}</div>`;
        
        this.showResults();
    }
}

// Inizializza l'applicazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM caricato, inizializzazione PetFinderSearch...');
    new PetFinderSearch();
});

// Backup: inizializza anche su window.load se DOMContentLoaded non è scattato
window.addEventListener('load', () => {
    if (!window.petFinderSearchInitialized) {
        console.log('Inizializzazione backup su window.load...');
        window.petFinderSearchInitialized = true;
        new PetFinderSearch();
    }
});
