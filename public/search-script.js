class PetFinderSearch {
    constructor() {
        this.currentSearchType = 'user';
        this.init();
    }

    init() {
        this.bindEvents();
        this.updatePlaceholder();
        this.checkUrlParameters();
    }

    checkUrlParameters() {
        const urlPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        
        // Controlla se ci sono parametri nell'URL come /search.html/IDanimale=2
        const pathMatch = urlPath.match(/\/search\.html\/ID(animale|utente)=(\d+)/i);
        
        // Oppure controlla parametri query string come ?IDanimale=2
        const animalId = urlParams.get('IDanimale') || urlParams.get('idanimale');
        const userId = urlParams.get('IDutente') || urlParams.get('idutente');
        
        if (pathMatch) {
            const type = pathMatch[1].toLowerCase();
            const id = pathMatch[2];
            
            if (type === 'animale') {
                this.setSearchType('pet');
                this.performDirectSearch('pet', id);
            } else if (type === 'utente') {
                this.setSearchType('user');
                this.performDirectSearch('user', id);
            }
        } else if (animalId) {
            this.setSearchType('pet');
            this.performDirectSearch('pet', animalId);
        } else if (userId) {
            this.setSearchType('user');
            this.performDirectSearch('user', userId);
        }
    }

    async performDirectSearch(type, id) {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
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
        // Gestione bottoni tipo ricerca
        document.querySelectorAll('.search-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setSearchType(e.target.dataset.type);
            });
        });

        // Gestione bottone ricerca
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.performSearch();
        });

        // Gestione invio con Enter
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
    }

    setSearchType(type) {
        this.currentSearchType = type;
        
        // Aggiorna UI bottoni
        document.querySelectorAll('.search-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        // Aggiorna placeholder
        this.updatePlaceholder();
        
        // Pulisci risultati precedenti
        this.hideResults();
    }

    updatePlaceholder() {
        const input = document.getElementById('searchInput');
        const placeholder = this.currentSearchType === 'user' 
            ? 'Inserisci ID utente...' 
            : 'Inserisci ID animale...';
        input.placeholder = placeholder;
        input.value = '';
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
                            <div class="post-item-with-image">
                                <div class="post-image-container">
                                    <img src="${post.imageUrl}" alt="Immagine post" class="post-image" onerror="this.style.display='none'">
                                </div>
                                <div class="post-content">
                                    <div class="post-header">
                                        <strong>${post.animalType || 'Animale'}</strong> - 
                                        <span class="status-badge status-${(post.animalStatus || 'smarrito').toLowerCase()}">${post.animalStatus || 'Smarrito'}</span>
                                    </div>
                                    <div class="post-description">
                                        ${post.description ? post.description.substring(0, 120) + (post.description.length > 120 ? '...' : '') : 'Nessuna descrizione'}
                                    </div>
                                    <div class="post-meta">
                                        ${post.locationName ? `📍 ${post.locationName}` : ''}
                                        ${post.contactInfo ? `📞 ${post.contactInfo}` : ''}
                                        <br><small>📅 ${new Date(post.createdAt).toLocaleDateString('it-IT')}</small>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        ${posts.length > 5 ? `<div class="more-posts">... e altri ${posts.length - 5} post</div>` : ''}
                    </div>
                ` : ''}

                ${pets.length > 0 ? `
                    <div class="posts-list">
                        <h4>Animali domestici registrati:</h4>
                        ${pets.slice(0, 3).map(pet => `
                            <div class="post-item-with-image">
                                <div class="post-image-container">
                                    <img src="${pet.imageUrl}" alt="${pet.petName}" class="post-image" onerror="this.style.display='none'">
                                </div>
                                <div class="post-content">
                                    <div class="post-header">
                                        <strong>${pet.petName}</strong> - ${pet.petType}
                                    </div>
                                    <div class="post-description">
                                        ${pet.petBreed ? `Razza: ${pet.petBreed}` : ''}
                                        ${pet.petAge ? ` • Età: ${pet.petAge}` : ''}
                                        ${pet.petGender ? ` • ${pet.petGender}` : ''}
                                        ${pet.petColor ? ` • Colore: ${pet.petColor}` : ''}
                                    </div>
                                    <div class="post-meta">
                                        ${pet.petMicrochip ? `🏷️ Microchip: ${pet.petMicrochip}` : ''}
                                        <br><small>📅 Registrato il ${new Date(pet.createdAt).toLocaleDateString('it-IT')}</small>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        ${pets.length > 3 ? `<div class="more-posts">... e altri ${pets.length - 3} animali</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;

        this.showResults();
    }

    displayPetResults(pet) {
        const resultsHeader = document.getElementById('resultsHeader');
        const resultsContent = document.getElementById('resultsContent');

        resultsHeader.textContent = `Risultati per Animale ID: ${pet.id}`;

        resultsContent.innerHTML = `
            <div class="result-card pet-result">
                <div class="result-header">
                    <h3>🐕 ${pet.petName}</h3>
                    <span class="result-id">ID: ${pet.id}</span>
                </div>
                
                <div class="pet-main-info">
                    <div class="pet-image-container">
                        <img src="${pet.imageUrl}" alt="${pet.petName}" class="pet-main-image" onerror="this.style.display='none'">
                    </div>
                    <div class="pet-info-grid">
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
                    <div class="pet-notes">
                        <h4>Note:</h4>
                        <p class="notes-content">${pet.petNotes}</p>
                    </div>
                ` : ''}
            </div>
        `;

        this.showResults();
    }

    showLoading() {
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsContent = document.getElementById('resultsContent');
        
        resultsContent.innerHTML = '<div class="loading">🔍 Ricerca in corso...</div>';
        resultsContainer.style.display = 'block';
    }

    showResults() {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.style.display = 'block';
    }

    hideResults() {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.style.display = 'none';
    }

    showNoResults(message) {
        const resultsHeader = document.getElementById('resultsHeader');
        const resultsContent = document.getElementById('resultsContent');

        resultsHeader.textContent = 'Nessun risultato';
        resultsContent.innerHTML = `<div class="no-results">${message}</div>`;
        
        this.showResults();
    }

    showError(message) {
        const resultsHeader = document.getElementById('resultsHeader');
        const resultsContent = document.getElementById('resultsContent');

        resultsHeader.textContent = 'Errore';
        resultsContent.innerHTML = `<div class="error-message">❌ ${message}</div>`;
        
        this.showResults();
    }
}

// Inizializza l'applicazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    new PetFinderSearch();
});
