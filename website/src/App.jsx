import { useState, useRef } from 'react';
import './App.css';
import { TbArrowsExchange2 } from 'react-icons/tb';
import TroopStatsInput from './components/TroopStatsInput';
import FormationInput from './components/FormationInput';
import Results from './components/Results';
import {
  runMatch,
  searchBestFormations,
  DEFAULT_YOU_TROOPS,
  DEFAULT_ENEMY_TROOPS,
  DEFAULT_ENEMY_FORMATION,
  DEFAULT_YOU_FORMATION,
} from './utils/calculator';
import { exportStatsToCSV, importStatsFromCSV } from './utils/csvUtils';

// Initialize combined stats (ATK, DEF, LETH, HP)
const DEFAULT_YOU_STATS = {
  Inf: { ATK: 0, DEF: 0, LETH: 0, HP: 0 },
  Cav: { ATK: 0, DEF: 0, LETH: 0, HP: 0 },
  Arch: { ATK: 0, DEF: 0, LETH: 0, HP: 0 },
};

const DEFAULT_ENEMY_STATS = {
  Inf: { ATK: 0, DEF: 0, LETH: 0, HP: 0 },
  Cav: { ATK: 0, DEF: 0, LETH: 0, HP: 0 },
  Arch: { ATK: 0, DEF: 0, LETH: 0, HP: 0 },
};

