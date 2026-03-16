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

const ensureUserNotebooksTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_notebooks (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            challenge_id INTEGER REFERENCES challenges(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            question TEXT,
            content TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query('ALTER TABLE user_notebooks ADD COLUMN IF NOT EXISTS challenge_id INTEGER REFERENCES challenges(id) ON DELETE SET NULL');
    await pool.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS user_notebooks_user_challenge_unique
         ON user_notebooks (user_id, challenge_id)
         WHERE challenge_id IS NOT NULL`
    );
};

const ensureChallengesTableColumns = async () => {
    await pool.query('ALTER TABLE challenges ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await pool.query('ALTER TABLE challenges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await pool.query('ALTER TABLE challenges ADD COLUMN IF NOT EXISTS description TEXT');
    await pool.query('ALTER TABLE challenges ADD COLUMN IF NOT EXISTS author VARCHAR(255)');
    await pool.query('ALTER TABLE challenges ADD COLUMN IF NOT EXISTS hint TEXT');
    await pool.query('ALTER TABLE challenges ADD COLUMN IF NOT EXISTS hint_cost INTEGER DEFAULT 0');
};

const ensureChallengeSubmissionsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS challenge_submissions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            points INTEGER NOT NULL,
            difficulty VARCHAR(20) NOT NULL,
            flag TEXT NOT NULL,
            description TEXT,
            hint TEXT,
            hint_cost INTEGER DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

const ensureUsersTableColumns = async () => {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)');
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

        const emailCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: "Email already in use." });
        }

        // 2. Hash the password (10 rounds of salt)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. Insert into DB
        const newUser = await pool.query(
            "INSERT INTO users (username, email, password_hash, role, score) VALUES ($1, $2, $3, 'player', 0) RETURNING *",
            [username, email, hashedPassword]
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
                c.created_at AS "createdAt",
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
            GROUP BY c.id, c.created_at, c.title, c.category, c.points, c.description, c.author, c.hint, c.hint_cost, c.difficulty
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

app.get('/api/me/profile', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT username, email FROM users WHERE id = $1 LIMIT 1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = result.rows[0];
        return res.json({
            success: true,
            user: {
                username: user.username,
                email: user.email || 'No email set',
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to load profile.' });
    }
});

app.patch('/api/me/password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    }

    if (!isStrongPassword(String(newPassword))) {
        return res.status(400).json({
            success: false,
            message: 'New password must be 8+ chars and include uppercase, lowercase, number, and symbol.',
        });
    }

    try {
        const userResult = await pool.query(
            'SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = userResult.rows[0];
        const validPassword = await bcrypt.compare(String(currentPassword), user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        const isSamePassword = await bcrypt.compare(String(newPassword), user.password_hash);
        if (isSamePassword) {
            return res.status(400).json({ success: false, message: 'New password must be different from current password.' });
        }

        const nextHash = await bcrypt.hash(String(newPassword), 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [nextHash, req.user.id]);

        return res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to update password.' });
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

app.get('/api/admin/users-summary', verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                ranked.id,
                ranked.username,
                ranked.score,
                ranked.rank,
                COALESCE(COUNT(s.id), 0)::int AS solved_count
             FROM (
                 SELECT
                    u.id,
                    u.username,
                    u.score,
                    DENSE_RANK() OVER (ORDER BY u.score DESC, u.id ASC) AS rank
                 FROM users u
             ) ranked
             LEFT JOIN solves s ON s.user_id = ranked.id
             GROUP BY ranked.id, ranked.username, ranked.score, ranked.rank
             ORDER BY ranked.rank ASC, ranked.username ASC`
        );

        return res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to load user summary.' });
    }
});

