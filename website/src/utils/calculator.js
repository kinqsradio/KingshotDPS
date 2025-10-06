// =============================================================
// 🏹 KINQS Total Effective Damage & Formation Optimizer
// =============================================================

// 1️⃣ Advantage System
// Infantry beats Cavalry
// Cavalry beats Archer
// Archer beats Infantry
export function getAdvantage(yourType, enemyRatios) {
  const tri = {
    Inf: { Inf: 1.0, Cav: 1.35, Arch: 0.75 },  // Inf strong vs Cav, weak vs Arch
    Cav: { Inf: 0.75, Cav: 1.0, Arch: 1.35 },  // Cav weak vs Inf, strong vs Arch
    Arch: { Inf: 1.35, Cav: 0.75, Arch: 1.0 }, // Arch strong vs Inf, weak vs Cav
  };

  return (
    enemyRatios.Inf * tri[yourType].Inf +
    enemyRatios.Cav * tri[yourType].Cav +
    enemyRatios.Arch * tri[yourType].Arch
  );
}

// 2️⃣ Effective Damage Formula (Troop-based)
export function effDamageType(
  troopCount,
  atk,
  leth,
  adv,
  enemyDef,
  enemyHp,
  alpha = 0.7,
  beta = 0.3
) {
  const mitig =
    Math.pow(1 + enemyDef / 100, alpha) * Math.pow(1 + enemyHp / 100, beta);
  return (troopCount * (1 + atk / 100) * (1 + leth / 100) * adv) / mitig;
}

// 3️⃣ Total Effective Damage (All Types)
export function totalEffDamage(
  stats,
  totalTroops,
  enemyRatios,
  enemyTanks,
  alpha = 0.7,
  beta = 0.3
) {
  let total = 0.0;
  const breakdown = {};

  for (const t of ["Inf", "Cav", "Arch"]) {
    const adv = getAdvantage(t, enemyRatios);
    const troopCount = totalTroops * stats[t].RATIO;
    const val = effDamageType(
      troopCount,
      stats[t].ATK,
      stats[t].LETH,
      adv,
      enemyTanks[t].DEF,
      enemyTanks[t].HP,
      alpha,
      beta
    );
    breakdown[t] = Math.round(val * 100) / 100;
    total += val;
  }

  return {
    total: Math.round(total * 100) / 100,
    breakdown,
  };
}

// 4️⃣ Win Probability from Ratio
export function winProbFromRatio(ratio, a = 8.0) {
  return 1.0 / (1.0 + Math.exp(-a * (ratio - 1.0)));
}

// 5️⃣ Run Match Simulation
export function runMatch(
  youForm,
  youAtkLeth,
  youDefHp,
  youTroops,
  enemyForm,
  enemyAtkLeth,
  enemyDefHp,
  enemyTroops,
  alpha = 0.7,
  beta = 0.3
) {
  // Merge ratios with stats
  const youStats = {};
  const enemyStats = {};

  for (const t of ["Inf", "Cav", "Arch"]) {
    youStats[t] = {
      ATK: youAtkLeth[t].ATK,
      LETH: youAtkLeth[t].LETH,
      RATIO: youForm[t],
    };
    enemyStats[t] = {
      ATK: enemyAtkLeth[t].ATK,
      LETH: enemyAtkLeth[t].LETH,
      RATIO: enemyForm[t],
    };
  }

  // Compute total effective damage
  const youResult = totalEffDamage(
    youStats,
    youTroops,
    enemyForm,
    enemyDefHp,
    alpha,
    beta
  );
  const enemyResult = totalEffDamage(
    enemyStats,
    enemyTroops,
    youForm,
    youDefHp,
    alpha,
    beta
  );

  const ratio = Math.round((youResult.total / enemyResult.total) * 10000) / 10000;
  const winProb = Math.round(winProbFromRatio(ratio) * 1000) / 10;

  return {
    formation: youForm,
    ratio,
    winPercentage: winProb,
    yourDamage: youResult.total,
    yourBreakdown: youResult.breakdown,
    enemyDamage: enemyResult.total,
    enemyBreakdown: enemyResult.breakdown,
  };
}

// 6️⃣ Search Best Formations
export function searchBestFormations(
  enemyForm,
  youAtkLeth,
  youDefHp,
  youTroops,
  enemyAtkLeth,
  enemyDefHp,
  enemyTroops,
  alpha = 0.7,
  beta = 0.3,
  topK = 5
) {
  const results = [];

  // Search through all possible formations with 5% increments
  // Each troop type must be at least 10% and max 55% for balanced formations
  for (let infPct = 10; infPct <= 55; infPct += 5) {
    for (let cavPct = 10; cavPct <= 55; cavPct += 5) {
      const archPct = 100 - infPct - cavPct;
      
      // Skip if archer percentage is less than 10% or more than 55%
      if (archPct < 10 || archPct > 55) continue;

      const inf = infPct / 100;
      const cav = cavPct / 100;
      const arch = archPct / 100;

      const youForm = { Inf: inf, Cav: cav, Arch: arch };
      const result = runMatch(
        youForm,
        youAtkLeth,
        youDefHp,
        youTroops,
        enemyForm,
        enemyAtkLeth,
        enemyDefHp,
        enemyTroops,
        alpha,
        beta
      );
      results.push(result);
    }
  }

  results.sort((a, b) => b.ratio - a.ratio);
  return results.slice(0, topK);
}

// 7️⃣ Default Stats
export const DEFAULT_YOU_ATK_LETH = {
  Inf: { ATK: 0, LETH: 0 },
  Cav: { ATK: 0, LETH: 0 },
  Arch: { ATK: 0, LETH: 0 },
};

export const DEFAULT_YOU_DEF_HP = {
  Inf: { DEF: 0, HP: 0 },
  Cav: { DEF: 0, HP: 0 },
  Arch: { DEF: 0, HP: 0 },
};

export const DEFAULT_ENEMY_ATK_LETH = {
  Inf: { ATK: 0, LETH: 0 },
  Cav: { ATK: 0, LETH: 0 },
  Arch: { ATK: 0, LETH: 0 },
};

export const DEFAULT_ENEMY_DEF_HP = {
  Inf: { DEF: 0, HP: 0 },
  Cav: { DEF: 0, HP: 0 },
  Arch: { DEF: 0, HP: 0 },
};

export const DEFAULT_YOU_TROOPS = 0;
export const DEFAULT_ENEMY_TROOPS = 0;

export const DEFAULT_ENEMY_FORMATION = {
  Inf: 0.33,
  Cav: 0.33,
  Arch: 0.34,
};

export const DEFAULT_YOU_FORMATION = {
  Inf: 0.33,
  Cav: 0.33,
  Arch: 0.34,
};
