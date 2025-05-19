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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));
app.use('/assets', express.static('public/assets'));

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

// Aggiungi questo modello dopo le definizioni degli altri modelli
const Pet = sequelize.define('Pet', {
  petName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  petType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  petBreed: DataTypes.STRING,
  petAge: DataTypes.STRING,
  petGender: DataTypes.STRING,
  petColor: DataTypes.STRING,
  petMicrochip: DataTypes.STRING,
  petNotes: DataTypes.TEXT,
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Aggiungi le relazioni
User.hasMany(Pet);
Pet.belongsTo(User);

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

// Servire le nuove pagine per la segnalazione di animali smarriti
app.get('/report-lost.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report-lost.html'));
});

app.get('/report-lost.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report-lost-form.js'));
});

app.get('/report-lost-form.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report-lost-form.js'));
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

// API per contrassegnare un animale come trovato e sovrascriverlo
// Migliore funzione mark-found con gestione errori dettagliata
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
      try {
        // Estrai il nome del file dalla URL
        const fileNameWithPath = post.imageUrl.replace(/^\/uploads\//, '');
        const imagePath = path.join(__dirname, 'uploads', fileNameWithPath);
        const stickerPath = path.join(__dirname, 'public', 'trovato-stamp.png');

        console.log('Verifica percorsi file:');
        console.log('- Percorso immagine:', imagePath);
        console.log('- Percorso sticker:', stickerPath);

        // Verifica che le directory esistano
        if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
          console.error('Directory uploads non trovata');
          return res.status(500).json({ error: 'Directory uploads non trovata' });
        }

        if (!fs.existsSync(path.join(__dirname, 'public'))) {
          console.error('Directory public non trovata');
          return res.status(500).json({ error: 'Directory public non trovata' });
        }

        // Verifica che i file esistano
        if (!fs.existsSync(imagePath)) {
          console.error('File immagine non trovato:', imagePath);
          return res.status(500).json({ error: `Immagine originale non trovata: ${fileNameWithPath}` });
        }

        if (!fs.existsSync(stickerPath)) {
          console.error('File sticker non trovato:', stickerPath);
          return res.status(500).json({ error: 'Sticker TROVATO non trovato' });
        }

        // Verifica che l'immagine possa essere letta
        try {
          await sharp(imagePath).metadata();
        } catch (readError) {
          console.error('Impossibile leggere l\'immagine:', readError);
          return res.status(500).json({ error: 'Impossibile leggere l\'immagine originale' });
        }

        // Verifica che lo sticker possa essere letto
        try {
          await sharp(stickerPath).metadata();
        } catch (readError) {
          console.error('Impossibile leggere lo sticker:', readError);
          return res.status(500).json({ error: 'Impossibile leggere lo sticker TROVATO' });
        }

        // Genera un nuovo nome file
        const timestamp = Date.now();
        const extension = path.extname(fileNameWithPath);
        const baseName = path.basename(fileNameWithPath, extension);
        const newFileName = `trovato_${baseName}_${timestamp}${extension}`;
        const newFilePath = path.join(__dirname, 'uploads', newFileName);

        console.log('Nuovo file:', newFilePath);

        // Ottieni informazioni sull'immagine
        const imageInfo = await sharp(imagePath).metadata();
        console.log('Dimensioni immagine:', imageInfo.width, 'x', imageInfo.height);

        // Calcola dimensioni per lo sticker
        const stickerWidth = Math.round(imageInfo.width * 0.7);
        const stickerHeight = Math.round(stickerWidth * 0.7);
        console.log('Dimensioni sticker calcolate:', stickerWidth, 'x', stickerHeight);

        // Crea un buffer per lo sticker ridimensionato
        const resizedStickerBuffer = await sharp(stickerPath)
          .resize(stickerWidth, stickerHeight)
          .toBuffer();

        // Crea l'immagine composita
        await sharp(imagePath)
          .composite([{
            input: resizedStickerBuffer,
            gravity: 'center',
            blend: 'over',
            rotate: -25
          }])
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(newFilePath);

        // Verifica che il nuovo file sia stato creato
        if (!fs.existsSync(newFilePath)) {
          console.error('File output non creato');
          return res.status(500).json({ error: 'Errore nella creazione dell\'immagine composita' });
        }

        // Aggiorna il path dell'immagine nel database
        post.imageUrl = `/uploads/${newFileName}`;
        post.animalStatus = 'trovato';
        await post.save();

        console.log('Post aggiornato con successo con nuova immagine:', post.imageUrl);

        res.json({ 
          success: true, 
          message: 'Animale contrassegnato come trovato', 
          newImageUrl: post.imageUrl 
        });
      } catch (imageError) {
        console.error('Errore durante la modifica dell\'immagine:', imageError);
        console.error(imageError.stack);
        return res.status(500).json({ 
          error: `Errore durante la modifica dell'immagine: ${imageError.message}` 
        });
      }
    } else {
      // L'animale è già contrassegnato come trovato
      res.json({ success: true, message: 'Animale già contrassegnato come trovato' });
    }
  } catch (error) {
    console.error('Errore nell\'aggiornamento del post:', error);
    res.status(500).json({ error: `Errore del server: ${error.message}` });
  }
});

