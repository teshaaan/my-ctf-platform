import { useState, useEffect } from 'react';

interface Challenge {
  id: number;
  title: string;
}

// It needs the username from the main App to send to the backend
interface ChallengeBoardProps {
  username: string;
}

export default function ChallengeBoard({ username }: ChallengeBoardProps) {
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

  async function submitFlag() {
    if (selectedChallengeId === null) return;

    const response = await fetch('http://localhost:3001/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        challengeId: selectedChallengeId, 
        userFlag: flag,
        username: username // Using the prop here!
      })
    });
    
    const data = await response.json();
    setMessage(data.message);
  }

  return (
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
  );
}