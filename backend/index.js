require('dotenv').config(); //.env eka load karanna
const express = require('express');   
const cors = require('cors');   //ports athara connection ekak
const { Pool } = require('pg');   //postgreSQL client
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { verifyToken, requireAdmin } = require('./middleware/authMiddleware');
const { blacklistToken } = require('./middleware/tokenBlacklist');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests without an Origin header (curl, server-side jobs, Postman).
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS policy blocked this origin.'));
    },
}));
app.use(express.json());

const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

const signupRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many signup attempts. Please try again later.' },
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const createAuthToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

const isStrongPassword = (password) => {
    // At least 8 chars with uppercase, lowercase, number, and symbol.
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
    return strongPasswordRegex.test(password);
};

app.post('/api/signup', signupRateLimiter, async (req, res) => {
    const { username, password, email } = req.body; 

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ success: false, message: "JWT secret is not configured." });
    }

    if (!username || !password || !email) {
        return res.status(400).json({ success: false, message: "Username, email, and password are required." });
    }

    if (!isStrongPassword(password)) {
        return res.status(400).json({
            success: false,
            message: "Password must be 8+ chars and include uppercase, lowercase, number, and symbol.",
        });
    }

    try {
        // 1. Check if user already exists
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Username already taken." });
        }

        // 2. Hash the password (10 rounds of salt)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. Insert into DB
        const newUser = await pool.query(
            "INSERT INTO users (username, password_hash, role, score) VALUES ($1, $2, 'player', 0) RETURNING *",
            [username, hashedPassword]
        );

        // 4. Create the Token
        const token = createAuthToken(newUser.rows[0]);

        res.json({ success: true, token, username: newUser.rows[0].username, role: newUser.rows[0].role });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error during signup." });
    }
});

// LOGIN ROUTE
app.post('/api/login', loginRateLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ success: false, message: "JWT secret is not configured." });
    }

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required." });
    }

    try {
        // 1. Find user
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: "User not found." });
        }

        const user = userResult.rows[0];

        // 2. Check Password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ success: false, message: "Invalid password." });
        }

        // 3. Create Token
        const token = createAuthToken(user);

        res.json({ success: true, token, username: user.username, role: user.role });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

app.post('/api/logout', verifyToken, (req, res) => {
    blacklistToken(req.token, req.user.exp);
    res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/challenges', async (req, res) => {
    try {
        // Now pulling category and points
        const result = await pool.query('SELECT id, title, category, points FROM challenges');
        res.json(result.rows);
    } catch (err){
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PROTECTED ROUTE: Notice the 'verifyToken' in the middle!
app.post('/api/submit', verifyToken, async (req, res) => {
    const { challengeId, userFlag } = req.body;

    // WAIT! Because of our middleware, we now have req.user!
    // We don't even need to trust the 'username' they sent in the body.
    // We can use the 100% verified ID from their token:
    const verifiedUserId = req.user.id; 

    if (!challengeId || !userFlag) {
        return res.status(400).json({ success: false, message: "Challenge ID and flag are required." });
    }

    try {
        // 1. Get the challenge
        const chalResult = await pool.query('SELECT * FROM challenges WHERE id = $1', [challengeId]);
        if (chalResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Challenge not found." });
        }
        
        const challenge = chalResult.rows[0];

        // 2. Check the flag
        if (challenge.flag !== userFlag) {
            return res.status(400).json({ success: false, message: "Incorrect flag." });
        }

        // 3. Insert the solve (using the VERIFIED user ID)
        await pool.query(
            'INSERT INTO solves (user_id, challenge_id) VALUES ($1, $2)',
            [verifiedUserId, challengeId]
        );

        // 4. Update the user's score
        await pool.query(
            'UPDATE users SET score = score + $1 WHERE id = $2',
            [challenge.points, verifiedUserId]
        );

        res.json({ success: true, message: `Flag Captured! +${challenge.points} pts` });

    } catch (err) {
        // Catch duplicate solves (thanks to the database constraint we added earlier!)
        if (err.code === '23505') { 
            return res.status(400).json({ success: false, message: "You already solved this challenge!" });
        }
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Get the Scoreboard
app.get('/api/scoreboard', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT username, score FROM users ORDER BY score DESC LIMIT 10'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// NEW ROUTE: Secure Admin Dashboard (Create Challenges)
app.post('/api/admin/challenges', verifyToken, requireAdmin, async (req, res) => {
    // Now accepting category and points from the frontend
    const { title, flag, category, points } = req.body;

    if (!title || !flag || !category || !points) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    try {
        // Insert all the new data
        await pool.query(
            'INSERT INTO challenges (title, flag, category, points) VALUES ($1, $2, $3, $4)', 
            [title, flag, category, parseInt(points, 10)]
        );
        res.json({ success: true, message: "Challenge added successfully!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
// NEW ROUTE: Secure Admin Dashboard (Delete Challenges)
app.delete('/api/admin/challenges/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Delete all solves associated with this challenge first (so the database doesn't crash)
        await pool.query('DELETE FROM solves WHERE challenge_id = $1', [id]);
        
        // 2. Delete the actual challenge
        await pool.query('DELETE FROM challenges WHERE id = $1', [id]);

        res.json({ success: true, message: "Challenge deleted successfully!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
 });

