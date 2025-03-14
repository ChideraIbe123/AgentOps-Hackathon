// frontend/src/components/DiseaseAlert.jsx
import React from "react";
import "./DiseaseAlert.css";

const DiseaseAlert = ({ diseases }) => {
  if (!diseases || diseases.length === 0) {
    return null;
  }

  const getDiseaseIcon = (type) => {
    switch (type.toLowerCase()) {
      case "flu":
        return "🤒";
      case "infection":
        return "🦠";
      case "injury":
        return "🤕";
      default:
        return "⚠️";
    }
  };

  return (
    <div className="disease-alert-container">
      <div className="disease-alert-header">
        <span className="alert-icon">⚕️</span>
        <h3>Health Alerts</h3>
      </div>

      <div className="disease-list">
        {diseases.map((disease, index) => (
          <div key={index} className="disease-item">
            <span className="disease-icon">{getDiseaseIcon(disease.type)}</span>
            <div className="disease-info">
              <div className="disease-name">{disease.type}</div>
              <div className="disease-details">
                Affecting:{" "}
                <span className="affected-animal">{disease.animal_name}</span>
                <br />
                Severity: {disease.severity}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="disease-alert-footer">
        Monitor affected animals closely and ensure they are well-fed to boost
        recovery.
      </div>
    </div>
  );
};

export default DiseaseAlert;
