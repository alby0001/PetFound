const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use('/images', express.static('images')); // Aggiungiamo questo per servire le immagini statiche
app.use(express.static('public'));

// Database setup
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
  logging: false // Disabilita i log SQL per un output più pulito
});

// Models
const User = sequelize.define('User', {
  username: { 
    type: DataTypes.STRING, 
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Puoi aggiungere questi campi per supportare tutti i dati di registrazione
  // Per ora sono commentati perché non li stai utilizzando nel backend
  /*
  nome: DataTypes.STRING,
  cognome: DataTypes.STRING,
  email: { 
    type: DataTypes.STRING, 
    unique: true,
    validate: {
      isEmail: true
    }
  },
  dataNascita: DataTypes.DATE,
  telefono: DataTypes.STRING
  */
});

const Post = sequelize.define('Post', {
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  locationName: DataTypes.STRING,
  latitude: DataTypes.FLOAT,
  longitude: DataTypes.FLOAT,
  // Aggiungi questi campi per gli animali
  animalStatus: {
    type: DataTypes.STRING,
    defaultValue: 'smarrito'
  },
  animalType: DataTypes.STRING,
  contactInfo: DataTypes.STRING,
  // Aggiungiamo un campo per tenere traccia del post originale (se questo è un post "trovato")
  originalPostId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

// Relazioni
User.hasMany(Post);
Post.belongsTo(User);

// Configurazione di Multer per l'upload delle immagini
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Filtro per accettare solo immagini
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo i file immagine sono consentiti'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // limite di 5MB
  }
});

// Funzione di autenticazione semplice
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token di autenticazione non fornito' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // In un'implementazione reale, qui verificheresti il token JWT
    // Per ora, usiamo un approccio semplificato: controlliamo se l'ID utente esiste
    const userId = parseInt(token);
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(401).json({ error: 'Token non valido' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token non valido' });
  }
};

// ROUTES

// Pagina di login come home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Servire le pagine statiche
app.get('/feed.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'feed.html'));
});

app.get('/create.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create.html'));
});

// Questo ora punta a index.html invece di login.html
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Servire i file CSS e JS
app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'style.css'));
});

app.get('/script.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'script.js'));
});

// API per la registrazione
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password sono obbligatori' });
  }

  try {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username già in uso' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash });

    res.status(201).json({ 
      message: 'Utente creato con successo', 
      userId: user.id 
    });
  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    res.status(500).json({ error: 'Errore del server durante la registrazione' });
  }
});

// API per il login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password sono obbligatori' });
  }

  try {
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    res.json({ 
      message: 'Login effettuato con successo', 
      userId: user.id, 
      username: user.username 
    });
  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ error: 'Errore del server durante il login' });
  }
});

// API per creare un nuovo post
app.post('/posts', upload.single('image'), async (req, res) => {
  try {
    const { 
      userId, 
      description, 
      locationName, 
      latitude, 
      longitude, 
      animalStatus, 
      animalType, 
      contactInfo,
      originalPostId // Aggiungiamo questo campo
    } = req.body;

    // Verifica che l'utente esista
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    let imageUrl;

    // Se è specificato un URL dell'immagine esistente (ad es. per "Animale trovato")
    if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    } 
    // Altrimenti, verifica che sia stata caricata un'immagine
    else if (!req.file) {
      return res.status(400).json({ error: 'Nessuna immagine caricata' });
    } else {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const post = await Post.create({
      imageUrl,
      description,
      locationName,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      animalStatus,
      animalType,
      contactInfo,
      UserId: userId,
      originalPostId: originalPostId || null
    });

    res.status(201).json({
      id: post.id,
      imageUrl: post.imageUrl,
      description: post.description,
      locationName: post.locationName,
      latitude: post.latitude,
      longitude: post.longitude,
      animalStatus: post.animalStatus,
      animalType: post.animalType,
      contactInfo: post.contactInfo,
      createdAt: post.createdAt,
      originalPostId: post.originalPostId
    });
  } catch (error) {
    console.error('Errore nella creazione del post:', error);
    res.status(500).json({ error: 'Errore del server durante la creazione del post' });
  }
});

// API per ottenere tutti i post
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.findAll({
      include: [{ 
        model: User, 
        attributes: ['username'] 
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(posts);
  } catch (error) {
    console.error('Errore nel recupero dei post:', error);
    res.status(500).json({ error: 'Errore del server durante il recupero dei post' });
  }
});

// API per ottenere un singolo post
app.get('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [{ 
        model: User, 
        attributes: ['username'] 
      }]
    });

    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }

    res.json(post);
  } catch (error) {
    console.error('Errore nel recupero del post:', error);
    res.status(500).json({ error: 'Errore del server durante il recupero del post' });
  }
});

