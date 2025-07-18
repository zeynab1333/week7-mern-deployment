const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Post = require('../models/Post');
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const multer = require('multer');

const router = express.Router();

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext);
  }
});
const upload = multer({ storage });

// GET all posts with pagination, search, and filter
router.get('/', async (req, res, next) => {
  try {
    // Parse pagination params
    let { page = 1, limit = 10, search = '', category } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    // Build filter object
    const filter = {};
    if (search && search.trim() !== "") {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) {
      filter.category = category;
    }

    const skip = (page - 1) * limit;
    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter)
      .populate('category')
      .populate('author')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      posts,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit
    });
  } catch (err) {
    next(err);
  }
});

// GET a specific post
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid post ID')
], async (req, res, next) => {
  try {
    validationResult(req).throw();
    const post = await Post.findById(req.params.id).populate('category').populate('author');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    next(err);
  }
});

// CREATE a new post (protected)
router.post('/', auth, [
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('category').isMongoId().withMessage('Valid category ID is required'),
  // No need to validate author, will be set from req.user
], async (req, res, next) => {
  try {
    validationResult(req).throw();
    // Check if category exists
    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).json({ error: 'Category does not exist' });
    // Generate slug from title
    const slug = req.body.title
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '')
      .replace(/ +/g, '-');
    // Set author from authenticated user and add slug
    const newPost = new Post({ ...req.body, author: req.user.userId, slug });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    next(err);
  }
});

// UPDATE a post (protected)
router.put('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid post ID'),
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('content').optional().notEmpty().withMessage('Content cannot be empty'),
  body('category').optional().isMongoId().withMessage('Valid category ID is required'),
  // No need to validate author, will not be updated directly
], async (req, res, next) => {
  try {
    validationResult(req).throw();
    // Optionally, you can check if the logged-in user is the author here
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedPost) return res.status(404).json({ error: 'Post not found' });
    res.json(updatedPost);
  } catch (err) {
    next(err);
  }
});

// DELETE a post (protected)
router.delete('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid post ID')
], async (req, res, next) => {
  try {
    validationResult(req).throw();
    // Optionally, you can check if the logged-in user is the author here
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
});

// Image upload route (protected)
router.post('/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  // Return the file path relative to the server root
  const filePath = `/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, filePath });
});

// Add a comment to a post (protected)
router.post('/:id/comments', auth, [
  param('id').isMongoId().withMessage('Invalid post ID'),
  body('content').notEmpty().withMessage('Content is required'),
], async (req, res, next) => {
  try {
    validationResult(req).throw();
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = {
      user: req.user.userId,
      content: req.body.content,
      createdAt: new Date(),
    };
    post.comments.push(comment);
    await post.save();
    res.status(201).json({ success: true, comment });
  } catch (err) {
    next(err);
  }
});

// Delete a comment from a post (protected)
router.delete('/:postId/comments/:commentId', auth, [
  param('postId').isMongoId().withMessage('Invalid post ID'),
  param('commentId').isMongoId().withMessage('Invalid comment ID'),
], async (req, res, next) => {
  try {
    validationResult(req).throw();
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    // Only the comment's author can delete
    if (comment.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment' });
    }
    // Remove the comment using deleteOne for subdocuments
    comment.deleteOne();
    await post.save();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
});

// Get all comments for a post
router.get('/:id/comments', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('comments.user', 'username'); // populate user info for comments
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Format comments to include author info
    const comments = post.comments.map(comment => ({
      _id: comment._id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: comment.user ? {
        _id: comment.user._id,
        username: comment.user.username
      } : null
    }));

    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

module.exports = router;