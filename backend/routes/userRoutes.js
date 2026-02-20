const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getMyStats,
  getMyIssues,
  getMyActivity,
  getVerificationRequests,
} = require('../controllers/userController');

// All routes require authentication
router.use(protect);

router.get('/me/stats',                 getMyStats);
router.get('/me/issues',               getMyIssues);
router.get('/me/activity',             getMyActivity);
router.get('/me/verification-requests', getVerificationRequests);

module.exports = router;
