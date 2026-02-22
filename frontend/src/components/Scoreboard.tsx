import { useState, useEffect } from 'react';

interface Player {
  username: string;
  score: number;
}

export default function Scoreboard() {
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);

  // The component fetches its OWN data when it mounts
  useEffect(() => {
    fetch('http://localhost:3001/api/scoreboard')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLeaderboard(data);
      })
      .catch(err => console.error(err));
  }, []);

  return (
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
                <td style={{ padding: "12px", border: "1px solid #dee2e6", fontWeight: "bold" }}>#{index + 1}</td>
                <td style={{ padding: "12px", border: "1px solid #dee2e6" }}>{player.username}</td>
                <td style={{ padding: "12px", border: "1px solid #dee2e6", color: "#28a745", fontWeight: "bold" }}>{player.score}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}