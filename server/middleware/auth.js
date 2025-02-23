const jwt = require('jsonwebtoken');

const isLoggedInMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized');
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).send('Unauthorized');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
        return res.status(401).send('Unauthorized');
    }
    req.user = decoded;
    next();
};

module.exports = { isLoggedInMiddleware };
