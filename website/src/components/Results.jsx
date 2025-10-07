import './Results.css';

function Results({ result, recommendations }) {
  if (!result) return null;

  const getRatioColor = (ratio) => {
    if (ratio >= 1.1) return '#00ff00';
    if (ratio >= 1.0) return '#90ee90';
    if (ratio >= 0.9) return '#ffff00';
    if (ratio >= 0.8) return '#ffa500';
    return '#ff4444';
  };

  const getWinColor = (winPct) => {
    if (winPct >= 80) return '#00ff00';
    if (winPct >= 60) return '#90ee90';
    if (winPct >= 40) return '#ffff00';
    if (winPct >= 20) return '#ffa500';
    return '#ff4444';
  };

  return (
    <div className="results">
      <h2>📊 Battle Results</h2>
      
      <div className="results-grid">
        <div className="result-card main-stats">
          <h3>Main Stats</h3>
          <div className="stat-item">
            <span className="stat-label">Damage Ratio:</span>
            <span
              className="stat-value large"
              style={{ color: getRatioColor(result.ratio) }}
            >
              {result.ratio.toFixed(4)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Win Probability:</span>
            <span
              className="stat-value large"
              style={{ color: getWinColor(result.winPercentage) }}
            >
              {result.winPercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="result-card damage-comparison">
          <h3>Total Damage</h3>
          <div className="damage-bars">
            <div className="damage-item">
              <span className="damage-label">Your Damage:</span>
              <span className="damage-value">
                {result.yourDamage.toLocaleString()}
              </span>
            </div>
            <div className="damage-item">
              <span className="damage-label">Enemy Damage:</span>
              <span className="damage-value">
                {result.enemyDamage.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="result-card breakdown">
          <h3>Damage Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Your Damage</th>
                <th>Enemy Damage</th>
              </tr>
            </thead>
            <tbody>
              {['Inf', 'Cav', 'Arch'].map((type) => (
                <tr key={type}>
                  <td className="type-label">{type}</td>
                  <td>{result.yourBreakdown[type].toLocaleString()}</td>
                  <td>{result.enemyBreakdown[type].toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {recommendations && recommendations.length > 0 && (
        <div className="recommendations">
          <h2>🧠 {recommendations[0].scenario ? 'Strategic Formation Guide' : 'Top Recommended Formations'}</h2>
          <div className="recommendations-list">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="recommendation-card">
                <div className="rank">#{idx + 1}</div>
                <div className="formation-display">
                  {rec.scenario && (
                    <span className="scenario-label" style={{ color: '#00bfff', fontWeight: 'bold', marginBottom: '4px' }}>
                      {rec.scenario}
                    </span>
                  )}
                  <span className="formation-text">
                    {Math.round(rec.formation.Inf * 100)}:
                    {Math.round(rec.formation.Cav * 100)}:
                    {Math.round(rec.formation.Arch * 100)}
                  </span>
                  <span className="formation-labels">(Inf:Cav:Arch)</span>
                  {rec.description && (
                    <span className="description-text" style={{ fontSize: '0.85em', color: '#aaa', marginTop: '4px' }}>
                      {rec.description}
                    </span>
                  )}
                </div>
                {rec.ratio !== null && rec.winPercentage !== null && (
                  <div className="rec-stats">
                    <span
                      className="rec-ratio"
                      style={{ color: getRatioColor(rec.ratio) }}
                    >
                      Ratio: {rec.ratio.toFixed(3)}
                    </span>
                    <span
                      className="rec-win"
                      style={{ color: getWinColor(rec.winPercentage) }}
                    >
                      Win: {rec.winPercentage.toFixed(1)}%
                    </span>
                  </div>
                )}
                {rec.yourDamage && rec.enemyDamage && (
                  <div className="rec-damage" style={{ marginTop: '8px', fontSize: '0.9em', color: '#ccc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Your Damage:</span>
                      <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{rec.yourDamage.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Enemy Damage:</span>
                      <span style={{ color: '#ff8888', fontWeight: 'bold' }}>{rec.enemyDamage.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                {rec.yourBreakdown && (
                  <div className="rec-breakdown" style={{ marginTop: '8px', fontSize: '0.85em', color: '#999' }}>
                    <div style={{ marginBottom: '2px' }}>Your: Inf {rec.yourBreakdown.Inf.toLocaleString()} | Cav {rec.yourBreakdown.Cav.toLocaleString()} | Arch {rec.yourBreakdown.Arch.toLocaleString()}</div>
                    <div>Enemy: Inf {rec.enemyBreakdown.Inf.toLocaleString()} | Cav {rec.enemyBreakdown.Cav.toLocaleString()} | Arch {rec.enemyBreakdown.Arch.toLocaleString()}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Results;
