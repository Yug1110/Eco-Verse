import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

const Leaderboard = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersData = querySnapshot.docs.map((doc) => {
          const userData = doc.data();
          return {
            id: doc.id,
            name: userData.name || "Unknown User",
            total_points: userData.total_points || 0,
            achievements: userData.achievements || [], // Ensure it's an array
          };
        });

        // Sort users by points (Highest → Lowest)
        const sortedUsers = usersData.sort((a, b) => b.total_points - a.total_points);

        setUsers(sortedUsers);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <h1>🏆 EcoVoice Leaderboard</h1>
      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Total Points</th>
            <th>Cleanups</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="4">No users found.</td>
            </tr>
          ) : (
            users.map((user, index) => (
              <tr key={user.id}>
                <td>#{index + 1}</td>
                <td>{user.name}</td>
                <td>🌟 {user.total_points}</td>
                <td>✅ {user.achievements ? user.achievements.length : 0}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
