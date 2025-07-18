const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const router = express.Router();

// GET all categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// CREATE a new category
router.post('/', [
  body('name').notEmpty().withMessage('Name is required')
], async (req, res, next) => {
  try {
    validationResult(req).throw();
    // Check for duplicate
    const existing = await Category.findOne({ name: req.body.name });
    if (existing) return res.status(400).json({ error: 'Category already exists' });
    const category = new Category({ name: req.body.name, description: req.body.description });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

module.exports = router;