// Aggiorna la rotta per servire profile.html e profile.js
app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/profile.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.js'));
});

// Servire la pagina di registrazione dell'animale
app.get('/register-pet.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register-pet.html'));
});

app.get('/register-pet.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register-pet.js'));
});

// Servire le librerie Cropper.js (se necessario)
app.get('/cropper.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cropper.js'));
});

app.get('/cropper.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cropper.css'));
});

// API per registrare un nuovo animale domestico
app.post('/pets', async (req, res) => {
  try {
    const { 
      userId, 
      petName, 
      petType, 
      petBreed, 
      petAge, 
      petGender, 
      petColor, 
      petMicrochip, 
      petNotes, 
      image 
    } = req.body;

    // Verifica che l'utente esista
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Verifica che sia stata inviata un'immagine
    if (!image) {
      return res.status(400).json({ error: 'Nessuna immagine fornita' });
    }

    // Estrai i dati dell'immagine
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Genera un nome file univoco
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = '.jpg'; // Forziamo l'estensione a jpg
    const fileName = `pet_${uniqueSuffix}${ext}`;
    const filePath = path.join(__dirname, 'uploads', fileName);

    // Assicurati che la directory uploads esista
    if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
      fs.mkdirSync(path.join(__dirname, 'uploads'));
    }

    // Salva l'immagine sul disco
    fs.writeFileSync(filePath, imageBuffer);

    const imageUrl = `/uploads/${fileName}`;

    // Crea il record del pet nel database
    const pet = await Pet.create({
      petName,
      petType,
      petBreed,
      petAge,
      petGender,
      petColor,
      petMicrochip,
      petNotes,
      imageUrl,
      UserId: userId
    });

    res.status(201).json({
      success: true,
      pet: {
        id: pet.id,
        petName: pet.petName,
        petType: pet.petType,
        imageUrl: pet.imageUrl,
        createdAt: pet.createdAt
      }
    });
  } catch (error) {
    console.error('Errore nella registrazione dell\'animale:', error);
    res.status(500).json({ error: 'Errore del server durante la registrazione dell\'animale' });
  }
});

// API per ottenere tutti gli animali di un utente
app.get('/pets/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Verifica che l'utente esista
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const pets = await Pet.findAll({
      where: {
        UserId: userId
      },
      order: [['createdAt', 'DESC']]
    });

    res.json(pets);
  } catch (error) {
    console.error('Errore nel recupero degli animali domestici:', error);
    res.status(500).json({ error: 'Errore del server durante il recupero degli animali domestici' });
  }
});

// API per ottenere un singolo animale
app.get('/pets/details/:id', async (req, res) => {
  try {
    const pet = await Pet.findByPk(req.params.id, {
      include: [{ 
        model: User, 
        attributes: ['username'] 
      }]
    });

    if (!pet) {
      return res.status(404).json({ error: 'Animale non trovato' });
    }

    res.json(pet);
  } catch (error) {
    console.error('Errore nel recupero dell\'animale:', error);
    res.status(500).json({ error: 'Errore del server durante il recupero dell\'animale' });
  }
});

// API per eliminare un animale
app.delete('/pets/:id', async (req, res) => {
  try {
    const petId = req.params.id;
    const { userId } = req.body;

    // Trova il pet
    const pet = await Pet.findByPk(petId);

    if (!pet) {
      return res.status(404).json({ error: 'Animale non trovato' });
    }

    // Verifica che il pet appartenga all'utente che sta tentando di eliminarlo
    if (pet.UserId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Non sei autorizzato a eliminare questo animale' });
    }

    // Elimina il file immagine se esiste
    if (pet.imageUrl) {
      const imagePath = path.join(__dirname, pet.imageUrl.replace(/^\/uploads/, 'uploads'));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Elimina il pet dal database
    await pet.destroy();

    res.json({ success: true, message: 'Animale eliminato con successo' });
    } catch (error) {
    console.error('Errore nell\'eliminazione dell\'animale:', error);
    res.status(500).json({ error: 'Errore del server durante l\'eliminazione dell\'animale' });
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
