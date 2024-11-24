const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(
  session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: true,
  })
);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Database connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/profile');
  }
  res.render('login', { error: null });
});

app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.redirect('/');
  } catch (err) {
    res.render('register', { error: 'Error registering user: ' + err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.user = user;
      return res.redirect('/profile');
    }
    res.render('login', { error: 'Invalid credentials' });
  } catch (err) {
    res.render('login', { error: 'Error logging in: ' + err.message });
  }
});

app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  res.render('profile', { user: req.session.user });
});

app.post('/edit-profile', async (req, res) => {
  const { username, email } = req.body;
  const userId = req.session.user._id;

  try {
    const updatedUser = await User.findByIdAndUpdate(userId, { username, email }, { new: true });
    req.session.user = updatedUser;
    res.redirect('/profile');
  } catch (err) {
    res.render('profile', { user: req.session.user, error: 'Error updating profile: ' + err.message });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
