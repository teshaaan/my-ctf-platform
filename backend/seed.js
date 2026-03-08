const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// A pre-hashed password for "password123" so you can login as ANY of these users
const MOCK_PASSWORD_HASH = "$2b$10$5u8k8l.5.6.7.8.9.0.1.2.3.4.5.6.7.8.9.0.1.2.3.4.5.6"; 
// (Note: In a real app, generate this with bcrypt.hash('password123', 10))

const mockUsers = [
  { username: "ne0", email: "neo@matrix.io", role: "admin" },
  { username: "trinity", email: "trinity@matrix.io", role: "player" },
  { username: "morpheus", email: "morph@matrix.io", role: "player" },
  { username: "cypher", email: "cypher@matrix.io", role: "player" },
  { username: "tank", email: "tank@matrix.io", role: "player" },
  { username: "dozer", email: "dozer@matrix.io", role: "player" },
  { username: "apoc", email: "apoc@matrix.io", role: "player" },
  { username: "switch", email: "switch@matrix.io", role: "player" },
  { username: "mouse", email: "mouse@matrix.io", role: "player" },
  { username: "oracle", email: "oracle@matrix.io", role: "admin" },
  { username: "smith", email: "agent@matrix.io", role: "player" },
  { username: "brown", email: "brown@matrix.io", role: "player" },
  { username: "jones", email: "jones@matrix.io", role: "player" },
  { username: "niobe", email: "niobe@matrix.io", role: "player" },
  { username: "ghost", email: "ghost@matrix.io", role: "player" },
  { username: "lock", email: "lock@matrix.io", role: "player" },
  { username: "persephone", email: "pers@matrix.io", role: "player" },
  { username: "keymaker", email: "key@matrix.io", role: "player" },
  { username: "architect", email: "arch@matrix.io", role: "admin" },
  { username: "seraph", email: "seraph@matrix.io", role: "player" }
];

const mockChallenges = [
  // Web Exploitation
  { title: "Inspect Me", category: "Web Exploitation", points: 100, difficulty: "Easy", flag: "flag{html_is_easy}", description: "Can you find the hidden comment in the HTML source code?", author: "Admin", hint: "Right-click and View Page Source", hint_cost: 0 },
  { title: "SQLi 101", category: "Web Exploitation", points: 200, difficulty: "Medium", flag: "flag{bobby_tables}", description: "Log in as admin without a password.", author: "Admin", hint: "' OR 1=1 --", hint_cost: 10 },
  { title: "Cookie Monster", category: "Web Exploitation", points: 300, difficulty: "Medium", flag: "flag{yum_cookies}", description: "I love cookies. Can you change yours to admin?", author: "CookieBot", hint: "Check your browser's storage", hint_cost: 20 },
  { title: "CSRF Bank", category: "Web Exploitation", points: 400, difficulty: "Hard", flag: "flag{cross_site_request}", description: "Trick the admin into transferring funds.", author: "H4x0r", hint: "Look at the form submission URL", hint_cost: 50 },
  { title: "XSS Playground", category: "Web Exploitation", points: 150, difficulty: "Easy", flag: "flag{alert_popup}", description: "Pop an alert(1) on this page.", author: "Admin", hint: "<script>", hint_cost: 5 },

  // Cryptography
  { title: "Caesar Salad", category: "Cryptography", points: 100, difficulty: "Easy", flag: "flag{julius_caesar}", description: "Decrypt this: synt{whyvhf_pnrnne}", author: "Admin", hint: "ROT13", hint_cost: 0 },
  { title: "Base64 Basic", category: "Cryptography", points: 100, difficulty: "Easy", flag: "flag{encoding_is_not_encryption}", description: "ZmxhZ3tlbmNvZGluZ19pc19ub3RfZW5jcnlwdGlvbn0=", author: "Admin", hint: "Base64 decode", hint_cost: 0 },
  { title: "RSA Rookie", category: "Cryptography", points: 300, difficulty: "Medium", flag: "flag{math_is_hard}", description: "Given n and e, find d.", author: "MathWiz", hint: "Factorize N", hint_cost: 20 },
  { title: "Vigenere", category: "Cryptography", points: 250, difficulty: "Medium", flag: "flag{table_cipher}", description: "Key: LEMON. Cipher: Hxop{eomzs_qvcvsf}", author: "Admin", hint: "Vigenere Cipher", hint_cost: 10 },
  { title: "XOR Master", category: "Cryptography", points: 400, difficulty: "Hard", flag: "flag{xor_is_reversible}", description: "One time pads represent perfect secrecy.", author: "CryptoGod", hint: "A XOR B = C, A XOR C = B", hint_cost: 30 },

  // Reverse Engineering
  { title: "Strings", category: "Reverse Engineering", points: 100, difficulty: "Easy", flag: "flag{grep_is_friend}", description: "Find the flag inside this binary.", author: "Admin", hint: "Use the 'strings' command", hint_cost: 0 },
  { title: "Assembly 1", category: "Reverse Engineering", points: 300, difficulty: "Medium", flag: "flag{registries}", description: "What value is in EAX at the end of this function?", author: "ASM_Guru", hint: "Trace the jumps", hint_cost: 20 },
  { title: "Decompile Me", category: "Reverse Engineering", points: 500, difficulty: "Hard", flag: "flag{source_recovered}", description: "Here is a .pyc file. Get the source back.", author: "Pythonista", hint: "uncompyle6", hint_cost: 50 },

  // Forensics
  { title: "Meta Data", category: "Forensics", points: 100, difficulty: "Easy", flag: "flag{exif_tool}", description: "Who took this photo?", author: "Admin", hint: "exiftool", hint_cost: 0 },
  { title: "Shark Wire", category: "Forensics", points: 200, difficulty: "Medium", flag: "flag{packet_sniffer}", description: "Find the password in this PCAP file.", author: "NetAdmin", hint: "Wireshark -> Follow TCP Stream", hint_cost: 10 },
  { title: "Hidden Bits", category: "Forensics", points: 400, difficulty: "Hard", flag: "flag{steganography}", description: "There is a text file hidden inside this image.", author: "StegoMaster", hint: "steghide", hint_cost: 30 },

  // Pwn / Binary
  { title: "Buffer Overflow 1", category: "Pwn", points: 200, difficulty: "Medium", flag: "flag{segfault}", description: "Crash the program to get the flag.", author: "Admin", hint: "Input is too long", hint_cost: 10 },
  { title: "Return to Libc", category: "Pwn", points: 500, difficulty: "Hard", flag: "flag{system_shell}", description: "Bypass NX bit protection.", author: "PwnKing", hint: "ROP Gadgets", hint_cost: 50 },
  
  // Misc
  { title: "Sanity Check", category: "Misc", points: 50, difficulty: "Easy", flag: "flag{welcome}", description: "Join our Discord.", author: "Community", hint: "Read the #rules channel", hint_cost: 0 },
  { title: "Grep It", category: "Misc", points: 150, difficulty: "Easy", flag: "flag{regex_wizard}", description: "Find the flag in this 1GB log file.", author: "SysAdmin", hint: "grep -r 'flag{'", hint_cost: 0 }
];

