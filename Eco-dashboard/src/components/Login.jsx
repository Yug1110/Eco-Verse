import React from "react";
import { signInWithGoogle } from "../firebaseConfig";

const Login = ({ setUser }) => {
  const handleLogin = async () => {
    const user = await signInWithGoogle();
    if (user) setUser(user); // Store user info in state
  };

  return (
    <div className="login-container">
      <h1>Welcome to EcoVoice 🌍</h1>
      <button onClick={handleLogin} className="login-btn">
        Sign in with Google
      </button>
    </div>
  );
};

export default Login;
