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

const ensureHintUnlocksTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS hint_unlocks (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, challenge_id)
        )
    `);
};

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

const normalizeDifficulty = (difficulty, points) => {
    const normalized = String(difficulty || '').trim().toLowerCase();
    if (normalized === 'easy') return 'Easy';
    if (normalized === 'medium') return 'Medium';
    if (normalized === 'hard') return 'Hard';

    const pointValue = Number(points);
    if (!Number.isFinite(pointValue)) return 'Medium';
    if (pointValue <= 150) return 'Easy';
    if (pointValue <= 350) return 'Medium';
    return 'Hard';
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
        const result = await pool.query(`
            SELECT
                c.id,
                c.title,
                c.category,
                c.points,
                c.description,
                c.author,
                c.hint,
                c.hint_cost AS "hintCost",
                CASE
                    WHEN lower(trim(coalesce(c.difficulty, ''))) = 'easy' THEN 'Easy'
                    WHEN lower(trim(coalesce(c.difficulty, ''))) = 'medium' THEN 'Medium'
                    WHEN lower(trim(coalesce(c.difficulty, ''))) = 'hard' THEN 'Hard'
                    WHEN c.points <= 150 THEN 'Easy'
                    WHEN c.points <= 350 THEN 'Medium'
                    ELSE 'Hard'
                END AS difficulty,
                COUNT(s.id)::int AS "solveCount"
            FROM challenges c
            LEFT JOIN solves s ON s.challenge_id = c.id
            GROUP BY c.id, c.title, c.category, c.points, c.description, c.author, c.hint, c.hint_cost, c.difficulty
            ORDER BY c.id ASC
        `);
        res.json(result.rows);
    } catch (err){
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get solved challenge IDs for current user
app.get('/api/me/solves', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT challenge_id FROM solves WHERE user_id = $1',
            [req.user.id]
        );

        res.json({
            success: true,
            solvedChallengeIds: result.rows.map((row) => Number(row.challenge_id)),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.get('/api/me/hints', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT challenge_id FROM hint_unlocks WHERE user_id = $1',
            [req.user.id]
        );

        res.json({
            success: true,
            unlockedHintChallengeIds: result.rows.map((row) => Number(row.challenge_id)),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.post('/api/challenges/:id/hint/unlock', verifyToken, async (req, res) => {
    const challengeId = Number.parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (!Number.isFinite(challengeId)) {
        return res.status(400).json({ success: false, message: 'Invalid challenge ID.' });
    }

    try {
        const challengeResult = await pool.query(
            'SELECT id, hint, COALESCE(hint_cost, 0)::int AS hint_cost, points FROM challenges WHERE id = $1',
            [challengeId]
        );

        if (challengeResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Challenge not found.' });
        }

        const challenge = challengeResult.rows[0];
        const hint = String(challenge.hint || '').trim();
        const hintCost = Number(challenge.hint_cost) || 0;
        const points = Number(challenge.points) || 0;

        if (!hint) {
            return res.status(400).json({ success: false, message: 'This challenge has no hint.' });
        }

        const insertResult = await pool.query(
            `INSERT INTO hint_unlocks (user_id, challenge_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, challenge_id) DO NOTHING
             RETURNING id`,
            [userId, challengeId]
        );

        const alreadyUnlocked = insertResult.rows.length === 0;
        const awardedPoints = Math.max(0, points - hintCost);

        return res.json({
            success: true,
            message: alreadyUnlocked
                ? 'Hint already unlocked for this challenge.'
                : 'Hint unlocked. Challenge reward has been reduced.',
            alreadyUnlocked,
            hint,
            hintCost,
            awardedPoints,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error.' });
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

        const hintUsedResult = await pool.query(
            'SELECT 1 FROM hint_unlocks WHERE user_id = $1 AND challenge_id = $2 LIMIT 1',
            [verifiedUserId, challengeId]
        );

        const basePoints = Number(challenge.points) || 0;
        const hintCost = Number(challenge.hint_cost) || 0;
        const hintWasUsed = hintUsedResult.rows.length > 0;
        const awardedPoints = Math.max(0, basePoints - (hintWasUsed ? hintCost : 0));

        // 3. Insert the solve (using the VERIFIED user ID)
        await pool.query(
            'INSERT INTO solves (user_id, challenge_id) VALUES ($1, $2)',
            [verifiedUserId, challengeId]
        );

        // 4. Update the user's score
        await pool.query(
            'UPDATE users SET score = score + $1 WHERE id = $2',
            [awardedPoints, verifiedUserId]
        );

        res.json({
            success: true,
            message: `Flag Captured! +${awardedPoints} pts`,
            awardedPoints,
            hintWasUsed,
            hintCost: hintWasUsed ? hintCost : 0,
        });

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
            `SELECT username, score, rank
             FROM (
                 SELECT
                     u.username,
                     u.score,
                     DENSE_RANK() OVER (ORDER BY u.score DESC, u.id ASC) AS rank
                 FROM users u
             ) ranked_users
             ORDER BY rank ASC, username ASC
             LIMIT 10`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user's dashboard stats
app.get('/api/me/dashboard', verifyToken, async (req, res) => {
    const userId = req.user.id;

    try {
        res.set('Cache-Control', 'no-store');

        const userStatsQuery = `
            SELECT
                u.id,
                u.username,
                u.score,
                DENSE_RANK() OVER (ORDER BY u.score DESC, u.id ASC) AS rank
            FROM users u
        `;

        const userStatsResult = await pool.query(
            `SELECT username, score, rank
             FROM (${userStatsQuery}) ranked_users
             WHERE id = $1`,
            [userId]
        );

        if (userStatsResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const recentSolvesResult = await pool.query(
            `SELECT c.id, c.title, c.category, c.points
             FROM solves s
             JOIN challenges c ON c.id = s.challenge_id
             WHERE s.user_id = $1
             ORDER BY s.created_at DESC, s.id DESC
             LIMIT 3`,
            [userId]
        );

        const bestCategoriesResult = await pool.query(
            `SELECT
                c.category,
                COUNT(*)::int AS solved_count,
                COALESCE(SUM(c.points), 0)::int AS total_points
             FROM solves s
             JOIN challenges c ON c.id = s.challenge_id
             WHERE s.user_id = $1
             GROUP BY c.category
             ORDER BY total_points DESC, solved_count DESC, c.category ASC
             LIMIT 3`,
            [userId]
        );

        const resumeChallengeResult = await pool.query(
            `SELECT c.id, c.title, c.category, c.points
             FROM challenges c
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM solves s
                 WHERE s.user_id = $1 AND s.challenge_id = c.id
             )
             ORDER BY c.points DESC, c.id ASC
             LIMIT 1`,
            [userId]
        );

        const stats = userStatsResult.rows[0];
        res.json({
            success: true,
            username: stats.username,
            points: stats.score,
            rank: stats.rank,
            recentSolves: recentSolvesResult.rows,
            bestCategories: bestCategoriesResult.rows,
            resumeChallenge: resumeChallengeResult.rows[0] || null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// NEW ROUTE: Secure Admin Dashboard (Create Challenges)
app.post('/api/admin/challenges', verifyToken, requireAdmin, async (req, res) => {
    // Now accepting category, points and difficulty from the frontend.
    const { title, flag, category, points, difficulty } = req.body;

    const parsedPoints = Number.parseInt(points, 10);
    const resolvedDifficulty = normalizeDifficulty(difficulty, parsedPoints);

    if (!title || !flag || !category || !Number.isFinite(parsedPoints)) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    try {
        // Persist a valid difficulty so challenge board filters always work.
        await pool.query(
            'INSERT INTO challenges (title, flag, category, points, difficulty) VALUES ($1, $2, $3, $4, $5)',
            [title, flag, category, parsedPoints, resolvedDifficulty]
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

ensureHintUnlocksTable()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize database schema:', err);
        process.exit(1);
    });

