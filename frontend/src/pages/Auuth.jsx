import { useState } from "react";

export default function Auth({ API_URL, onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || "Login failed");

      onLogin({ token: data.token, username: data.username });
    } catch (err) {
      alert("Login error");
    }
  };

  const register = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || "Register failed");

      alert("Registered ✅ Now login");
      setMode("login");
    } catch (err) {
      alert("Register error");
    }
  };

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <h2 style={{ margin: 0 }}>Pulse Chat</h2>
        <p style={{ opacity: 0.7, marginTop: 6 }}>
          {mode === "login" ? "Login" : "Create account"}
        </p>

        <input
          style={styles.input}
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          style={styles.btn}
          onClick={mode === "login" ? login : register}
        >
          {mode === "login" ? "Login" : "Register"}
        </button>

        <button
          style={styles.link}
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Create new account"
            : "Already have account? Login"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  bg: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at 10% 10%, rgba(120,80,255,0.35), transparent 45%), radial-gradient(circle at 90% 20%, rgba(0,255,200,0.22), transparent 40%), #05060a",
    padding: 18,
    fontFamily: "Inter, system-ui, Arial",
    color: "white",
  },
  card: {
    width: 340,
    maxWidth: "92vw",
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(10,10,16,0.75)",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    padding: 12,
    borderRadius: 14,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontSize: 14,
  },
  btn: {
    padding: 12,
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    background:
      "linear-gradient(135deg, rgba(0,255,200,1), rgba(120,80,255,1))",
    color: "black",
  },
  link: {
    padding: 10,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    cursor: "pointer",
    background: "transparent",
    color: "white",
    opacity: 0.85,
  },
};
