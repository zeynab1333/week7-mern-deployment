const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Register route
router.post('/register', [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res, next) => {
  try {
    validationResult(req).throw();
    const { username, email, password } = req.body;
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username or email already exists' });
    }
    // Create user
    const user = new User({ username, email, password });
    await user.save();
    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    // If it's a validation error from express-validator
    if (err.errors && Array.isArray(err.errors)) {
      return res.status(400).json({ error: err.errors[0].msg });
    }
    next(err);
  }
});

// Login route
router.post('/login', [
  body('username').notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res, next) => {
  try {
    validationResult(req).throw();
    const { username, password } = req.body;
    // Find user by username or email
    const user = await User.findOne({ $or: [ { username }, { email: username } ] });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    // Compare password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    // Exclude password from user object
    const userObj = user.toObject();
    delete userObj.password;
    res.json({ success: true, token, user: userObj });
  } catch (err) {
    next(err);
  }
});

module.exports = router;