import { useState } from 'react';

// Tell TypeScript what props this component expects
interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
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
}