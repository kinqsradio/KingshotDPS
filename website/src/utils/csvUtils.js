// CSV Export/Import utilities

export function exportStatsToCSV(youStats, enemyStats, youFormation, enemyFormation, youTroops, enemyTroops) {
  const rows = [
    ['Side', 'Type', 'Attack', 'Defense', 'Lethality', 'Health', 'Formation %', 'Total Troops'],
    ['Your', 'Inf', youStats.Inf.ATK, youStats.Inf.DEF, youStats.Inf.LETH, youStats.Inf.HP, Math.round(youFormation.Inf * 100), youTroops],
    ['Your', 'Cav', youStats.Cav.ATK, youStats.Cav.DEF, youStats.Cav.LETH, youStats.Cav.HP, Math.round(youFormation.Cav * 100), ''],
    ['Your', 'Arch', youStats.Arch.ATK, youStats.Arch.DEF, youStats.Arch.LETH, youStats.Arch.HP, Math.round(youFormation.Arch * 100), ''],
    ['Enemy', 'Inf', enemyStats.Inf.ATK, enemyStats.Inf.DEF, enemyStats.Inf.LETH, enemyStats.Inf.HP, Math.round(enemyFormation.Inf * 100), enemyTroops],
    ['Enemy', 'Cav', enemyStats.Cav.ATK, enemyStats.Cav.DEF, enemyStats.Cav.LETH, enemyStats.Cav.HP, Math.round(enemyFormation.Cav * 100), ''],
    ['Enemy', 'Arch', enemyStats.Arch.ATK, enemyStats.Arch.DEF, enemyStats.Arch.LETH, enemyStats.Arch.HP, Math.round(enemyFormation.Arch * 100), ''],
  ];

  const csvContent = rows.map(row => row.join(',').replace(/\n/g, '')).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `kingshot_stats_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function importStatsFromCSV(file, onSuccess, onError) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 7) {
        throw new Error('Invalid CSV format: not enough rows');
      }

      // Skip header row
      const dataLines = lines.slice(1);
      
      const youStats = { Inf: {}, Cav: {}, Arch: {} };
      const enemyStats = { Inf: {}, Cav: {}, Arch: {} };
      const youFormation = {};
      const enemyFormation = {};
      let youTroops = 0;
      let enemyTroops = 0;

      dataLines.forEach((line, index) => {
        const parts = line.split(',').map(p => p.trim());
        
        if (parts.length < 7) return;

        const [side, type, atk, def, leth, hp, formationPct, troops] = parts;
        
        const stats = {
          ATK: parseFloat(atk) || 0,
          DEF: parseFloat(def) || 0,
          LETH: parseFloat(leth) || 0,
          HP: parseFloat(hp) || 0,
        };

        const formation = (parseFloat(formationPct) || 0) / 100;

        if (side === 'Your') {
          youStats[type] = stats;
          youFormation[type] = formation;
          if (troops) youTroops = parseInt(troops) || 0;
        } else if (side === 'Enemy') {
          enemyStats[type] = stats;
          enemyFormation[type] = formation;
          if (troops) enemyTroops = parseInt(troops) || 0;
        }
      });

      onSuccess({
        youStats,
        enemyStats,
        youFormation,
        enemyFormation,
        youTroops,
        enemyTroops,
      });
    } catch (error) {
      onError(error.message || 'Failed to parse CSV file');
    }
  };

  reader.onerror = () => {
    onError('Failed to read file');
  };

  reader.readAsText(file);
}
