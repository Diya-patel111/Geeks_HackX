const Notification = require('../models/Notification');

let _getIO = null;
// Lazily import to avoid circular dependency at startup
function getIO() {
  if (!_getIO) _getIO = require('../socket/index').getIO;
  return _getIO();
}

/**
 * Persist an in-app notification and push it to the user's socket room.
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {{ type: string, title: string, body?: string, issue?: string, meta?: object }} data
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
 * Send push notification to a list of device tokens.
 * Swap the body for your real push provider (FCM, OneSignal, etc.)
 * @param {string[]} recipientTokens
 * @param {{ title: string, body: string, data?: object }} payload
 */
const sendPushNotification = async (recipientTokens, payload) => {
  if (!recipientTokens?.length) return;

  // TODO: Replace with Firebase Admin SDK / OneSignal REST call
  if (process.env.NODE_ENV !== 'production') {
    console.log('[PUSH STUB]', { recipientTokens, payload });
  }
};

module.exports = { sendInAppNotification, sendPushNotification };
