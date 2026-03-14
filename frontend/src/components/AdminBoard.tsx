import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Challenge {
  id: number;
  title: string;
  category: string;
  points: number;
}

export default function AdminBoard() {
  const [title, setTitle] = useState("");
  const [flag, setFlag] = useState("");
  const [category, setCategory] = useState("Web Exploitation");
  const [points, setPoints] = useState<number>(100);
  const [message, setMessage] = useState("");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleUnauthorized = () => {
    logout();
    toast.error('Session expired or unauthorized. Please log in again.');
    navigate('/login', { replace: true });
  };

  const fetchChallenges = () => {
    fetch('http://localhost:3001/api/challenges')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setChallenges(data);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  async function handleAddChallenge(e: React.FormEvent) {
    e.preventDefault(); 
    const response = await fetch('http://localhost:3001/api/admin/challenges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, flag, category, points })
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized();
      return;
    }
    
    const data = await response.json();
    setMessage(data.message);
    
    if (data.success) {
      setTitle("");
      setFlag("");
      setPoints(100);
      fetchChallenges();
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Are you sure you want to delete this challenge?")) return;

    const response = await fetch(`http://localhost:3001/api/admin/challenges/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}) 
    });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized();
      return;
    }

    const data = await response.json();
    if (data.success) {
      fetchChallenges();
    } else {
      alert(data.message);
    }
  }

  return (
    <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>
      {/* LEFT SIDE: Create Form */}
      <div style={{ flex: 1, border: "1px solid #dee2e6", padding: "25px", borderRadius: "8px", backgroundColor: "#f8f9fa" }}>
        <h3>Create New Challenge</h3>
        <form onSubmit={handleAddChallenge} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          
          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ padding: "10px", width: "100%", boxSizing: "border-box" }} />
          </div>

          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: "10px", width: "100%", boxSizing: "border-box" }}>
              <option value="Web Exploitation">Web Exploitation</option>
              <option value="Cryptography">Cryptography</option>
              <option value="Reverse Engineering">Reverse Engineering</option>
              <option value="Forensics">Forensics</option>
              <option value="General Skills">General Skills</option>
            </select>
          </div>

          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Points</label>
            <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} required style={{ padding: "10px", width: "100%", boxSizing: "border-box" }} />
          </div>
          
          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Secret Flag</label>
            <input type="text" value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="picoCTF{...}" required style={{ padding: "10px", width: "100%", boxSizing: "border-box" }} />
          </div>

          <button type="submit" style={{ padding: "10px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
            Add Challenge
          </button>
        </form>
        {message && <p style={{ fontWeight: "bold", color: message.includes("success") ? "#28a745" : "#dc3545" }}>{message}</p>}
      </div>

      {/* RIGHT SIDE: Manage List */}
      <div style={{ flex: 1 }}>
        <h3>Manage Existing Challenges</h3>
        {challenges.length === 0 ? <p>No challenges found.</p> : (
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {challenges.map(chal => (
              <li key={chal.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", border: "1px solid #ccc", marginBottom: "10px", borderRadius: "4px", backgroundColor: "white" }}>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "1.1em" }}>{chal.title}</div>
                  <div style={{ fontSize: "0.9em", color: "#666" }}>{chal.category} • {chal.points} pts</div>
                </div>
                <button onClick={() => handleDelete(chal.id)} style={{ backgroundColor: "#dc3545", color: "white", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}