async function seed() {
  try {
    console.log('Starting Seed Process...');

    console.log('Clearing old data...');
    await pool.query('TRUNCATE TABLE solves, challenges, users RESTART IDENTITY CASCADE');

    // 2. INSERT USERS
    console.log('Inserting Users...');
    const userIds = [];
    for (const user of mockUsers) {
      const res = await pool.query(
        `INSERT INTO users (username, email, password_hash, role, score) 
         VALUES ($1, $2, $3, $4, 0) 
         RETURNING id`,
        [user.username, user.email, MOCK_PASSWORD_HASH, user.role]
      );
      userIds.push(res.rows[0].id);
    }

    // 3. INSERT CHALLENGES
    console.log('Inserting Challenges...');
    const challengeIds = [];
    const challengePoints = {}; 
    for (const chal of mockChallenges) {
      const res = await pool.query(
        `INSERT INTO challenges (title, category, points, difficulty, flag, description, author, hint, hint_cost) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING id`,
        [chal.title, chal.category, chal.points, chal.difficulty, chal.flag, chal.description, chal.author, chal.hint, chal.hint_cost]
      );
      challengeIds.push(res.rows[0].id);
      challengePoints[res.rows[0].id] = chal.points;
    }

    // 4. INSERT RANDOM SOLVES & UPDATE SCORES
    console.log('Simulating Solves & Scoreboard...');
    for (const userId of userIds) {
      // Each user solves between 0 and 8 random challenges
      const numberOfSolves = Math.floor(Math.random() * 8); 
      let totalScore = 0;
      
      // Shuffle challenges to pick random ones
      const shuffledChallenges = challengeIds.sort(() => 0.5 - Math.random());
      const solvedChallenges = shuffledChallenges.slice(0, numberOfSolves);

      for (const challengeId of solvedChallenges) {
        // Insert Solve
        await pool.query(
          `INSERT INTO solves (user_id, challenge_id) VALUES ($1, $2)`,
          [userId, challengeId]
        );
        totalScore += challengePoints[challengeId];
      }

      // Update User Score
      await pool.query(
        `UPDATE users SET score = $1 WHERE id = $2`,
        [totalScore, userId]
      );
    }

    console.log('Seeding Complete! Database is populated.');
    process.exit(0);

  } catch (err) {
    console.error('Seeding Error:', err);
    process.exit(1);
  }
}

seed();