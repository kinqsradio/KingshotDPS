import { useState } from 'react';
import './StatsInput.css';

function StatsInput({ title, stats, onStatsChange }) {
  const troopTypes = ['Inf', 'Cav', 'Arch'];
  const statTypes = Object.keys(stats.Inf);

  return (
    <div className="stats-input">
      <h3>{title}</h3>
      <div className="stats-grid">
        <div className="stats-header">
          <div>Type</div>
          {statTypes.map((stat) => (
            <div key={stat}>{stat}</div>
          ))}
        </div>
        {troopTypes.map((troop) => (
          <div key={troop} className="stats-row">
            <div className="troop-label">{troop}</div>
            {statTypes.map((stat) => (
              <input
                key={`${troop}-${stat}`}
                type="number"
                step="0.1"
                value={stats[troop][stat]}
                onChange={(e) => {
                  const newStats = { ...stats };
                  newStats[troop] = { ...newStats[troop] };
                  newStats[troop][stat] = parseFloat(e.target.value) || 0;
                  onStatsChange(newStats);
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StatsInput;
