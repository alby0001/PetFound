const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;


// Aggiungi queste dipendenze all'inizio del file
const sharp = require('sharp');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
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
  contactInfo: DataTypes.STRING
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
      contactInfo 
    } = req.body;

    // Verifica che l'utente esista
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Verifica che sia stata caricata un'immagine
    if (!req.file) {
      return res.status(400).json({ error: 'Nessuna immagine caricata' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const post = await Post.create({
      imageUrl,
      description,
      locationName,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      animalStatus,
      animalType,
      contactInfo,
      UserId: userId
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
      createdAt: post.createdAt
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

// API per eliminare un post
app.delete('/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const { userId } = req.body;

    // Trova il post
    const post = await Post.findByPk(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }

    // Verifica che il post appartenga all'utente che sta tentando di eliminarlo
    if (post.UserId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Non sei autorizzato a eliminare questo post' });
    }

    // Elimina il file immagine se esiste
    if (post.imageUrl) {
      const imagePath = path.join(__dirname, post.imageUrl.replace(/^\/uploads/, 'uploads'));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Elimina il post dal database
    await post.destroy();

    res.json({ success: true, message: 'Post eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione del post:', error);
    res.status(500).json({ error: 'Errore del server durante l\'eliminazione del post' });
  }
});

// API per marcare un animale come trovato
app.put('/posts/:id/mark-found', async (req, res) => {
  try {
    const postId = req.params.id;
    const { userId } = req.body;

    // Trova il post
    const post = await Post.findByPk(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post non trovato' });
    }

    // Verifica che il post appartenga all'utente che sta tentando di modificarlo
    if (post.UserId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Non sei autorizzato a modificare questo post' });
    }

    // Procedi solo se l'animale non è già segnato come trovato
    if (post.animalStatus !== 'trovato') {
      // Modifica l'immagine aggiungendo lo sticker TROVATO
      try {
        // Percorso completo del file immagine
        const imagePath = path.join(__dirname, post.imageUrl.replace(/^\/uploads/, 'uploads'));
        // Percorso dello sticker TROVATO
        const trovato_sticker = path.join(__dirname, 'public', 'trovato-stamp.png');

        // Verifica che i file esistano
        if (!fs.existsSync(imagePath)) {
          throw new Error('Immagine originale non trovata');
        }
        if (!fs.existsSync(trovato_sticker)) {
          throw new Error('Sticker TROVATO non trovato');
        }

        // Ottieni le dimensioni dell'immagine originale
        const imageMetadata = await sharp(imagePath).metadata();

        // Sovrapponi lo sticker TROVATO all'immagine (ruotato leggermente e semi-trasparente)
        await sharp(imagePath)
          .composite([{
            input: trovato_sticker,
            blend: 'over',
            gravity: 'center',
            // Ridimensiona lo sticker a circa il 70% dell'immagine originale
            width: Math.floor(imageMetadata.width * 0.7),
            height: Math.floor(imageMetadata.width * 0.7 * 0.25), // Mantiene le proporzioni dello sticker
            // Ruota leggermente lo sticker
            rotate: -15,
            // Rendi lo sticker leggermente trasparente
            opacity: 0.9
          }])
          .toBuffer()
          .then(buffer => {
            // Sovrascrivi l'immagine originale con quella modificata
            fs.writeFileSync(imagePath, buffer);
          });

        console.log(`Immagine modificata con successo: ${imagePath}`);
      } catch (imageError) {
        console.error('Errore durante la modifica dell\'immagine:', imageError);
        // Continuiamo comunque con l'aggiornamento dello stato anche se la modifica dell'immagine fallisce
      }

      // Aggiorna lo stato dell'animale a "trovato"
      post.animalStatus = 'trovato';
      await post.save();
    }

    res.json({ success: true, message: 'Animale contrassegnato come trovato' });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del post:', error);
    res.status(500).json({ error: 'Errore del server durante l\'aggiornamento del post' });
  }
});

// Aggiorna la rotta per servire profile.html e profile.js
app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/profile.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.js'));
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
