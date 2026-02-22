require('dotenv').config(); //.env eka load karanna
const express = require('express');   
const cors = require('cors');   //ports athara connection ekak
const { Pool } = require('pg');   //postgreSQL client

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// NEW ROUTE: Login and Check Role
// NEW ROUTE: Login and Check Role
app.post('/api/login', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.json({ success: false, message: "Username required" });
    }

    try {
        const userResult = await pool.query(
            'SELECT role FROM users WHERE username = $1',
            [username]
        );

        if (userResult.rows.length > 0) {
            const rawRole = userResult.rows[0].role || 'player';
            const cleanRole = rawRole.trim().toLowerCase();
            
            res.json({ success: true, role: cleanRole });
        } else {
            await pool.query(
                "INSERT INTO users (username, score, role) VALUES ($1, 0, 'player')",
                [username]
            );
            res.json({ success: true, role: 'player' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
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

app.post('/api/submit', async (req, res) => {
    const { challengeId, userFlag, username } = req.body;
    if (!username) return res.json({ success: false, message: "You must be logged in to submit flags!" });

    try {
        // Grab the flag AND the point value
        const challengeResult = await pool.query('SELECT flag, points FROM challenges WHERE id = $1', [challengeId]);
        if (challengeResult.rows.length === 0) return res.json({ success: false, message: "Challenge not found" });

        const correctFlag = challengeResult.rows[0].flag;
        const pointsToAward = challengeResult.rows[0].points; // Get the dynamic points

        if (userFlag !== correctFlag) return res.json({ success: false, message: "Wrong flag!" });

        let userId;
        const userResult = await pool.query('SELECT id FROM users WHERE username ILIKE $1', [username]);

        if (userResult.rows.length > 0) {
            userId = userResult.rows[0].id; 
        } else {
            const newUserResult = await pool.query(
                "INSERT INTO users (username, score, role) VALUES ($1, 0, 'player') RETURNING id",
                [username]
            );
            userId = newUserResult.rows[0].id;
        }

        const solveCheck = await pool.query('SELECT * FROM solves WHERE user_id = $1 AND challenge_id = $2', [userId, challengeId]);
        if (solveCheck.rows.length > 0) return res.json({ success: true, message: "Correct! But you already solved this one." });

        await pool.query('INSERT INTO solves (user_id, challenge_id) VALUES ($1, $2)', [userId, challengeId]);
        
        // Add the specific challenge points instead of 100
        await pool.query('UPDATE users SET score = score + $1 WHERE id = $2', [pointsToAward, userId]);

        res.json({ success: true, message: `Correct! +${pointsToAward} Points added to your score!` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
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
app.post('/api/admin/challenges', async (req, res) => {
    // Now accepting category and points from the frontend
    const { username, title, flag, category, points } = req.body;

    if (!username || !title || !flag || !category || !points) {
        return res.json({ success: false, message: "Missing required fields." });
    }

    try {
        const userResult = await pool.query('SELECT role FROM users WHERE username ILIKE $1', [username]);
        if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
            return res.json({ success: false, message: "Unauthorized: Admins only!" });
        }

        // Insert all the new data
        await pool.query(
            'INSERT INTO challenges (title, flag, category, points) VALUES ($1, $2, $3, $4)', 
            [title, flag, category, parseInt(points)]
        );
        res.json({ success: true, message: "Challenge added successfully!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
    // NEW ROUTE: Secure Admin Dashboard (Delete Challenges)
app.delete('/api/admin/challenges/:id', async (req, res) => {
    const { id } = req.params;
    const { username } = req.body; // We still need to verify who is asking!

    if (!username) return res.json({ success: false, message: "Missing username." });

    try {
        // SECURITY CHECK: Is this user actually an admin?
        const userResult = await pool.query('SELECT role FROM users WHERE username = $1', [username]);

        if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
            return res.json({ success: false, message: "Unauthorized: Admins only!" });
        }

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

