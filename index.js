const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// Aggiungi queste dipendenze all'inizio del file
const sharp = require('sharp');

// Configurazione Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test della connessione a Cloudinary
async function testCloudinaryConnection() {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Connessione a Cloudinary stabilita con successo:', result);
  } catch (error) {
    console.error('❌ Errore nella connessione a Cloudinary:', error);
  }
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));
app.use('/assets', express.static('public/assets'));

// Database setup - Configurazione per PostgreSQL su Render
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://localhost:5432/petfinder', {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false, // Disabilita i log SQL per un output più pulito
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test della connessione al database
async function testDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connessione al database PostgreSQL stabilita con successo.');
  } catch (error) {
    console.error('❌ Impossibile connettersi al database:', error);
  }
}

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
  cloudinaryId: {
    type: DataTypes.STRING,
    allowNull: true // Per compatibilità con immagini esistenti
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
  },
  cloudinaryId: {
    type: DataTypes.STRING,
    allowNull: true // Per compatibilità con immagini esistenti
  }
});

// Aggiungi le relazioni
User.hasMany(Pet);
Pet.belongsTo(User);

// Configurazione di Cloudinary Storage per Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'petfinder', // Cartella su Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' }, // Ridimensiona se necessario
      { quality: 'auto' } // Ottimizzazione automatica della qualità
    ]
  }
});

// Configurazione di Multer con Cloudinary
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // limite di 10MB (Cloudinary può gestire file più grandi)
  }
});

// Funzione helper per caricare immagine base64 su Cloudinary
async function uploadBase64ToCloudinary(base64Image, folder = 'petfinder') {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' }
      ]
    });
    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Errore upload Cloudinary:', error);
    throw error;
  }
}

// Funzione helper per applicare lo stamp "TROVATO" su Cloudinary
async function applyFoundStampCloudinary(originalPublicId) {
  try {
    // Carica lo stamp su Cloudinary se non è già presente
    let stampResult;
    try {
      // Controlla se lo stamp esiste già
      await cloudinary.api.resource('petfinder/trovato-stamp');
      stampResult = { public_id: 'petfinder/trovato-stamp' };
    } catch (error) {
      // Se non esiste, caricalo
      const stampPath = path.join(__dirname, 'public', 'trovato-stamp.png');
      if (fs.existsSync(stampPath)) {
        stampResult = await cloudinary.uploader.upload(stampPath, {
          public_id: 'petfinder/trovato-stamp',
          folder: 'petfinder'
        });
      } else {
        throw new Error('File stamp non trovato localmente');
      }
    }

    // Applica la trasformazione con overlay
    const transformedUrl = cloudinary.url(originalPublicId, {
      transformation: [
        {
          overlay: stampResult.public_id.replace('/', ':'),
          width: '0.7', // 70% della larghezza dell'immagine
          flags: 'relative',
          gravity: 'center',
          angle: -25
        },
        { quality: 'auto' }
      ]
    });

    // Carica la nuova immagine trasformata come nuovo asset
    const newResult = await cloudinary.uploader.upload(transformedUrl, {
      folder: 'petfinder',
      transformation: [
        { quality: 'auto' }
      ]
    });

    return {
      url: newResult.secure_url,
      publicId: newResult.public_id
    };
  } catch (error) {
    console.error('Errore nell\'applicazione dello stamp:', error);
    throw error;
  }
}

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

