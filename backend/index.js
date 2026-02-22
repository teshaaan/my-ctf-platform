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

app.get('/api/challenges', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, title FROM challenges');
        res.json(result.rows);
    } catch (err){
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/submit', async (req, res) => {
    // 1. We now receive the username along with the challenge data
    const { challengeId, userFlag, username } = req.body;

    // Safety check: Did they log in?
    if (!username) {
        return res.json({ success: false, message: "You must be logged in to submit flags!" });
    }

    try {
        // 2. Check if the flag is correct
        const challengeResult = await pool.query(
            'SELECT flag FROM challenges WHERE id = $1', 
            [challengeId]
        );

        if (challengeResult.rows.length === 0) {
            return res.json({ success: false, message: "Challenge not found" });
        }

        const correctFlag = challengeResult.rows[0].flag;

        if (userFlag !== correctFlag) {
            return res.json({ success: false, message: "Wrong flag!" });
        }

        // 3. Find the user's ID (or create them if they are brand new)
        let userId;
        const userResult = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );

        if (userResult.rows.length > 0) {
            userId = userResult.rows[0].id; // User exists, grab their ID
        } else {
            // New user! Insert them into the database with 0 points
            const newUserResult = await pool.query(
                'INSERT INTO users (username, score) VALUES ($1, 0) RETURNING id',
                [username]
            );
            userId = newUserResult.rows[0].id; // Grab the newly created ID
        }

        // 4. Check if they already solved this specific challenge
        const solveCheck = await pool.query(
            'SELECT * FROM solves WHERE user_id = $1 AND challenge_id = $2',
            [userId, challengeId]
        );

        if (solveCheck.rows.length > 0) {
            return res.json({ success: true, message: "Correct! But you already solved this one." });
        }

        // 5. It's a new solve! Give them points and record the solve.
        // Add a row to the solves table
        await pool.query(
            'INSERT INTO solves (user_id, challenge_id) VALUES ($1, $2)',
            [userId, challengeId]
        );

        // Add 100 points to their score in the users table
        await pool.query(
            'UPDATE users SET score = score + 100 WHERE id = $1',
            [userId]
        );

        res.json({ success: true, message: "Correct! +100 Points added to your score!" });

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

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
 });

