require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const userRouter = require('./routes/users');
const serviceRouter = require('./routes/services');
const messageRouter = require('./routes/messages');

// Initialisation de l'app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// Routes
app.use(userRouter);
app.use(serviceRouter);
app.use(messageRouter);

// Connexion à la base de données
mongoose.connect(process.env.DB_CONNECTION, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connecté à la base de données MongoDB');
}).catch((error) => {
  console.log('Erreur de connexion à MongoDB', error);
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});
