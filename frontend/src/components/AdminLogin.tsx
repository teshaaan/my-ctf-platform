import { useState } from 'react';

interface AdminLoginProps {
  onAdminLogin: (username: string) => void;
}

export default function AdminLogin({ onAdminLogin }: AdminLoginProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [error, setError] = useState('');
  
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); 
    
    if (usernameInput.trim() !== '') {
      try {
        const response = await fetch('http://localhost:3001/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // STRICT CHECK: Are they actually an admin?
          if (data.role === 'admin') {
            onAdminLogin(usernameInput);
          } else {
            // Kick them out if they are a regular player
            setError("Access Denied: You do not have administrator privileges.");
          }
        } else {
          setError(data.message);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to connect to the server.");
      }
    }
  };

  return (
    <div style={{ padding: "50px", fontFamily: "sans-serif", textAlign: "center" }}>
      <div style={{ border: "2px solid #dc3545", padding: "40px", display: "inline-block", borderRadius: "8px", backgroundColor: "#fff5f5" }}>
        <h2 style={{ color: "#dc3545" }}>Restricted Area</h2>
        <p style={{ fontWeight: "bold", marginBottom: "20px" }}>Admin Portal Login</p>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Admin Username"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            required
            style={{ padding: "10px", width: "250px", border: "1px solid #ccc", borderRadius: "4px" }}
          />
          <button type="submit" style={{ padding: "10px 20px", cursor: "pointer", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", width: "100%", fontWeight: "bold" }}>
            Authenticate
          </button>
        </form>
        {error && <p style={{ color: "red", marginTop: "15px", fontWeight: "bold", maxWidth: "250px" }}>{error}</p>}
      </div>
    </div>
  );
}