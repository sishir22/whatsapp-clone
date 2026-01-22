import { useNavigate } from "react-router-dom";

export default function Inbox({ me, users, unread, fetchUsers, onLogout }) {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <div style={styles.panel}>
        <div style={styles.top}>
          <div>
            <div style={styles.brand}>Pulse</div>
            <div style={styles.sub}>Logged in as: {me}</div>
          </div>

          <button style={styles.logout} onClick={onLogout}>
            Logout
          </button>
        </div>

        <button style={styles.refresh} onClick={fetchUsers}>
          Refresh Users
        </button>

        <div style={styles.list}>
          {users.map((u) => (
            <div
              key={u._id || u.username}
              style={styles.userRow}
              onClick={() => navigate(`/chat/${u.username}`)}
            >
              <div style={styles.userLeft}>
                <div style={styles.avatar}>
                  {u.username?.[0]?.toUpperCase() || "?"}
                </div>
                <div style={styles.userName}>{u.username}</div>
              </div>

              {unread[u.username?.toLowerCase()] > 0 && (
                <div style={styles.badge}>
                  {unread[u.username.toLowerCase()]}
                </div>
              )}
            </div>
          ))}

          {users.length === 0 && (
            <div style={styles.empty}>No users found. Refresh.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at 10% 10%, rgba(120,80,255,0.35), transparent 45%), radial-gradient(circle at 90% 20%, rgba(0,255,200,0.22), transparent 40%), #05060a",
    padding: 18,
    fontFamily: "Inter, system-ui, Arial",
    color: "white",
  },
  panel: {
    width: 420,
    maxWidth: "95vw",
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(10,10,16,0.75)",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
    overflow: "hidden",
  },
  top: {
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background:
      "linear-gradient(90deg, rgba(120,80,255,0.22), rgba(0,255,200,0.10), rgba(255,60,180,0.12))",
  },
  brand: { fontWeight: 900, fontSize: 18 },
  sub: { opacity: 0.7, fontSize: 12, marginTop: 2 },
  logout: {
    padding: "8px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  },
  refresh: {
    margin: 14,
    width: "calc(100% - 28px)",
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  },
  list: {
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxHeight: "70vh",
    overflowY: "auto",
  },
  userRow: {
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    color: "white",
    background:
      "linear-gradient(135deg, rgba(120,80,255,1), rgba(0,255,200,0.9))",
  },
  userName: { fontWeight: 900, fontSize: 14 },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 900,
    background: "rgba(255,60,180,0.35)",
    border: "1px solid rgba(255,60,180,0.5)",
  },
  empty: {
    padding: 20,
    textAlign: "center",
    opacity: 0.7,
  },
};
