import React, { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Achievements from "./components/Achievements";
import Leaderboard from "./components/LeaderBoard";
import { logout } from "./firebaseConfig";

const App = () => {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");

  return (
    <div>
      {!user ? (
        <Login setUser={setUser} />
      ) : (
        <>
          <nav>
            <h2>EcoVoice</h2>
            <button onClick={() => setTab("dashboard")}>📌 Reports</button>
            <button onClick={() => setTab("achievements")}>🏆 Achievements</button>
            <button onClick={() => setTab("leaderboard")}>🥇 Leaderboard</button>
            <button onClick={logout}>Logout</button>
          </nav>

          {tab === "dashboard" && <Dashboard user={user} />}
          {tab === "achievements" && <Achievements user={user} />}
          {tab === "leaderboard" && <Leaderboard />}
        </>
      )}
    </div>
  );
};

export default App;
