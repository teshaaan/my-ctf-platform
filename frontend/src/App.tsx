import { useState } from 'react';
import Login from './components/Login';
import Scoreboard from './components/Scoreboard';
import ChallengeBoard from './components/ChallengeBoard';

export default function App() {
  // Global State
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"challenges" | "scoreboard">("challenges");

  // If not logged in, pause and show the Login component
  if (!loggedInUser) {
    return <Login onLogin={setLoggedInUser} />;
  }

  // If logged in, show the main UI
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

      {/* COMPONENT ROUTING */}
      {/* We pass the username prop down into the ChallengeBoard */}
      {activeTab === "challenges" && <ChallengeBoard username={loggedInUser} />}
      
      {/* The Scoreboard doesn't need any props, it fetches its own data */}
      {activeTab === "scoreboard" && <Scoreboard />}

    </div>
  );
}