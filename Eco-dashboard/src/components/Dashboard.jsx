import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const Dashboard = ({ user }) => {
  const [reports, setReports] = useState([]);
  const [sortBy, setSortBy] = useState("points");
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "reports"));
        const reportsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter only 'unattended' reports
        const filteredReports = reportsData.filter(
          (report) => report.status === "unattended"
        );

        setReports(filteredReports);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    };

    fetchReports();
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => console.error("Geolocation error:", error),
      { enableHighAccuracy: true }
    );
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (angle) => (angle * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const sortedReports = [...reports].sort((a, b) => {
    if (sortBy === "points") {
      return b.points - a.points;
    } else if (sortBy === "distance" && userLocation) {
      const distA = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        a.location.lat,
        a.location.lng
      );
      const distB = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        b.location.lat,
        b.location.lng
      );
      return distA - distB;
    }
    return 0;
  });

  const claimCleanup = async (reportId, reportPoints, reportDescription) => {
    try {
      if (!user) {
        alert("You must be logged in to claim a cleanup!");
        return;
      }

      const reportRef = doc(db, "reports", reportId);
      await updateDoc(reportRef, { status: "solved", cleaned_by: user.uid });

      alert("Cleanup claimed! 🎉 Points added to your profile.");
      setReports(reports.filter((report) => report.id !== reportId));
    } catch (error) {
      console.error("Error claiming cleanup:", error);
    }
  };

  const vote = async (reportId, voteType) => {
    try {
      const reportRef = doc(db, "reports", reportId);
      const reportSnapshot = await getDocs(collection(db, "reports"));
      const reportData = reportSnapshot.docs
        .find((doc) => doc.id === reportId)
        .data();

      let newVotes = reportData.votes || 0;

      if (voteType === "upvote") {
        newVotes += 1;
      } else if (voteType === "downvote") {
        newVotes = Math.max(0, newVotes - 1);
      }

      await updateDoc(reportRef, { votes: newVotes });

      setReports((prevReports) =>
        prevReports.map((report) =>
          report.id === reportId ? { ...report, votes: newVotes } : report
        )
      );
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  return (
    <div>
      <h1>EcoVoice Reports</h1>

      <div>
        <label>Sort By:</label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="points">Points (High → Low)</option>
          <option value="distance">Distance (Near → Far)</option>
        </select>
      </div>

      {sortedReports.length === 0 ? (
        <p>No unattended reports available.</p>
      ) : (
        sortedReports.map((report) => (
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
            <p>🌟 Points: {report.points}</p>
            <p>📢 Votes: {report.votes || 0}</p>
            {report.imageUrl && (
              <img src={report.imageUrl} alt="report" width="300" />
            )}
            <p>
              📍 Location:{" "}
              {report.location
                ? `${report.location.lat}, ${report.location.lng}`
                : "Unknown"}
            </p>
            {userLocation && (
              <p>
                📏 Distance:{" "}
                {calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  report.location.lat,
                  report.location.lng
                ).toFixed(2)}{" "}
                km
              </p>
            )}

            {/* ✅ Upvote / Downvote Buttons */}
            <button onClick={() => vote(report.id, "upvote")}>👍 Upvote</button>
            <button onClick={() => vote(report.id, "downvote")}>👎 Downvote</button>

            {/* ✅ Claim Cleanup Button */}
            <button
              onClick={() =>
                claimCleanup(report.id, report.points, report.description)
              }
            >
              ✅ Claim Cleanup
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default Dashboard;
