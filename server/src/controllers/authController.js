const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { HttpError, asyncHandler } = require('../utils/http');

const sign = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');
  if (String(password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (await User.findOne({ email: String(email).toLowerCase() })) throw new HttpError(409, 'An account with that email already exists');
  const user = await User.create({ name, email, password });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(400, 'Email and password are required');
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(String(password)))) throw new HttpError(401, 'Incorrect email or password');
  res.json({ token: sign(user), user: publicUser(user) });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});