function App() {
  // Your Stats
  const [youStats, setYouStats] = useState(DEFAULT_YOU_STATS);
  const [youTroops, setYouTroops] = useState(DEFAULT_YOU_TROOPS);
  const [youFormation, setYouFormation] = useState(DEFAULT_YOU_FORMATION);

  // Enemy Stats
  const [enemyStats, setEnemyStats] = useState(DEFAULT_ENEMY_STATS);
  const [enemyTroops, setEnemyTroops] = useState(DEFAULT_ENEMY_TROOPS);
  const [enemyFormation, setEnemyFormation] = useState(DEFAULT_ENEMY_FORMATION);

  // Advanced Parameters
  const [alpha, setAlpha] = useState(0.7);
  const [beta, setBeta] = useState(0.3);

  // Results
  const [result, setResult] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  // File input ref for CSV import
  const fileInputRef = useRef(null);

  const handleSwapStats = () => {
    // Swap all stats and formations
    const tempStats = youStats;
    const tempFormation = youFormation;
    const tempTroops = youTroops;

    setYouStats(enemyStats);
    setYouFormation(enemyFormation);
    setYouTroops(enemyTroops);

    setEnemyStats(tempStats);
    setEnemyFormation(tempFormation);
    setEnemyTroops(tempTroops);

    // Clear results when swapping
    setResult(null);
    setRecommendations(null);
  };

  const handleExportCSV = () => {
    exportStatsToCSV(youStats, enemyStats, youFormation, enemyFormation, youTroops, enemyTroops);
  };

  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importStatsFromCSV(
      file,
      (data) => {
        setYouStats(data.youStats);
        setEnemyStats(data.enemyStats);
        setYouFormation(data.youFormation);
        setEnemyFormation(data.enemyFormation);
        setYouTroops(data.youTroops);
        setEnemyTroops(data.enemyTroops);
        alert('Stats imported successfully!');
      },
      (error) => {
        alert(`Import failed: ${error}`);
      }
    );

    // Reset file input
    e.target.value = '';
  };

  const handleCalculate = () => {
    // Validation
    if (youTroops <= 0 || enemyTroops <= 0) {
      alert('⚠️ Please enter troop numbers for both sides!');
      return;
    }

    const formationTotal = youFormation.Inf + youFormation.Cav + youFormation.Arch;
    const enemyFormationTotal = enemyFormation.Inf + enemyFormation.Cav + enemyFormation.Arch;
    
    if (Math.abs(formationTotal - 1.0) > 0.001) {
      alert('⚠️ Your formation percentages must total 100%!');
      return;
    }
    
    if (Math.abs(enemyFormationTotal - 1.0) > 0.001) {
      alert('⚠️ Enemy formation percentages must total 100%!');
      return;
    }

    // Split youStats into ATK/LETH and DEF/HP
    const youAtkLeth = {
      Inf: { ATK: youStats.Inf.ATK, LETH: youStats.Inf.LETH },
      Cav: { ATK: youStats.Cav.ATK, LETH: youStats.Cav.LETH },
      Arch: { ATK: youStats.Arch.ATK, LETH: youStats.Arch.LETH },
    };
    const youDefHp = {
      Inf: { DEF: youStats.Inf.DEF, HP: youStats.Inf.HP },
      Cav: { DEF: youStats.Cav.DEF, HP: youStats.Cav.HP },
      Arch: { DEF: youStats.Arch.DEF, HP: youStats.Arch.HP },
    };

    // Split enemyStats into ATK/LETH and DEF/HP
    const enemyAtkLeth = {
      Inf: { ATK: enemyStats.Inf.ATK, LETH: enemyStats.Inf.LETH },
      Cav: { ATK: enemyStats.Cav.ATK, LETH: enemyStats.Cav.LETH },
      Arch: { ATK: enemyStats.Arch.ATK, LETH: enemyStats.Arch.LETH },
    };
    const enemyDefHp = {
      Inf: { DEF: enemyStats.Inf.DEF, HP: enemyStats.Inf.HP },
      Cav: { DEF: enemyStats.Cav.DEF, HP: enemyStats.Cav.HP },
      Arch: { DEF: enemyStats.Arch.DEF, HP: enemyStats.Arch.HP },
    };

    // Calculate current formation result
    const matchResult = runMatch(
      youFormation,
      youAtkLeth,
      youDefHp,
      youTroops,
      enemyFormation,
      enemyAtkLeth,
      enemyDefHp,
      enemyTroops,
      alpha,
      beta
    );
    setResult(matchResult);

    // Automatically find best formations
    const best = searchBestFormations(
      enemyFormation,
      youAtkLeth,
      youDefHp,
      youTroops,
      enemyAtkLeth,
      enemyDefHp,
      enemyTroops,
      alpha,
      beta,
      5
    );
    setRecommendations(best);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏹 Kingshot Formation Optimizer</h1>
        <p>Total Effective Damage & Formation Calculator</p>
      </header>

      <main className="App-main">
        <div className="section-container">
          <div className="section">
            <h2>👤 Your Stats</h2>
            <TroopStatsInput
              title="Your Troop Stats"
              stats={youStats}
              onStatsChange={setYouStats}
            />
            <FormationInput
              title="Your Formation"
              formation={youFormation}
              onFormationChange={setYouFormation}
              troops={youTroops}
              onTroopsChange={setYouTroops}
            />
          </div>

          <div className="swap-button-container">
            <button className="btn-swap-circle" onClick={handleSwapStats} title="Swap Your ↔️ Enemy">
              <TbArrowsExchange2 size={24} />
            </button>
          </div>

          <div className="section">
            <h2>💀 Enemy Stats</h2>
            <TroopStatsInput
              title="Enemy Troop Stats"
              stats={enemyStats}
              onStatsChange={setEnemyStats}
            />
            <FormationInput
              title="Enemy Formation"
              formation={enemyFormation}
              onFormationChange={setEnemyFormation}
              troops={enemyTroops}
              onTroopsChange={setEnemyTroops}
            />
          </div>
        </div>

        <div className="advanced-params">
          <h3>⚙️ Advanced Parameters</h3>
          <div className="params-grid">
            <div className="param-item">
              <label>Alpha (Defense Weight):</label>
              <input
                type="number"
                step="0.1"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value) || 0.7)}
              />
            </div>
            <div className="param-item">
              <label>Beta (HP Weight):</label>
              <input
                type="number"
                step="0.1"
                value={beta}
                onChange={(e) => setBeta(parseFloat(e.target.value) || 0.3)}
              />
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn-primary" onClick={handleCalculate}>
            🎯 Calculate
          </button>
          <button className="btn-export" onClick={handleExportCSV}>
            📥 Export to CSV
          </button>
          <button className="btn-import" onClick={handleImportCSV}>
            📤 Import from CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <Results result={result} recommendations={recommendations} />
      </main>
    </div>
  );
}

export default App;
