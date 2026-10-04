// Vercel serverless entry. vercel.json rewrites every /api/* request here with the original path in ?path=.

const { handle } = require('../lib/handler');

module.exports = (req, res) => {
  const sub = String(req.query.path || '').replace(/^\/+/, '');
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const [status, data] = handle(req.method, `/api/${sub}`, body);
  res.status(status).json(data);
};
