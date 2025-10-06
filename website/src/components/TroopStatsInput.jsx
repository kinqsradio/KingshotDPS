import './TroopStatsInput.css';

function TroopStatsInput({ title, stats, onStatsChange }) {
  const troopTypes = ['Inf', 'Cav', 'Arch'];
  const statOrder = ['ATK', 'DEF', 'LETH', 'HP'];

  const handleStatChange = (troop, stat, value) => {
    const newStats = { ...stats };
    newStats[troop] = { ...newStats[troop] };
    newStats[troop][stat] = parseFloat(value) || 0;
    onStatsChange(newStats);
  };

  return (
    <div className="troop-stats-input">
      <h3>{title}</h3>
      <div className="troop-stats-grid">
        <div className="stats-header">
          <div>Type</div>
          <div>Attack</div>
          <div>Defense</div>
          <div>Lethality</div>
          <div>Health</div>
        </div>
        {troopTypes.map((troop) => (
          <div key={troop} className="stats-row">
            <div className="troop-label">{troop}</div>
            {statOrder.map((stat) => (
              <input
                key={`${troop}-${stat}`}
                type="number"
                step="0.1"
                value={stats[troop][stat]}
                onChange={(e) => handleStatChange(troop, stat, e.target.value)}
                placeholder="0"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TroopStatsInput;
