// frontend/src/components/AnimalViz.jsx
import React from "react";

const AnimalViz = ({ animal, x, y }) => {
  return (
    <div
      className="animal-viz"
      style={{ position: "absolute", left: x, top: y }}
    >
      <div className="status-bars">
        <div
          className="hunger-bar"
          style={{ width: `${animal.hunger * 10}%` }}
        />
        <div className="health-bar" style={{ width: `${animal.health}%` }} />
      </div>
      <div className="animal-info">
        <span className="name">{animal.name}</span>
        <span className="type">{animal.type}</span>
      </div>
    </div>
  );
};

export default AnimalViz;