// API per creare un nuovo post (ora con Cloudinary)
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

    // L'immagine è già stata caricata su Cloudinary tramite multer
    const imageUrl = req.file.path; // URL di Cloudinary
    const cloudinaryId = req.file.filename; // Public ID di Cloudinary

    const post = await Post.create({
      imageUrl,
      cloudinaryId,
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
      cloudinaryId: post.cloudinaryId,
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

app.get('/posts', async (req, res) => {
  try {
    console.log('Richiesta ricevuta per /posts');
    
    // Test connessione database
    await sequelize.authenticate();
    console.log('Connessione database OK');
    
    const posts = await Post.findAll({
      include: [{ 
        model: User, 
        attributes: ['username'],
        required: false // LEFT JOIN invece di INNER JOIN
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log(`Trovati ${posts.length} post`);
    
    // Trasforma i dati per essere sicuri che siano serializzabili
    const serializedPosts = posts.map(post => {
      const postData = post.toJSON();
      return {
        ...postData,
        User: postData.User || { username: 'Utente sconosciuto' }
      };
    });

    res.json(serializedPosts);
  } catch (error) {
    console.error('Errore dettagliato nel recupero dei post:', error);
    res.status(500).json({ 
      error: 'Errore del server durante il recupero dei post',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

// API per eliminare un post (ora con eliminazione da Cloudinary)
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

    // Elimina l'immagine da Cloudinary se esiste
    if (post.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(post.cloudinaryId);
        console.log('Immagine eliminata da Cloudinary:', post.cloudinaryId);
      } catch (cloudinaryError) {
        console.error('Errore nell\'eliminazione da Cloudinary:', cloudinaryError);
        // Continuiamo comunque con l'eliminazione del post dal database
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

// API per contrassegnare un animale come trovato (ora con Cloudinary)
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
        if (post.cloudinaryId) {
          // Applica lo stamp usando Cloudinary
          const result = await applyFoundStampCloudinary(post.cloudinaryId);
          
          // Aggiorna il post con la nuova immagine
          post.imageUrl = result.url;
          post.cloudinaryId = result.publicId;
          post.animalStatus = 'trovato';
          await post.save();

          console.log('Post aggiornato con successo con nuova immagine da Cloudinary:', post.imageUrl);

          res.json({ 
            success: true, 
            message: 'Animale contrassegnato come trovato', 
            newImageUrl: post.imageUrl 
          });
        } else {
          // Fallback per immagini senza cloudinaryId (backward compatibility)
          post.animalStatus = 'trovato';
          await post.save();
          
          res.json({ 
            success: true, 
            message: 'Animale contrassegnato come trovato (senza modifica immagine)' 
          });
        }
      } catch (imageError) {
        console.error('Errore durante la modifica dell\'immagine su Cloudinary:', imageError);
        // Anche se l'immagine non può essere modificata, aggiorniamo lo status
        post.animalStatus = 'trovato';
        await post.save();
        
        res.json({ 
          success: true, 
          message: 'Animale contrassegnato come trovato (errore nella modifica immagine)',
          warning: 'Impossibile applicare lo stamp all\'immagine'
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


app.get('/test-connections.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-connections.html'));
});


// API per registrare un nuovo animale domestico (ora con Cloudinary)
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

    // Carica l'immagine su Cloudinary
    const uploadResult = await uploadBase64ToCloudinary(image, 'petfinder/pets');

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
      imageUrl: uploadResult.url,
      cloudinaryId: uploadResult.publicId,
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

// API per eliminare un animale (ora con eliminazione da Cloudinary)
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

    // Elimina l'immagine da Cloudinary se esiste
    if (pet.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(pet.cloudinaryId);
        console.log('Immagine pet eliminata da Cloudinary:', pet.cloudinaryId);
      } catch (cloudinaryError) {
        console.error('Errore nell\'eliminazione da Cloudinary:', cloudinaryError);
        // Continuiamo comunque con l'eliminazione del pet dal database
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

// Avvio del server con test delle connessioni
async function startServer() {
  try {
    // Testa la connessione al database
    await testDatabaseConnection();
    
    // Testa la connessione a Cloudinary
    await testCloudinaryConnection();
    
    // Sincronizza i modelli con il database
    await sequelize.sync();
    console.log('✅ Database sincronizzato con successo');
    
    // Avvia il server
    app.listen(PORT, () => {
      console.log(`✅ Server avviato con successo su http://localhost:${PORT}`);
      console.log(`📱 Feed disponibile su http://localhost:${PORT}/feed.html`);
      console.log(`📝 Crea post disponibile su http://localhost:${PORT}/create.html`);
      console.log(`🗄️ Database: ${process.env.DATABASE_URL ? 'PostgreSQL (Render)' : 'Fallback locale'}`);
      console.log(`☁️ Storage immagini: Cloudinary (${process.env.CLOUDINARY_CLOUD_NAME || 'non configurato'})`);
    });
  } catch (error) {
    console.error('❌ Errore durante l\'avvio del server:', error);
    process.exit(1);
  }
}
// Avvia il server
startServer();
