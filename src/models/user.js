const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 7
  },
  role: {
    type: String,
    enum: ['client', 'technicien', 'admin'],
    default: 'client'
  },
  tokens: [{
    token: {
      type: String,
      required: true
    }
  }],
  profilePicture: {
    type: String
  },
  skills: [{
    type: String
  }],
  rating: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash du mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

// Générer un token d'authentification
userSchema.methods.generateAuthToken = async function() {
  const user = this;
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
  
  user.tokens = user.tokens.concat({ token });
  await user.save();
  
  return token;
};

const User = mongoose.model('User', userSchema);

module.exports = { User };
