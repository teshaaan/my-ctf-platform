require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

app.post('/api/submit', async (req, res) => {
    const {userFlag} = req.body;

    try{
        const result = await pool.query(
            'Select * FROM challenges WHERE flag = $1',
            [userFlag]
        );

        if (result.rows.length >0){
            res.json({ success: true, message: "Correct! +100 points" });
        } else {
            res.json({ success: false, message: "Wrong flag. Try Again." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
 });

