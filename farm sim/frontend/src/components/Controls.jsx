// frontend/src/components/Controls.jsx
import React, { useState } from "react";
import "./Controls.css";

const Controls = ({ ws, state }) => {
  const [feedAmount, setFeedAmount] = useState(10);
  const [selectedAnimal1, setSelectedAnimal1] = useState("");
  const [selectedAnimal2, setSelectedAnimal2] = useState("");
  const [selectedItem, setSelectedItem] = useState("eggs");
  const [sellQuantity, setSellQuantity] = useState(1);
  const [actionMessage, setActionMessage] = useState(null);
  const [selectedAnimalType, setSelectedAnimalType] = useState("chicken");
  const [animalName, setAnimalName] = useState("");

  const handleBuyFeed = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setActionMessage({ type: "error", text: "Not connected to server" });
      return;
    }

    ws.send(
      JSON.stringify({
        action: "buy_feed",
        amount: feedAmount,
      })
    );
    setActionMessage({ type: "success", text: `Buying ${feedAmount} feed...` });

    // Clear message after 3 seconds
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleSellItem = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setActionMessage({ type: "error", text: "Not connected to server" });
      return;
    }

    if (!state.resources || state.resources[selectedItem] < sellQuantity) {
      setActionMessage({
        type: "error",
        text: `Not enough ${selectedItem} to sell`,
      });
      return;
    }

    ws.send(
      JSON.stringify({
        action: "sell",
        item: selectedItem,
        quantity: sellQuantity,
      })
    );
    setActionMessage({
      type: "success",
      text: `Selling ${sellQuantity} ${selectedItem}...`,
    });

    // Clear message after 3 seconds
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleBreedAnimals = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setActionMessage({ type: "error", text: "Not connected to server" });
      return;
    }

    if (!selectedAnimal1 || !selectedAnimal2) {
      setActionMessage({
        type: "error",
        text: "Please select two animals to breed",
      });
      return;
    }

    if (selectedAnimal1 === selectedAnimal2) {
      setActionMessage({
        type: "error",
        text: "Cannot breed an animal with itself",
      });
      return;
    }

    // Find the animals to check if they're the same type
    const animal1 = state.animals.find((a) => a.name === selectedAnimal1);
    const animal2 = state.animals.find((a) => a.name === selectedAnimal2);

    if (!animal1 || !animal2) {
      setActionMessage({
        type: "error",
        text: "One or both selected animals not found",
      });
      return;
    }

    if (animal1.type !== animal2.type) {
      setActionMessage({
        type: "error",
        text: "Cannot breed different types of animals",
      });
      return;
    }

    ws.send(
      JSON.stringify({
        action: "breed",
        animal1: selectedAnimal1,
        animal2: selectedAnimal2,
      })
    );
    setActionMessage({
      type: "success",
      text: `Attempting to breed ${selectedAnimal1} and ${selectedAnimal2}...`,
    });

    // Reset selections after breeding attempt
    setSelectedAnimal1("");
    setSelectedAnimal2("");

    // Clear message after 3 seconds
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleBuyAnimal = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setActionMessage({ type: "error", text: "Not connected to server" });
      return;
    }

    if (!animalName.trim()) {
      setActionMessage({
        type: "error",
        text: "Please enter a name for your animal",
      });
      return;
    }

    ws.send(
      JSON.stringify({
        action: "buy_animal",
        type: selectedAnimalType,
        name: animalName,
      })
    );
    setActionMessage({
      type: "success",
      text: `Buying a new ${selectedAnimalType} named ${animalName}...`,
    });

    // Reset the name field after purchase
    setAnimalName("");

    // Clear message after 3 seconds
    setTimeout(() => setActionMessage(null), 3000);
  };

  return (
    <div className="controls-container">
      <h2>Farm Controls</h2>

      {actionMessage && (
        <div className={`action-message ${actionMessage.type}`}>
          {actionMessage.text}
        </div>
      )}

      <div className="control-sections">
        <div className="control-section">
          <h3>Buy Feed</h3>
          <div className="control-inputs">
            <div className="input-group">
              <label htmlFor="feedAmount">Amount:</label>
              <input
                type="number"
                id="feedAmount"
                min="1"
                max="100"
                value={feedAmount}
                onChange={(e) => setFeedAmount(parseInt(e.target.value))}
              />
            </div>
            <div className="cost-preview">
              Cost: ${(feedAmount * 0.75).toFixed(2)}
            </div>
            <button
              className="action-button"
              onClick={handleBuyFeed}
              disabled={!ws || ws.readyState !== WebSocket.OPEN}
            >
              Buy Feed
            </button>
          </div>
        </div>

        <div className="control-section">
          <h3>Buy Animals</h3>
          <div className="control-inputs">
            <div className="input-group">
              <label htmlFor="animalType">Type:</label>
              <select
                id="animalType"
                value={selectedAnimalType}
                onChange={(e) => setSelectedAnimalType(e.target.value)}
              >
                <option value="chicken">Chicken ($50)</option>
                <option value="cow">Cow ($200)</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="animalName">Name:</label>
              <input
                type="text"
                id="animalName"
                value={animalName}
                onChange={(e) => setAnimalName(e.target.value)}
                placeholder="Enter animal name"
                maxLength={20}
              />
            </div>
            <div className="cost-preview">
              Cost: $
              {selectedAnimalType === "chicken"
                ? "50"
                : selectedAnimalType === "cow"
                ? "200"
                : "100"}
            </div>
            <button
              className="action-button"
              onClick={handleBuyAnimal}
              disabled={
                !ws ||
                ws.readyState !== WebSocket.OPEN ||
                !animalName.trim() ||
                (state.resources &&
                  state.resources.money <
                    (selectedAnimalType === "chicken"
                      ? 50
                      : selectedAnimalType === "cow"
                      ? 200
                      : 100))
              }
            >
              Buy Animal
            </button>
          </div>
        </div>

        <div className="control-section">
          <h3>Sell Resources</h3>
          <div className="control-inputs">
            <div className="input-group">
              <label htmlFor="itemSelect">Item:</label>
              <select
                id="itemSelect"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
              >
                <option value="eggs">
                  Eggs (${state.market_prices?.eggs?.toFixed(2) || "0.00"})
                </option>
                <option value="milk">
                  Milk (${state.market_prices?.milk?.toFixed(2) || "0.00"})
                </option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="sellQuantity">Quantity:</label>
              <input
                type="number"
                id="sellQuantity"
                min="1"
                max={state.resources ? state.resources[selectedItem] : 0}
                value={sellQuantity}
                onChange={(e) => setSellQuantity(parseInt(e.target.value))}
              />
            </div>
            <div className="available-resources">
              Available:{" "}
              {state.resources ? state.resources[selectedItem] || 0 : 0}{" "}
              {selectedItem}
            </div>
            <div className="earnings-preview">
              Earnings: $
              {state.market_prices
                ? (
                    (state.market_prices[selectedItem] || 0) * sellQuantity
                  ).toFixed(2)
                : "0.00"}
            </div>
            <div className="resource-info">
              {selectedItem === "eggs" && "🥚 Produced by chickens"}
              {selectedItem === "milk" && "🥛 Produced by cows"}
            </div>
            <button
              className="action-button"
              onClick={handleSellItem}
              disabled={
                !ws ||
                ws.readyState !== WebSocket.OPEN ||
                !state.resources ||
                state.resources[selectedItem] < sellQuantity
              }
            >
              Sell {selectedItem}
            </button>
          </div>
        </div>

        <div className="control-section">
          <h3>Breed Animals</h3>
          <div className="control-inputs">
            <div className="input-group">
              <label htmlFor="animal1Select">Animal 1:</label>
              <select
                id="animal1Select"
                value={selectedAnimal1}
                onChange={(e) => setSelectedAnimal1(e.target.value)}
              >
                <option value="">Select Animal</option>
                {Array.isArray(state.animals) &&
                  state.animals.map((animal) => (
                    <option key={animal.name} value={animal.name}>
                      {animal.name} ({animal.type})
                    </option>
                  ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="animal2Select">Animal 2:</label>
              <select
                id="animal2Select"
                value={selectedAnimal2}
                onChange={(e) => setSelectedAnimal2(e.target.value)}
              >
                <option value="">Select Animal</option>
                {Array.isArray(state.animals) &&
                  state.animals.map((animal) => (
                    <option key={animal.name} value={animal.name}>
                      {animal.name} ({animal.type})
                    </option>
                  ))}
              </select>
            </div>
            <div className="breeding-info">
              {selectedAnimal1 && selectedAnimal2 && (
                <p>
                  Selected: {selectedAnimal1} + {selectedAnimal2}
                </p>
              )}
            </div>
            <button
              className="action-button"
              onClick={handleBreedAnimals}
              disabled={
                !ws ||
                ws.readyState !== WebSocket.OPEN ||
                !selectedAnimal1 ||
                !selectedAnimal2 ||
                selectedAnimal1 === selectedAnimal2
              }
            >
              Breed Animals
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;
