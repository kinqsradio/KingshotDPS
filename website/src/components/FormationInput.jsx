import { useState, useEffect } from 'react';
import './FormationInput.css';

function FormationInput({ title, formation, onFormationChange, troops, onTroopsChange }) {
  const troopTypes = ['Inf', 'Cav', 'Arch'];

  const handlePercentageChange = (type, value) => {
    // Allow empty string for editing
    if (value === '' || value === null) {
      const newFormation = { ...formation };
      newFormation[type] = 0;
      onFormationChange(newFormation);
      return;
    }

    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const newFormation = { ...formation };
      newFormation[type] = Math.max(0, Math.min(100, numValue)) / 100;
      onFormationChange(newFormation);
    }
  };

  const total = Object.values(formation).reduce((sum, val) => sum + val, 0);
  const isValid = Math.abs(total - 1.0) < 0.01;

  return (
    <div className="formation-input">
      <h3>{title}</h3>
      <div className="formation-grid">
        {troopTypes.map((type) => (
          <div key={type} className="formation-row">
            <label>{type}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={Math.round(formation[type] * 10000) / 100}
              onChange={(e) => handlePercentageChange(type, e.target.value)}
            />
            <span>%</span>
            <span className="troop-count">
              ({Math.round(formation[type] * troops).toLocaleString()} troops)
            </span>
          </div>
        ))}
      </div>
      <div className="formation-total">
        <span>Total: {(Math.round(total * 10000) / 100).toFixed(2)}%</span>
        {!isValid && <span className="warning">⚠️ Must equal 100%</span>}
      </div>
      <div className="troops-input">
        <label>Total Troops:</label>
        <input
          type="number"
          step="1000"
          value={troops}
          onChange={(e) => onTroopsChange(parseInt(e.target.value) || 0)}
        />
      </div>
    </div>
  );
}

export default FormationInput;
