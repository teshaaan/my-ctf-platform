const jwt = require('jsonwebtoken');
require('dotenv').config();
const { isBlacklisted } = require('./tokenBlacklist');

// "Bouncer" function
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: "Access Denied. No token provided." 
        });
    }

    if (isBlacklisted(token)) {
        return res.status(401).json({
            success: false,
            message: "Session has been logged out. Please log in again."
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        req.token = token;
        next(); 
    } catch (err) {
        return res.status(403).json({ 
            success: false, 
            message: "Invalid or expired token." 
        });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Unauthorized: Admins only!" });
    }
    next();
};

module.exports = { verifyToken, requireAdmin };