// API per eliminare un post
app.delete('/posts/:id', authenticateUser, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findByPk(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }

    // Verifica che l'utente sia il proprietario del post
    if (post.UserId !== req.user.id) {
      return res.status(403).json({ error: 'Non sei autorizzato a eliminare questo post' });
    }

    // Se il post ha un'immagine caricata (non un'immagine statica)
    if (post.imageUrl.startsWith('/uploads/')) {
      // Rimuovi l'immagine dal filesystem
      const imagePath = path.join(__dirname, post.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await post.destroy();

    res.json({ message: 'Post eliminato con successo' });
  } catch (error) {
    console.error('Errore durante l\'eliminazione del post:', error);
    res.status(500).json({ error: 'Errore del server durante l\'eliminazione del post' });
  }
});

// API per ottenere i post di un utente specifico
app.get('/user-posts/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Verifica che l'utente esista
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const posts = await Post.findAll({
      where: {
        UserId: userId
      },
      order: [['createdAt', 'DESC']]
    });

    res.json(posts);
  } catch (error) {
    console.error('Errore nel recupero dei post dell\'utente:', error);
    res.status(500).json({ error: 'Errore del server durante il recupero dei post' });
  }
});

// Aggiorna la rotta per servire profile.html e profile.js
app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/profile.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.js'));
});

// Servire il file common.js
app.get('/common.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'common.js'));
});

// Gestione degli errori
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.message === 'Solo i file immagine sono consentiti') {
    return res.status(400).json({ error: err.message });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File troppo grande (massimo 5MB)' });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Si è verificato un errore interno del server' });
});

// All'avvio dell'app, crea la directory per le immagini statiche se non esiste
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// Aggiungi questi endpoint al file index.js prima della riga "// Avvio del server"

// API per eliminare un post
app.delete('/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;

    // Trova il post
    const post = await Post.findByPk(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }

    // Ottieni il percorso del file immagine
    const imageUrl = post.imageUrl;
    const imagePath = path.join(__dirname, imageUrl);

    // Elimina il post dal database
    await post.destroy();

    // Elimina il file immagine dal filesystem se esiste
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.json({ message: 'Post eliminato con successo' });
  } catch (error) {
    console.error('Errore durante l\'eliminazione del post:', error);
    res.status(500).json({ error: 'Errore del server durante l\'eliminazione del post' });
  }
});

// API per segnare un animale come trovato e applicare lo sticker all'immagine
app.put('/posts/:id/found', async (req, res) => {
  try {
    const postId = req.params.id;

    // Trova il post
    const post = await Post.findByPk(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }

    // Verifica che l'animale sia attualmente smarrito
    if (post.animalStatus !== 'smarrito') {
      return res.status(400).json({ error: 'Questo animale è già stato segnato come trovato' });
    }

    // Ottieni il percorso del file immagine
    const imageUrl = post.imageUrl;
    const imagePath = path.join(__dirname, imageUrl);

    // Crea un nuovo nome file per l'immagine con lo sticker
    const originalFilename = path.basename(imageUrl);
    const fileExt = path.extname(originalFilename);
    const newFilename = originalFilename.replace(fileExt, '') + '-trovato' + fileExt;
    const newImagePath = path.join(path.dirname(imagePath), newFilename);
    const newImageUrl = imageUrl.replace(originalFilename, newFilename);

    // Carica l'immagine originale
    const Sharp = require('sharp');

    // Carica lo sticker TROVATO
    const stickerPath = path.join(__dirname, 'public', 'images', 'trovato-sticker.png');

    // Applica lo sticker all'immagine
    await Sharp(imagePath)
      .composite([
        {
          input: stickerPath,
          gravity: 'center'
        }
      ])
      .toFile(newImagePath);

    // Aggiorna il post con il nuovo status e la nuova immagine
    post.animalStatus = 'trovato';
    post.imageUrl = newImageUrl;
    await post.save();

    res.json({ 
      message: 'Post aggiornato con successo',
      post: {
        id: post.id,
        animalStatus: post.animalStatus,
        imageUrl: post.imageUrl
      }
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento del post:', error);
    res.status(500).json({ error: 'Errore del server durante l\'aggiornamento del post' });
  }
});

// Avvio del server
sequelize.sync()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server avviato con successo su http://localhost:${PORT}`);
      console.log(`📱 Feed disponibile su http://localhost:${PORT}/feed.html`);
      console.log(`📝 Crea post disponibile su http://localhost:${PORT}/create.html`);
    });
  })
  .catch(error => {
    console.error('Errore durante la sincronizzazione del database:', error);
  });
