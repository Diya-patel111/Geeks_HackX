const { body, query } = require('express-validator');

// ─── Create Issue ─────────────────────────────────────────────────────────────
const createIssueRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ min: 5, max: 150 }).withMessage('Title must be between 5 and 150 characters.'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required.')
    .isLength({ min: 10, max: 3000 }).withMessage('Description must be between 10 and 3000 characters.'),

  body('category')
    .notEmpty().withMessage('Category is required.')
    .isIn(['road', 'water', 'electricity', 'sanitation', 'safety', 'environment', 'infrastructure', 'other'])
    .withMessage('Invalid category.'),

  body('location')
    .notEmpty().withMessage('Location is required.')
    .custom((value) => {
      let loc;
      try {
        loc = typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        throw new Error('Location must be a valid JSON object.');
      }
      if (!loc?.coordinates || !Array.isArray(loc.coordinates) || loc.coordinates.length !== 2) {
        throw new Error('location must be a GeoJSON Point with [longitude, latitude] coordinates.');
      }
      const [lng, lat] = loc.coordinates;
      // Use Number.isFinite — unlike global isFinite(), it does NOT coerce.
      // isFinite(null) = true but Number.isFinite(null) = false.
      // NaN comparisons always return false, so range checks alone cannot catch NaN/null.
      if (typeof lng !== 'number' || !Number.isFinite(lng)) {
        throw new Error('Longitude must be a finite number.');
      }
      if (typeof lat !== 'number' || !Number.isFinite(lat)) {
        throw new Error('Latitude must be a finite number.');
      }
      if (lng < -180 || lng > 180) throw new Error('Longitude must be between -180 and 180.');
      if (lat < -90  || lat > 90)  throw new Error('Latitude must be between -90 and 90.');
      return true;
    }),

  body('seriousnessRating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('seriousnessRating must be an integer between 1 and 5.'),
];

// ─── Verify Issue ─────────────────────────────────────────────────────────────
const verifyIssueRules = [
  body('comment')
    .trim()
    .notEmpty().withMessage('A verification comment is required.')
    .isLength({ min: 5, max: 1000 }).withMessage('Comment must be between 5 and 1000 characters.'),

  body('seriousnessRating')
    .notEmpty().withMessage('seriousnessRating is required for verification.')
    .isInt({ min: 1, max: 5 }).withMessage('seriousnessRating must be an integer between 1 and 5.'),
];

// ─── Add Comment ──────────────────────────────────────────────────────────────
const addCommentRules = [
  body('text')
    .trim()
    .notEmpty().withMessage('Comment text is required.')
    .isLength({ min: 1, max: 1000 }).withMessage('Comment must not exceed 1000 characters.'),
];

// ─── Nearby Issues ────────────────────────────────────────────────────────────
const nearbyRules = [
  query('lat')
    .notEmpty().withMessage('lat is required.')
    .isFloat({ min: -90, max: 90 }).withMessage('lat must be between -90 and 90.'),

  query('lng')
    .notEmpty().withMessage('lng is required.')
    .isFloat({ min: -180, max: 180 }).withMessage('lng must be between -180 and 180.'),

  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 100 }).withMessage('radius must be between 0.1 and 100 km.'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50.'),
];

module.exports = { createIssueRules, verifyIssueRules, addCommentRules, nearbyRules };
