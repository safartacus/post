const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {

  // Public endpointler
  const publicPaths = [
    '/api/auth/register',
    '/api/auth/login'
  ];

  // Eğer istek public bir endpoint'e ise, token kontrolü yapma
  if (publicPaths.some(path => req.originalUrl.includes(path))) {
    console.log("Public endpoint detected, skipping auth");
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    console.log("No authorization header found");
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Malformed token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { auth }; 