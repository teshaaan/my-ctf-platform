import { useState } from 'react';

function App() {
  const [flag, setFlag] = useState("");
  const [message, setMessage] = useState("");

  async function submitFlag() {
    // Send the flag to your server
    const response = await fetch('http://localhost:3001/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userFlag: flag })
    });
    
    const data = await response.json();
    setMessage(data.message);
  }

  return (
    <div style={{ padding: "50px" }}>
      <h1>My CTF Platform</h1>
      <p>Challenge: Sanity Check</p>
      
      <input 
        type="text" 
        placeholder="Enter flag here..." 
        value={flag}
        onChange={(e) => setFlag(e.target.value)}
      />
      
      <button onClick={submitFlag}>Submit</button>
      
      <p>Result: {message}</p>
    </div>
  );
}

export default App;