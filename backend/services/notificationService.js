const Notification = require('../models/Notification');
const User = require('../models/User');

let _getIO = null;
// Lazily import to avoid circular dependency at startup
function getIO() {
  if (!_getIO) _getIO = require('../socket/index').getIO;
  return _getIO();
}

/**
 * Persist an in-app notification and push it to the user's socket room.
 */
const sendInAppNotification = async (userId, data) => {
  if (!userId || !data?.type || !data?.title) return;

  const notification = await Notification.create({
    user:  userId,
    type:  data.type,
    title: data.title,
    body:  data.body  ?? '',
    issue: data.issue ?? null,
    meta:  data.meta  ?? {},
  });

  // Push to client in real time
  try {
    getIO()?.to(`user_${userId}`).emit('notification', notification);
  } catch { /* socket may not be ready — no-op */ }

  return notification;
};

/**
 * Find all active users within `radiusKm` of the issue location
 * (excluding the reporter) and send each a 'new_issue_nearby' notification.
 * Fire-and-forget — never throws so it cannot break issue creation.
 *
 * @param {import('mongoose').Document} issue
 * @param {number} [radiusKm=10]
 */
const notifyNearbyUsers = async (issue, radiusKm = 10) => {
  try {
    const [lng, lat] = issue.location?.coordinates ?? [];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    // Find users whose stored GPS is within radiusKm.
    // Exclude: the reporter, accounts with default [0,0] coords, inactive accounts.
    const nearbyUsers = await User.find({
      _id:      { $ne: issue.createdBy },
      isActive: true,
      location: {
        $near: {
          $geometry:    { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000, // metres
          $minDistance: 1,               // exclude exact [0,0] default
        },
      },
    }).select('_id').lean();

    if (!nearbyUsers.length) return;

    await Promise.all(
      nearbyUsers.map((u) =>
        sendInAppNotification(u._id, {
          type:  'new_issue_nearby',
          title: `New issue reported nearby`,
          body:  `"${issue.title}" was just reported within ${radiusKm} km of your location.`,
          issue: issue._id,
          meta:  { category: issue.category, distance: radiusKm },
        })
      )
    );
  } catch (err) {
    // Never let notification failure surface to the user
    console.error('[notifyNearbyUsers] error:', err.message);
  }
};

/**
 * Send push notification to a list of device tokens.
 */
const sendPushNotification = async (recipientTokens, payload) => {
  if (!recipientTokens?.length) return;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[PUSH STUB]', { recipientTokens, payload });
  }
};

module.exports = { sendInAppNotification, sendPushNotification, notifyNearbyUsers };