// NEW ROUTE: Secure Admin Dashboard (Create Challenges)
app.post('/api/admin/challenges', verifyToken, requireAdmin, async (req, res) => {
    // Now accepting category, points and difficulty from the frontend.
    const { title, flag, category, points, difficulty, description, author, hint, hintCost } = req.body;

    const parsedPoints = Number.parseInt(points, 10);
    const parsedHintCost = Number.parseInt(hintCost, 10);
    const resolvedDifficulty = normalizeDifficulty(difficulty, parsedPoints);
    const normalizedHintCost = Number.isFinite(parsedHintCost) ? Math.max(0, parsedHintCost) : 0;
    const sanitizedDescription = String(description || '').trim();
    const sanitizedAuthor = String(author || 'Admin').trim() || 'Admin';
    const sanitizedHint = String(hint || '').trim();

    if (!title || !flag || !category || !Number.isFinite(parsedPoints)) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    try {
        // Persist a valid difficulty so challenge board filters always work.
        const result = await pool.query(
            `INSERT INTO challenges (title, flag, category, points, difficulty, description, author, hint, hint_cost, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id`,
            [title, flag, category, parsedPoints, resolvedDifficulty, sanitizedDescription, sanitizedAuthor, sanitizedHint, normalizedHintCost]
        );
        res.json({ success: true, message: "Challenge added successfully!", challengeId: result.rows[0].id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.patch('/api/admin/challenges/:id', verifyToken, requireAdmin, async (req, res) => {
    const challengeId = Number.parseInt(req.params.id, 10);
    const {
        title,
        flag,
        category,
        points,
        difficulty,
        description,
        author,
        hint,
        hintCost,
    } = req.body;

    if (!Number.isFinite(challengeId)) {
        return res.status(400).json({ success: false, message: 'Invalid challenge ID.' });
    }

    const parsedPoints = Number.parseInt(points, 10);
    const parsedHintCost = Number.parseInt(hintCost, 10);
    if (!title || !category || !Number.isFinite(parsedPoints)) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const resolvedDifficulty = normalizeDifficulty(difficulty, parsedPoints);
    const normalizedHintCost = Number.isFinite(parsedHintCost) ? Math.max(0, parsedHintCost) : 0;

    try {
        const result = await pool.query(
            `UPDATE challenges
             SET
                 title = $1,
                 flag = COALESCE(NULLIF($2, ''), flag),
                 category = $3,
                 points = $4,
                 difficulty = $5,
                 description = $6,
                 author = $7,
                 hint = $8,
                 hint_cost = $9,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $10
             RETURNING id`,
            [
                String(title).trim(),
                String(flag || '').trim(),
                String(category).trim(),
                parsedPoints,
                resolvedDifficulty,
                String(description || '').trim(),
                String(author || 'Admin').trim() || 'Admin',
                String(hint || '').trim(),
                normalizedHintCost,
                challengeId,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Challenge not found.' });
        }

        return res.json({ success: true, message: 'Challenge updated successfully.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error.' });
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

app.post('/api/lab/challenge-submissions', verifyToken, async (req, res) => {
    const { title, category, points, difficulty, flag, description, hint, hintCost } = req.body;
    const sanitizedTitle = String(title || '').trim();
    const sanitizedCategory = String(category || '').trim();
    const sanitizedDifficulty = String(difficulty || '').trim();
    const sanitizedFlag = String(flag || '').trim();
    const sanitizedDescription = String(description || '').trim();
    const sanitizedHint = String(hint || '').trim();
    const parsedPoints = Number.parseInt(points, 10);
    const parsedHintCost = Number.parseInt(hintCost, 10);

    if (
        !sanitizedTitle ||
        !sanitizedCategory ||
        !sanitizedDifficulty ||
        !sanitizedFlag ||
        !sanitizedDescription ||
        !sanitizedHint ||
        !Number.isFinite(parsedPoints) ||
        !Number.isFinite(parsedHintCost)
    ) {
        return res.status(400).json({ success: false, message: 'All challenge fields are required.' });
    }

    if (parsedPoints < 0 || parsedHintCost < 0) {
        return res.status(400).json({ success: false, message: 'Points and hint cost must be 0 or greater.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO challenge_submissions (
                user_id,
                title,
                category,
                points,
                difficulty,
                flag,
                description,
                hint,
                hint_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, status, created_at`,
            [
                req.user.id,
                sanitizedTitle,
                sanitizedCategory,
                parsedPoints,
                normalizeDifficulty(sanitizedDifficulty, parsedPoints),
                sanitizedFlag,
                sanitizedDescription,
                sanitizedHint,
                parsedHintCost,
            ]
        );

        res.json({ success: true, submission: result.rows[0], message: 'Challenge sent to admin for review.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to submit challenge.' });
    }
});

app.get('/api/lab/challenge-submissions', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, category, points, difficulty, status, created_at, reviewed_at
             FROM challenge_submissions
             WHERE user_id = $1
             ORDER BY created_at DESC, id DESC`,
            [req.user.id]
        );

        res.json({ success: true, submissions: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load your submissions.' });
    }
});

app.get('/api/admin/challenge-submissions', verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                cs.id,
                cs.title,
                cs.category,
                cs.points,
                cs.difficulty,
                cs.flag,
                cs.description,
                cs.hint,
                cs.hint_cost AS "hintCost",
                cs.status,
                cs.created_at AS "createdAt",
                u.username AS "submittedBy"
            FROM challenge_submissions cs
            JOIN users u ON u.id = cs.user_id
            ORDER BY cs.created_at DESC, cs.id DESC`
        );

        res.json({ success: true, submissions: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load challenge submissions.' });
    }
});

app.patch('/api/admin/challenge-submissions/:id/accept', verifyToken, requireAdmin, async (req, res) => {
    const submissionId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(submissionId)) {
        return res.status(400).json({ success: false, message: 'Invalid submission ID.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const submissionResult = await client.query(
            `SELECT id, title, category, points, difficulty, flag, description, hint, hint_cost
             FROM challenge_submissions
             WHERE id = $1 AND status = 'pending'
             FOR UPDATE`,
            [submissionId]
        );

        if (submissionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Pending submission not found.' });
        }

        const s = submissionResult.rows[0];

        await client.query(
            `INSERT INTO challenges (title, flag, category, points, difficulty, description, author, hint, hint_cost, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                s.title,
                s.flag,
                s.category,
                s.points,
                normalizeDifficulty(s.difficulty, s.points),
                s.description,
                'Community',
                s.hint,
                s.hint_cost || 0,
            ]
        );

        await client.query(
            `UPDATE challenge_submissions
             SET status = 'accepted', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [req.user.id, submissionId]
        );

        await client.query('COMMIT');
        return res.json({ success: true, message: 'Submission accepted and challenge published.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        return res.status(500).json({ success: false, message: 'Failed to accept submission.' });
    } finally {
        client.release();
    }
});

app.delete('/api/admin/challenge-submissions/:id', verifyToken, requireAdmin, async (req, res) => {
    const submissionId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(submissionId)) {
        return res.status(400).json({ success: false, message: 'Invalid submission ID.' });
    }

    try {
        const result = await pool.query(
            `UPDATE challenge_submissions
             SET status = 'removed', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND status = 'pending'
             RETURNING id`,
            [req.user.id, submissionId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pending submission not found.' });
        }

        res.json({ success: true, message: 'Submission removed.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to remove submission.' });
    }
});

// ==========================================
// THE LABORATORY ROUTES (Personal Notes)
// ==========================================

app.get('/api/lab/notebooks', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, question, content, created_at, updated_at
             FROM user_notebooks
             WHERE user_id = $1
             ORDER BY updated_at DESC, id DESC`,
            [req.user.id]
        );

        res.json({ success: true, notebooks: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load notebooks.' });
    }
});

app.post('/api/lab/notebooks', verifyToken, async (req, res) => {
    const { title, question, content, challengeId } = req.body;

    const sanitizedTitle = String(title || '').trim();
    const sanitizedQuestion = String(question || '').trim();
    const sanitizedContent = String(content || '');
    const parsedChallengeId = challengeId === undefined || challengeId === null
        ? null
        : Number.parseInt(challengeId, 10);

    if (!sanitizedTitle) {
        return res.status(400).json({ success: false, message: 'Notebook title is required.' });
    }

    if (parsedChallengeId !== null && !Number.isFinite(parsedChallengeId)) {
        return res.status(400).json({ success: false, message: 'Invalid challenge ID.' });
    }

    try {
        if (parsedChallengeId !== null) {
            const existingResult = await pool.query(
                `SELECT id, title, question, content, created_at, updated_at
                 FROM user_notebooks
                 WHERE user_id = $1 AND challenge_id = $2
                 LIMIT 1`,
                [req.user.id, parsedChallengeId]
            );

            if (existingResult.rows.length > 0) {
                return res.json({ success: true, notebook: existingResult.rows[0], existing: true });
            }
        }

        const result = await pool.query(
            `INSERT INTO user_notebooks (user_id, challenge_id, title, question, content)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, title, question, content, created_at, updated_at`,
            [req.user.id, parsedChallengeId, sanitizedTitle, sanitizedQuestion, sanitizedContent]
        );

        res.json({ success: true, notebook: result.rows[0], existing: false });
    } catch (err) {
        if (err.code === '23505' && parsedChallengeId !== null) {
            try {
                const existingResult = await pool.query(
                    `SELECT id, title, question, content, created_at, updated_at
                     FROM user_notebooks
                     WHERE user_id = $1 AND challenge_id = $2
                     LIMIT 1`,
                    [req.user.id, parsedChallengeId]
                );

                if (existingResult.rows.length > 0) {
                    return res.json({ success: true, notebook: existingResult.rows[0], existing: true });
                }
            } catch (lookupErr) {
                console.error(lookupErr);
            }
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create notebook.' });
    }
});

app.get('/api/lab/notebooks/:notebookId', verifyToken, async (req, res) => {
    const notebookId = Number.parseInt(req.params.notebookId, 10);
    if (!Number.isFinite(notebookId)) {
        return res.status(400).json({ success: false, message: 'Invalid notebook ID.' });
    }

    try {
        const result = await pool.query(
            `SELECT id, title, question, content, created_at, updated_at
             FROM user_notebooks
             WHERE id = $1 AND user_id = $2`,
            [notebookId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Notebook not found.' });
        }

        res.json({ success: true, notebook: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load notebook.' });
    }
});

app.patch('/api/lab/notebooks/:notebookId', verifyToken, async (req, res) => {
    const notebookId = Number.parseInt(req.params.notebookId, 10);
    
    if (!Number.isFinite(notebookId)) {
        return res.status(400).json({ success: false, message: 'Invalid notebook ID.' });
    }

    // Check which fields the frontend actually sent
    const hasTitle = Object.prototype.hasOwnProperty.call(req.body, 'title');
    const hasQuestion = Object.prototype.hasOwnProperty.call(req.body, 'question');
    const hasContent = Object.prototype.hasOwnProperty.call(req.body, 'content');
    const hasSnippets = Object.prototype.hasOwnProperty.call(req.body, 'python_snippets');

    // Make sure at least one field was sent
    if (!hasTitle && !hasQuestion && !hasContent && !hasSnippets) {
        return res.status(400).json({ success: false, message: 'Nothing to update.' });
    }

    // Sanitize and prepare the values
    const titleValue = hasTitle ? String(req.body.title || '').trim() : null;
    const questionValue = hasQuestion ? String(req.body.question || '').trim() : null;
    const contentValue = hasContent ? String(req.body.content || '') : null;
    
    // Convert the snippets array to a JSON string for PostgreSQL
    const snippetsValue = hasSnippets ? JSON.stringify(req.body.python_snippets || []) : null;

    if (hasTitle && !titleValue) {
        return res.status(400).json({ success: false, message: 'Notebook title cannot be empty.' });
    }

    try {
        const result = await pool.query(
            `UPDATE user_notebooks
             SET
                 title = COALESCE($1, title),
                 question = COALESCE($2, question),
                 content = COALESCE($3, content),
                 python_snippets = COALESCE($4, python_snippets),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND user_id = $6
             RETURNING id, title, question, content, python_snippets, created_at, updated_at`,
            [titleValue, questionValue, contentValue, snippetsValue, notebookId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Notebook not found.' });
        }

        res.json({ success: true, notebook: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to save notebook.' });
    }
});

app.delete('/api/lab/notebooks/:notebookId', verifyToken, async (req, res) => {
    const notebookId = Number.parseInt(req.params.notebookId, 10);

    if (!Number.isFinite(notebookId)) {
        return res.status(400).json({ success: false, message: 'Invalid notebook ID.' });
    }

    try {
        const result = await pool.query(
            `DELETE FROM user_notebooks
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [notebookId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Notebook not found.' });
        }

        res.json({ success: true, message: 'Notebook deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to delete notebook.' });
    }
});

// 1. GET ROUTE: Fetch a user's note for a specific challenge
app.get('/api/lab/notes/:challengeId', verifyToken, async (req, res) => {
    // The Bouncer verified the token, so we know exactly who this is:
    const userId = req.user.id; 
    const challengeId = req.params.challengeId;

    try {
        const result = await pool.query(
            'SELECT content, updated_at FROM personal_notes WHERE user_id = $1 AND challenge_id = $2',
            [userId, challengeId]
        );

        // If they have a note, send it. If not, send an empty string so the editor is blank.
        if (result.rows.length > 0) {
            res.json({ success: true, note: result.rows[0] });
        } else {
            res.json({ success: true, note: { content: '', updated_at: null } });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to load notes." });
    }
});

// 2. POST ROUTE: Save or Update a note (The "Upsert")
app.post('/api/lab/notes', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { challengeId, content } = req.body;

    try {
        // The Magic SQL: "ON CONFLICT DO UPDATE"
        // It tries to insert. If it hits our UNIQUE rule, it switches to updating!
        const result = await pool.query(
            `INSERT INTO personal_notes (user_id, challenge_id, content) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (user_id, challenge_id) 
             DO UPDATE SET content = EXCLUDED.content 
             RETURNING updated_at`,
            [userId, challengeId, content]
        );

        res.json({ 
            success: true, 
            message: "Note saved auto-magically!",
            updated_at: result.rows[0].updated_at
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to save note." });
    }
});

const PORT = 3001;

Promise.all([
    ensureUsersTableColumns(),
    ensureHintUnlocksTable(),
    ensureUserNotebooksTable(),
    ensureChallengesTableColumns(),
    ensureChallengeSubmissionsTable(),
])
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize database schema:', err);
        process.exit(1);
    });

