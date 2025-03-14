// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from "react";
import FarmView from "./components/FarmView";
import Controls from "./components/Controls";
import DiseaseAlert from "./components/DiseaseAlert";
import MarketChart from "./components/MarketChart";
import "./AppNew.css";

function App() {
  const [farmState, setFarmState] = useState({
    resources: { eggs: 0, milk: 0, slop: 0, feed: 0, money: 0 },
    animals: [],
    weather: "sunny",
    market_prices: {},
    achievements: [],
    diseases: [],
    market_history: [],
    total_days: 0,
  });
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [error, setError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [debugInfo, setDebugInfo] = useState("");

  // Create a function to establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    // When running in a browser, always use localhost
    // This is critical because 'backend' hostname only works within Docker network
    const hostname = window.location.hostname; // This will be 'localhost' in browser
    const wsUrl = `ws://${hostname}:8000/ws`;

    // Add debug info
    setDebugInfo(`Trying to connect to: ${wsUrl}`);

    console.log(
      `Connecting to WebSocket at: ${wsUrl} (Attempt: ${reconnectAttempt + 1})`
    );
    setConnectionStatus(`Connecting (Attempt: ${reconnectAttempt + 1})...`);

    try {
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log("WebSocket connection established");
        setConnectionStatus("Connected");
        setError(null);
        setDebugInfo(`Connected successfully to ${wsUrl}`);
        // Request initial state
        websocket.send("STATE");
      };

      websocket.onmessage = (event) => {
        console.log("Received message:", event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.type === "state_update" || data.type === "initial_state") {
            setFarmState(data.state);
          } else if (data.type === "action_result") {
            setFarmState(data.state);
            // You could also handle success/error messages here if needed
          } else if (data.type === "error") {
            setError(data.error);
            if (data.state) {
              setFarmState(data.state);
            }
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
          setError("Failed to parse data from server");
        }
      };

      websocket.onerror = (event) => {
        console.error("WebSocket error:", event);
        setConnectionStatus("Error");
        setDebugInfo(
          `Error connecting to ${wsUrl}: ${event.message || "Unknown error"}`
        );
        setError(
          "WebSocket connection error. Check if the backend server is running."
        );
      };

      websocket.onclose = (event) => {
        console.log("WebSocket connection closed", event);
        setConnectionStatus("Disconnected");
        setDebugInfo(`Connection closed: ${event.reason || "Unknown reason"}`);

        // Try to reconnect after a delay
        setTimeout(() => {
          setReconnectAttempt((prev) => prev + 1);
        }, 3000);
      };

      setWs(websocket);

      return websocket;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setConnectionStatus("Failed to Connect");
      setDebugInfo(`Failed to create connection: ${error.message}`);
      setError(`Failed to create WebSocket connection: ${error.message}`);

      // Try to reconnect after a delay
      setTimeout(() => {
        setReconnectAttempt((prev) => prev + 1);
      }, 3000);

      return null;
    }
  }, [reconnectAttempt]);

  // Connect to WebSocket when component mounts or when reconnection is needed
  useEffect(() => {
    const websocket = connectWebSocket();

    return () => {
      if (websocket) {
        console.log("Closing WebSocket connection");
        websocket.close();
      }
    };
  }, [connectWebSocket, reconnectAttempt]);

  // Function to manually reconnect
  const handleReconnect = () => {
    if (ws) {
      ws.close();
    }
    setReconnectAttempt((prev) => prev + 1);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AI Farm Simulator 🚜</h1>
        <div
          className={`connection-status ${connectionStatus
            .toLowerCase()
            .replace(/\s+/g, "-")}`}
        >
          <span>Status: {connectionStatus}</span>
          {error && <div className="error-message">{error}</div>}
          {debugInfo && <div className="debug-info">{debugInfo}</div>}
          {connectionStatus === "Disconnected" && (
            <button className="reconnect-button" onClick={handleReconnect}>
              Reconnect
            </button>
          )}
        </div>
      </header>

      <div className="farm-dashboard">
        <div className="dashboard-section resources-panel">
          <h2>Resources</h2>
          <div className="resources-grid">
            <div className="resource-item">
              <span className="resource-icon">💰</span>
              <span className="resource-value">
                ${farmState.resources.money}
              </span>
              <span className="resource-label">Money</span>
            </div>
            <div className="resource-item">
              <span className="resource-icon">🥚</span>
              <span className="resource-value">{farmState.resources.eggs}</span>
              <span className="resource-label">Eggs</span>
            </div>
            <div className="resource-item">
              <span className="resource-icon">🥛</span>
              <span className="resource-value">{farmState.resources.milk}</span>
              <span className="resource-label">Milk</span>
            </div>
            <div className="resource-item">
              <span className="resource-icon">🌾</span>
              <span className="resource-value">{farmState.resources.feed}</span>
              <span className="resource-label">Feed</span>
            </div>
          </div>
        </div>

        <div className="dashboard-section weather-panel">
          <h2>Weather</h2>
          <div className="weather-display">
            {farmState.weather === "sunny" && (
              <span className="weather-icon">☀️</span>
            )}
            {farmState.weather === "rainy" && (
              <span className="weather-icon">🌧️</span>
            )}
            {farmState.weather === "stormy" && (
              <span className="weather-icon">⛈️</span>
            )}
            {farmState.weather === "heatwave" && (
              <span className="weather-icon">🔥</span>
            )}
            <span className="weather-label">{farmState.weather}</span>
          </div>
          <div className="day-counter">Day: {farmState.total_days}</div>
        </div>
      </div>

      <div className="main-content">
        <div className="left-panel">
          <DiseaseAlert diseases={farmState.diseases || []} />
          <FarmView animals={farmState.animals || []} />
        </div>

        <div className="right-panel">
          <Controls ws={ws} state={farmState} />
          <MarketChart history={farmState.market_history || []} />
        </div>
      </div>

      <div className="achievements-panel">
        <h2>Achievements</h2>
        <div className="achievements-list">
          {farmState.achievements.length === 0 ? (
            <p>No achievements yet. Keep farming!</p>
          ) : (
            farmState.achievements.map((achievement, index) => (
              <div key={index} className="achievement-item">
                <span className="achievement-icon">🏆</span>
                <span className="achievement-name">{achievement}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
