const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const challenges = [
    { id: 1, title: 'Sanity Check', flag: 'flag{hello_world}'}    
];

app.post('/api/submit', (req, res) => {
    const { userFlag} = req.body;

    if (userFlag === challenges[0].flag) {
        res.json({ success: true , message: "Correct! +100 points"});
    } else {
        res.json({success: false, message: "Wrong flag. Try Again."});
    }
});

app.listen(3001, () => {
    console.log('Server running on port 3001');
 });

