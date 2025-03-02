const express = require('express');
const { User } = require('../models/user');
const auth = require('../middleware/auth');
const router = new express.Router();

// Inscription d'un utilisateur
router.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

// Connexion
router.post('/users/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      return res.status(400).send({ error: 'Identifiants incorrects' });
    }
    
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    
    if (!isMatch) {
      return res.status(400).send({ error: 'Identifiants incorrects' });
    }
    
    const token = await user.generateAuthToken();
    res.send({ user, token });
  } catch (error) {
    res.status(400).send(error);
  }
});

// Déconnexion
router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => token.token !== req.token);
    await req.user.save();
    res.send();
  } catch (error) {
    res.status(500).send();
  }
});

// Obtenir profil utilisateur
router.get('/users/me', auth, async (req, res) => {
  res.send(req.user);
});

// Modifier profil utilisateur
router.patch('/users/me', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'email', 'password', 'skills', 'profilePicture'];
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Modifications non autorisées' });
  }

  try {
    updates.forEach((update) => req.user[update] = req.body[update]);
    await req.user.save();
    res.send(req.user);
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router;
