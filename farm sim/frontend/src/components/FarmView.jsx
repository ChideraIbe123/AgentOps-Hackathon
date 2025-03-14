// frontend/src/components/FarmView.jsx
import React from "react";
import { Stage, Layer, Circle, Text, Group } from "react-konva";
import "./FarmView.css";

const FarmView = ({ animals }) => {
  if (!animals || !Array.isArray(animals)) {
    return (
      <div className="farm-view-container">
        <div className="farm-view-empty">
          <p>No animals in the farm yet.</p>
          <p>Use the controls to add some animals!</p>
        </div>
      </div>
    );
  }

  const getAnimalColor = (animal) => {
    if (animal.health < 40) return "#ff4444";
    if (animal.hunger > 7) return "#ffa500";
    switch (animal.type.toLowerCase()) {
      case "chicken":
        return "#ffeb3b";
      case "cow":
        return "#795548";
      case "pig":
        return "#e91e63";
      default:
        return "#000";
    }
  };

  const getAnimalEmoji = (type) => {
    switch (type.toLowerCase()) {
      case "chicken":
        return "🐔";
      case "cow":
        return "🐄";
      case "pig":
        return "🐷";
      default:
        return "🐾";
    }
  };

  return (
    <div className="farm-view-container">
      <Stage width={800} height={600}>
        <Layer>
          {/* Draw grass background */}
          <Group>
            {Array(20)
              .fill()
              .map((_, i) =>
                Array(15)
                  .fill()
                  .map((_, j) => (
                    <Circle
                      key={`grass-${i}-${j}`}
                      x={i * 40 + 20}
                      y={j * 40 + 20}
                      radius={15}
                      fill="#81c784"
                      opacity={0.3}
                    />
                  ))
              )}
          </Group>

          {/* Draw animals */}
          {animals.map((animal, index) => (
            <Group
              key={animal.name}
              x={100 + (index % 5) * 150}
              y={100 + Math.floor(index / 5) * 150}
            >
              {/* Animal circle */}
              <Circle
                radius={30}
                fill={getAnimalColor(animal)}
                stroke="#000"
                strokeWidth={2}
                shadowColor="black"
                shadowBlur={5}
                shadowOpacity={0.3}
              />

              {/* Animal emoji */}
              <Text
                text={getAnimalEmoji(animal.type)}
                fontSize={30}
                align="center"
                verticalAlign="middle"
                x={-15}
                y={-15}
              />

              {/* Health bar */}
              <Group y={40}>
                <Circle radius={5} fill="#ef5350" x={-20} />
                <Text
                  text={`${Math.round(animal.health)}%`}
                  fontSize={12}
                  x={-15}
                  y={-6}
                />
              </Group>

              {/* Hunger bar */}
              <Group y={40}>
                <Circle radius={5} fill="#ffa726" x={20} />
                <Text
                  text={`${Math.round(animal.hunger * 10)}%`}
                  fontSize={12}
                  x={25}
                  y={-6}
                />
              </Group>

              {/* Animal name */}
              <Text
                text={animal.name}
                fontSize={14}
                fontStyle="bold"
                align="center"
                x={-30}
                y={-50}
                width={60}
              />
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default FarmView;
