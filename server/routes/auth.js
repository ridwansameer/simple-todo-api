const AuthRouter = require('express').Router();
const z = require('zod');
const knex = require('../database/connection.js');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/auth.js');

AuthRouter.post('/register', async (req, res) => {
  try {
    const { email, name, password } = registerSchema.parse(req.body);
    const password_hash = await bcrypt.hash(password, 10);
    const user = await knex('users').insert({ email, name, password_hash }).returning('*');
    const token = generateToken(user[0].id);
    res.status(201).json({ user: user[0], token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

AuthRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await knex('users').where({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(user.id);
    res.status(200).json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(5),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(5),
});

module.exports = AuthRouter;