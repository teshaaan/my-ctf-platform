import { useState, useEffect } from 'react';

interface Challenge {
  id: number;
  title: string;
}

// --- NEW: Define what a Player looks like ---
interface Player {
  username: string;
  score: number;
}

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [usernameInput, setUsernameInput] = useState('');
  
  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault(); 
    if (usernameInput.trim() !== '') {
      onLogin(usernameInput); 
    }
  };

  return (
    <div style={{ padding: "50px", fontFamily: "sans-serif", textAlign: "center" }}>
      <div style={{ border: "1px solid #ccc", padding: "30px", display: "inline-block", borderRadius: "8px" }}>
        <h2>Join the CTF</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Enter your username"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            required
            style={{ padding: "10px", marginRight: "10px", width: "200px" }}
          />
          <button type="submit" style={{ padding: "10px 20px", cursor: "pointer" }}>Login</button>
        </form>
      </div>
    </div>
  );
};

function App() {
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);

  // --- NEW: Tab Navigation State ---
  // This remembers if we are looking at the 'challenges' or the 'scoreboard'
  const [activeTab, setActiveTab] = useState<"challenges" | "scoreboard">("challenges");
  
  // --- NEW: Scoreboard State ---
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);

  // Challenge State
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [flag, setFlag] = useState("");
  const [message, setMessage] = useState("");

  // Fetch Challenges on load
  useEffect(() => {
    fetch('http://localhost:3001/api/challenges')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setChallenges(data);
      })
      .catch(err => console.error(err));
  }, []);

  // --- NEW: Fetch Scoreboard ONLY when the Scoreboard tab is clicked ---
  useEffect(() => {
    if (activeTab === "scoreboard") {
      fetch('http://localhost:3001/api/scoreboard')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setLeaderboard(data);
        })
        .catch(err => console.error(err));
    }
  }, [activeTab]); // The array [activeTab] tells React to run this every time activeTab changes

  async function submitFlag() {
    if (selectedChallengeId === null) return;

    const response = await fetch('http://localhost:3001/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        challengeId: selectedChallengeId, 
        userFlag: flag,
        username: loggedInUser 
      })
    });
    
    const data = await response.json();
    setMessage(data.message);
  }

  if (!loggedInUser) {
    return <Login onLogin={setLoggedInUser} />;
  }

  return (
    <div style={{ padding: "50px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #eee", paddingBottom: "20px", marginBottom: "20px" }}>
        <h1>PicoCTF Clone</h1>
        <p>Logged in as: <strong style={{ color: "#007bff" }}>{loggedInUser}</strong></p>
      </div>
      
      {/* NAVIGATION TABS */}
      <div style={{ marginBottom: "30px", display: "flex", gap: "10px" }}>
        <button 
          onClick={() => setActiveTab("challenges")}
          style={{ padding: "10px 20px", cursor: "pointer", fontWeight: "bold", border: "none", borderRadius: "4px", backgroundColor: activeTab === "challenges" ? "#28a745" : "#e9ecef", color: activeTab === "challenges" ? "white" : "black" }}
        >
          Challenges
        </button>
        <button 
          onClick={() => setActiveTab("scoreboard")}
          style={{ padding: "10px 20px", cursor: "pointer", fontWeight: "bold", border: "none", borderRadius: "4px", backgroundColor: activeTab === "scoreboard" ? "#28a745" : "#e9ecef", color: activeTab === "scoreboard" ? "white" : "black" }}
        >
          Scoreboard
        </button>
      </div>

      {/* --- CONDITIONAL VIEW: CHALLENGES --- */}
      {activeTab === "challenges" && (
        <div>
          <h2>Available Challenges</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: "wrap" }}>
            {challenges?.map(chal => (
              <button 
                key={chal.id} 
                onClick={() => {
                    setSelectedChallengeId(chal.id);
                    setMessage(""); 
                    setFlag("");    
                }}
                style={{ 
                  padding: "15px", 
                  backgroundColor: selectedChallengeId === chal.id ? "#007bff" : "#f8f9fa",
                  color: selectedChallengeId === chal.id ? "white" : "black",
                  border: "1px solid #dee2e6",
                  cursor: "pointer",
                  borderRadius: "6px",
                  fontSize: "16px"
                }}
              >
                {chal.title}
              </button>
            ))}
          </div>

          {selectedChallengeId && (
            <div style={{ border: "1px solid #dee2e6", padding: "25px", borderRadius: "8px", backgroundColor: "#f8f9fa", marginTop: "20px" }}>
              <h3>Submit Flag</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <input 
                  type="text" 
                  placeholder="picoCTF{...}" 
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  style={{ padding: "10px", flex: 1, borderRadius: "4px", border: "1px solid #ccc" }}
                />
                <button onClick={submitFlag} style={{ padding: "10px 20px", cursor: "pointer", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px" }}>Submit</button>
              </div>
              {message && <p style={{ fontWeight: "bold", marginTop: "15px", color: message.includes("Correct") ? "#28a745" : "#dc3545" }}>{message}</p>}
            </div>
          )}
        </div>
      )}

      {/* --- CONDITIONAL VIEW: SCOREBOARD --- */}
      {activeTab === "scoreboard" && (
        <div>
          <h2>Top Hackers</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
            <thead>
              <tr style={{ backgroundColor: "#343a40", color: "white", textAlign: "left" }}>
                <th style={{ padding: "12px", border: "1px solid #dee2e6" }}>Rank</th>
                <th style={{ padding: "12px", border: "1px solid #dee2e6" }}>Username</th>
                <th style={{ padding: "12px", border: "1px solid #dee2e6" }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: "12px", textAlign: "center", border: "1px solid #dee2e6" }}>No scores yet!</td></tr>
              ) : (
                leaderboard.map((player, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#f8f9fa" : "white" }}>
                    <td style={{ padding: "12px", border: "1px solid #dee2e6", color: 'black', fontWeight: "bold" }}>#{index + 1}</td>
                    <td style={{ padding: "12px", border: "1px solid #dee2e6", color: 'black' }}>{player.username}</td>
                    <td style={{ padding: "12px", border: "1px solid #dee2e6", color: "#28a745", fontWeight: "bold" }}>{player.score}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

export default App;