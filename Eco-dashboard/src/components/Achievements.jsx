import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

const Achievements = ({ user }) => {
  const [points, setPoints] = useState(0);
  const [solvedReports, setSolvedReports] = useState([]);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setPoints(userDoc.data().total_points || 0);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchSolvedReports = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "reports"));
        const reportsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // ✅ Fetch only "solved" reports assigned to this user
        const filteredReports = reportsData.filter(
          (report) => report.status === "solved" && report.cleaned_by === user.uid
        );

        setSolvedReports(filteredReports);
      } catch (error) {
        console.error("Error fetching solved reports:", error);
      }
    };

    fetchUserData();
    fetchSolvedReports();
  }, [user]);

  return (
    <div>
      <h1>🏆 Achievements</h1>
      <h2>Total Points: {points}</h2>

      <h3>✅ Your Completed Cleanups:</h3>
      {solvedReports.length === 0 ? (
        <p>No past cleanups recorded. Start cleaning up! 🌱</p>
      ) : (
        solvedReports.map((report) => (
          <div
            key={report.id}
            style={{
              border: "1px solid gray",
              padding: "10px",
              margin: "10px 0",
            }}
          >
            <h3>{report.type}</h3>
            <p>{report.description}</p>
            <p>🌟 Points Earned: {report.points || 0}</p>
            {report.imageUrl && <img src={report.imageUrl} alt="report" width="300" />}
            <p>📍 Location: {report.location ? `${report.location.lat}, ${report.location.lng}` : "Unknown"}</p>
          </div>
        ))
      )}

      {/* ✅ Single Redeem Points Button for the Entire Page */}
      {points > 0 && (
        <button
          style={{
            marginTop: "20px",
            padding: "10px",
            fontSize: "16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
          onClick={() => alert("🎁 Rewards system coming soon!")}
        >
          🎁 Redeem Points
        </button>
      )}
    </div>
  );
};

export default Achievements;
