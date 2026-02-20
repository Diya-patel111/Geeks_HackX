const User  = require('../models/User');
const Issue = require('../models/Issue');
const ApiError    = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ─── GET /api/v1/admin/stats ──────────────────────────────────────────────────
exports.getStats = asyncHandler(async (_req, res) => {
  const [totalUsers, totalIssues, resolvedIssues, pendingIssues] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Issue.countDocuments(),
    Issue.countDocuments({ status: 'Resolved' }),
    Issue.countDocuments({ status: 'Pending' }),
  ]);

  const inProgress = totalIssues - resolvedIssues - pendingIssues;

  res.status(200).json(
    new ApiResponse(200, {
      users:      { total: totalUsers },
      issues: {
        total:      totalIssues,
        pending:    pendingIssues,
        inProgress: Math.max(0, inProgress),
        resolved:   resolvedIssues,
        resolutionRate: totalIssues
          ? Math.round((resolvedIssues / totalIssues) * 100)
          : 0,
      },
    })
  );
});

// ─── GET /api/v1/admin/users ──────────────────────────────────────────────────
exports.getUsers = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (req.query.role)   filter.role     = req.query.role;
  if (req.query.search) {
    filter.$or = [
      { name:  { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      users: users.map((u) => u.toPublicJSON()),
      pagination: {
        total,
        page,
        limit,
        pages:   Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  );
});

// ─── PATCH /api/v1/admin/users/:id/role ──────────────────────────────────────
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const ALLOWED_ROLES = ['user', 'citizen', 'official', 'admin'];

  if (!ALLOWED_ROLES.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${ALLOWED_ROLES.join(', ')}`);
  }
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot change your own role.');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  );
  if (!user) throw new ApiError(404, 'User not found.');

  res.status(200).json(
    new ApiResponse(200, user.toPublicJSON(), `Role updated to "${role}".`)
  );
});

// ─── PATCH /api/v1/admin/users/:id/deactivate ───────────────────────────────
exports.deactivateUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot deactivate your own account.');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found.');

  res.status(200).json(new ApiResponse(200, null, 'User deactivated.'));
});

// ─── GET /api/v1/admin/issues ─────────────────────────────────────────────────
exports.getAllIssues = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (req.query.status)   filter.status   = req.query.status;
  if (req.query.category) filter.category = req.query.category;

  const [issues, total] = await Promise.all([
    Issue.find(filter)
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Issue.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      issues,
      pagination: {
        total,
        page,
        limit,
        pages:   Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  );
});

// ─── PATCH /api/v1/admin/issues/:id/status ───────────────────────────────────
exports.updateIssueStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const ALLOWED = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

  if (!ALLOWED.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${ALLOWED.join(', ')}`);
  }

  const issue = await Issue.findByIdAndUpdate(
    req.params.id,
    { status, resolvedAt: status === 'Resolved' ? new Date() : undefined },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email');

  if (!issue) throw new ApiError(404, 'Issue not found.');

  // Emit real-time update
  try {
    const { emitStatusUpdate } = require('../socket/socketEvents');
    emitStatusUpdate(issue._id.toString(), { status, updatedBy: req.user._id });
  } catch { /* socket optional */ }

  res.status(200).json(new ApiResponse(200, issue, `Status updated to "${status}".`));
});

// ─── DELETE /api/v1/admin/issues/:id ─────────────────────────────────────────
exports.deleteIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findByIdAndDelete(req.params.id);
  if (!issue) throw new ApiError(404, 'Issue not found.');
  res.status(200).json(new ApiResponse(200, null, 'Issue deleted.'));
});
