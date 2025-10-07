// =============================================================
// 🏹 KINQS Total Effective Damage & Formation Optimizer
// =============================================================

// 1️⃣ Advantage System - Based on Kingshot Game Mechanics
// Infantry: Master Brawler (+10% dmg to Cav) + Bands of Steel (+10% def vs Cav)
// Cavalry: Charge (+10% dmg to Arch) + Ambusher (20% chance to bypass Inf, attack Arch)
// Archers: Ranged Strike (+10% dmg to Inf) + Volley (10% chance double attack)
export function getAdvantage(yourType, enemyRatios) {
  const tri = {
    // Infantry: Strong vs Cav (+10% dmg), Weak vs Arch (-10% dmg from Arch)
    Inf: { Inf: 1.0, Cav: 1.10, Arch: 0.90 },
    // Cavalry: Strong vs Arch (+10% dmg + 20% bypass), Weak vs Inf (-10% dmg)
    // The 20% bypass Ambusher skill makes Cav more effective vs Arch
    Cav: { Inf: 0.90, Cav: 1.0, Arch: 1.20 },
    // Archers: Strong vs Inf (+10% dmg + 10% double attack), Weak vs Cav
    // Volley skill adds extra damage potential
    Arch: { Inf: 1.15, Cav: 0.85, Arch: 1.0 },
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

  // Calculate ratio with safety check
  let ratio = enemyResult.total > 0 ? youResult.total / enemyResult.total : 1.0;
  
  // Apply formation synergy bonus based on optimal ratios
  // Based on Kingshot mechanics: Archers are primary DPS, Inf are tanks, Cav are flankers
  const formationScore = calculateFormationSynergy(youForm);
  ratio *= formationScore;
  
  // Ensure ratio is valid
  if (isNaN(ratio) || !isFinite(ratio)) {
    ratio = 1.0;
  }
  
  ratio = Math.round(ratio * 10000) / 10000;
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

// 6️⃣ Helper: Round formation to nearest 5%
function roundFormationTo5Percent(formation) {
  // Validate input
  if (!formation || 
      typeof formation.Inf !== 'number' || 
      typeof formation.Cav !== 'number' || 
      typeof formation.Arch !== 'number' ||
      isNaN(formation.Inf) || 
      isNaN(formation.Cav) || 
      isNaN(formation.Arch)) {
    // Return a default valid formation if input is invalid
    return { Inf: 0.30, Cav: 0.20, Arch: 0.50 };
  }
  
  let inf = Math.round(formation.Inf * 20) / 20; // Round to nearest 0.05
  let cav = Math.round(formation.Cav * 20) / 20;
  let arch = Math.round(formation.Arch * 20) / 20;
  
  // Validate rounded values
  if (isNaN(inf)) inf = 0.30;
  if (isNaN(cav)) cav = 0.20;
  if (isNaN(arch)) arch = 0.50;
  
  // Ensure they sum to 1.0 by adjusting the largest component
  const total = inf + cav + arch;
  if (Math.abs(total - 1.0) > 0.001) {
    const diff = 1.0 - total;
    // Add difference to largest component
    if (inf >= cav && inf >= arch) inf += diff;
    else if (cav >= arch) cav += diff;
    else arch += diff;
  }
  
  return { Inf: inf, Cav: cav, Arch: arch };
}

// 7️⃣ Helper: Calculate formation synergy based on Kingshot optimal ratios
function calculateFormationSynergy(formation) {
  // Kingshot optimal march formation: 50% Arch, 30% Inf, 20% Cav
  // This rewards formations closer to proven effective ratios (subtle effect)
  const optimal = { Inf: 0.30, Cav: 0.20, Arch: 0.50 };
  
  // Calculate deviation from optimal (lower is better)
  const deviation = 
    Math.abs(formation.Inf - optimal.Inf) +
    Math.abs(formation.Cav - optimal.Cav) +
    Math.abs(formation.Arch - optimal.Arch);
  
  // Convert to synergy score (1.0 = perfect, decreases with deviation)
  // Max deviation = 2.0 (if completely opposite), min = 0 (perfect match)
  const synergyScore = 1.0 + (0.03 * (1 - deviation / 2.0)); // Up to +3% bonus
  
  // Additional bonuses for role fulfillment (very subtle)
  let roleBonus = 1.0;
  
  // Archers should be primary damage dealers (40-60% is ideal)
  if (formation.Arch >= 0.40 && formation.Arch <= 0.60) {
    roleBonus *= 1.015; // +1.5% for good archer coverage
  }
  
  // Infantry should be substantial tanks (25-40% is good)
  if (formation.Inf >= 0.25 && formation.Inf <= 0.40) {
    roleBonus *= 1.01; // +1% for good tank line
  }
  
  // Cavalry as flankers (15-25% is optimal)
  if (formation.Cav >= 0.15 && formation.Cav <= 0.25) {
    roleBonus *= 1.01; // +1% for optimal flanking force
  }
  
  // Penalize extreme formations that don't match game design (subtle)
  // Too few archers (< 25%) = losing primary damage
  if (formation.Arch < 0.25) {
    roleBonus *= 0.98; // -2% penalty
  }
  
  // Too few infantry (< 15%) = weak frontline
  if (formation.Inf < 0.15) {
    roleBonus *= 0.98; // -2% penalty
  }
  
  // Too much cavalry (> 40%) = inefficient (they're flankers, not main force)
  if (formation.Cav > 0.40) {
    roleBonus *= 0.98; // -2% penalty
  }
  
  return synergyScore * roleBonus;
}

// 8️⃣ Helper: Calculate stat advantage for each troop type
function calculateStatAdvantage(yourStats, enemyStats) {
  const advantages = {};
  for (const type of ["Inf", "Cav", "Arch"]) {
    // Calculate relative strength based on offensive and defensive stats
    const yourOffensive = (yourStats[type].ATK + yourStats[type].LETH) / 2;
    const yourDefensive = (yourStats[type].DEF + yourStats[type].HP) / 2;
    const enemyOffensive = (enemyStats[type].ATK + enemyStats[type].LETH) / 2;
    const enemyDefensive = (enemyStats[type].DEF + enemyStats[type].HP) / 2;
    
    // Higher score = better stats relative to enemy
    const offensiveAdvantage = enemyDefensive > 0 ? yourOffensive / enemyDefensive : 1;
    const defensiveAdvantage = yourDefensive > 0 ? enemyOffensive / yourDefensive : 1;
    
    advantages[type] = (offensiveAdvantage + (1 / defensiveAdvantage)) / 2;
  }
  return advantages;
}

// 9️⃣ Detect user's playstyle based on their stats
function detectPlaystyle(yourStats) {
  // Calculate total power for each troop type
  const infPower = yourStats.Inf.ATK + yourStats.Inf.LETH + yourStats.Inf.DEF + yourStats.Inf.HP;
  const cavPower = yourStats.Cav.ATK + yourStats.Cav.LETH + yourStats.Cav.DEF + yourStats.Cav.HP;
  const archPower = yourStats.Arch.ATK + yourStats.Arch.LETH + yourStats.Arch.DEF + yourStats.Arch.HP;
  
  const totalPower = infPower + cavPower + archPower;
  
  // If no stats, default to balanced
  if (totalPower === 0) {
    return "balanced";
  }
  
  // Find the strongest troop type
  const maxPower = Math.max(infPower, cavPower, archPower);
  const avgPower = totalPower / 3;
  
  // If the strongest type is at least 10% better than average, that's the focus
  const threshold = avgPower * 1.10; // 10% above average
  
  if (maxPower >= threshold) {
    if (archPower === maxPower) return "archer";
    if (infPower === maxPower) return "infantry";
    if (cavPower === maxPower) return "cavalry";
  }
  
  // If all types are relatively equal (within 10% of each other), return balanced
  return "balanced";
}

// Enhanced Playstyle Detection with Statistical Analysis
function detectAdvancedPlaystyle(yourStats) {
  // Calculate comprehensive power metrics for each troop type
  const troopMetrics = {};
  for (const type of ["Inf", "Cav", "Arch"]) {
    const stats = yourStats[type];
    // Weighted combination of offensive and defensive capabilities
    const offensivePower = (stats.ATK * 0.6 + stats.LETH * 0.4) / 100;
    const defensivePower = (stats.DEF * 0.5 + stats.HP * 0.5) / 100;
    const totalPower = offensivePower + defensivePower;

    troopMetrics[type] = {
      offensive: offensivePower,
      defensive: defensivePower,
      total: totalPower,
      efficiency: offensivePower * 0.7 + defensivePower * 0.3
    };
  }

  // Calculate relative strengths
  const totalEfficiency = Object.values(troopMetrics).reduce((sum, m) => sum + m.efficiency, 0);
  if (totalEfficiency === 0) return "balanced";

  const relativeStrengths = {};
  for (const type of ["Inf", "Cav", "Arch"]) {
    relativeStrengths[type] = troopMetrics[type].efficiency / totalEfficiency;
  }

  // Determine primary playstyle based on strongest troop type
  const maxStrength = Math.max(...Object.values(relativeStrengths));
  const threshold = 0.38; // 38% threshold for specialization

  if (relativeStrengths.Arch >= threshold) return "archer";
  if (relativeStrengths.Inf >= threshold) return "infantry";
  if (relativeStrengths.Cav >= threshold) return "cavalry";

  // Check for dual specializations (two troop types above 30%)
  const highTypes = Object.entries(relativeStrengths).filter(([_, strength]) => strength > 0.30);
  if (highTypes.length >= 2) {
    // Sort by strength to prioritize the strongest combinations
    highTypes.sort((a, b) => b[1] - a[1]); // Sort by strength descending
    
    // Determine the most synergistic combination based on strongest troops
    const [strongestType] = highTypes[0];
    const [secondStrongestType] = highTypes[1];
    
    if (strongestType === "Arch" && secondStrongestType === "Cav") return "archer_cavalry";
    if (strongestType === "Inf" && secondStrongestType === "Arch") return "infantry_archer";
    if (strongestType === "Inf" && secondStrongestType === "Cav") return "infantry_cavalry";
    if (strongestType === "Arch" && secondStrongestType === "Inf") return "infantry_archer"; // Reverse order
    if (strongestType === "Cav" && secondStrongestType === "Arch") return "archer_cavalry"; // Reverse order
    if (strongestType === "Cav" && secondStrongestType === "Inf") return "infantry_cavalry"; // Reverse order
  }

  return "balanced";
}

// Generate Optimal Formations for Specific Playstyle
function generateOptimalFormationsForPlaystyle(playstyle, count = 8) {
  const formations = [];

  // Base formations for each playstyle with variations
  const playstyleBases = {
    archer: [
      { Inf: 0.30, Cav: 0.20, Arch: 0.50 }, // Standard archer
      { Inf: 0.25, Cav: 0.25, Arch: 0.50 }, // Archer with cavalry support
      { Inf: 0.35, Cav: 0.15, Arch: 0.50 }, // Archer with infantry tank
      { Inf: 0.30, Cav: 0.30, Arch: 0.40 }, // Balanced archer
      { Inf: 0.25, Cav: 0.15, Arch: 0.60 }, // Heavy archer
    ],
    infantry: [
      { Inf: 0.50, Cav: 0.20, Arch: 0.30 }, // Standard infantry
      { Inf: 0.45, Cav: 0.25, Arch: 0.30 }, // Infantry with cavalry
      { Inf: 0.50, Cav: 0.15, Arch: 0.35 }, // Infantry with archer support
      { Inf: 0.45, Cav: 0.20, Arch: 0.35 }, // Balanced infantry
      { Inf: 0.55, Cav: 0.20, Arch: 0.25 }, // Heavy infantry
    ],
    cavalry: [
      { Inf: 0.30, Cav: 0.40, Arch: 0.30 }, // Standard cavalry
      { Inf: 0.25, Cav: 0.45, Arch: 0.30 }, // Heavy cavalry
      { Inf: 0.30, Cav: 0.35, Arch: 0.35 }, // Cavalry with archer support
      { Inf: 0.35, Cav: 0.40, Arch: 0.25 }, // Cavalry with infantry support
      { Inf: 0.25, Cav: 0.40, Arch: 0.35 }, // Balanced cavalry
    ],
    archer_cavalry: [
      { Inf: 0.25, Cav: 0.35, Arch: 0.40 }, // Archer-cavalry hybrid
      { Inf: 0.30, Cav: 0.30, Arch: 0.40 }, // Balanced hybrid
      { Inf: 0.20, Cav: 0.40, Arch: 0.40 }, // Heavy hybrid
    ],
    infantry_archer: [
      { Inf: 0.40, Cav: 0.20, Arch: 0.40 }, // Infantry-archer hybrid
      { Inf: 0.35, Cav: 0.25, Arch: 0.40 }, // Balanced hybrid
      { Inf: 0.40, Cav: 0.15, Arch: 0.45 }, // Heavy hybrid
    ],
    infantry_cavalry: [
      { Inf: 0.40, Cav: 0.35, Arch: 0.25 }, // Infantry-cavalry hybrid
      { Inf: 0.35, Cav: 0.40, Arch: 0.25 }, // Balanced hybrid
      { Inf: 0.40, Cav: 0.30, Arch: 0.30 }, // Heavy hybrid
    ],
    balanced: [
      { Inf: 0.33, Cav: 0.33, Arch: 0.34 }, // Perfect balance
      { Inf: 0.35, Cav: 0.30, Arch: 0.35 }, // Slight archer bias
      { Inf: 0.35, Cav: 0.35, Arch: 0.30 }, // Slight infantry bias
      { Inf: 0.30, Cav: 0.35, Arch: 0.35 }, // Slight cavalry bias
      { Inf: 0.40, Cav: 0.30, Arch: 0.30 }, // Tanky balance
    ]
  };

  const baseFormations = playstyleBases[playstyle] || playstyleBases.balanced;

  // Generate variations around base formations
  for (const base of baseFormations) {
    formations.push(roundFormationTo5Percent(base));

    // Add small variations (±5%)
    for (let i = 0; i < 3; i++) {
      const variation = {
        Inf: Math.max(0.15, Math.min(0.60, base.Inf + (Math.random() - 0.5) * 0.1)),
        Cav: Math.max(0.10, Math.min(0.55, base.Cav + (Math.random() - 0.5) * 0.1)),
        Arch: Math.max(0.15, Math.min(0.60, base.Arch + (Math.random() - 0.5) * 0.1)),
      };

      // Renormalize
      const total = variation.Inf + variation.Cav + variation.Arch;
      variation.Inf /= total;
      variation.Cav /= total;
      variation.Arch /= total;

      formations.push(roundFormationTo5Percent(variation));
    }
  }

  // Remove duplicates and limit to requested count
  const uniqueFormations = [];
  const seen = new Set();

  for (const formation of formations) {
    const key = `${Math.round(formation.Inf * 100)}-${Math.round(formation.Cav * 100)}-${Math.round(formation.Arch * 100)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFormations.push(formation);
      if (uniqueFormations.length >= count) break;
    }
  }

  return uniqueFormations;
}

// 🔟 Blind PVP Recommendations - Strategic formations based on detected playstyle
function getBlindPVPRecommendations(yourStats, youAtkLeth, youDefHp, youTroops, alpha, beta) {
  const playstyle = detectPlaystyle(yourStats);
  
  // Helper function to calculate damage for a formation against a hypothetical enemy
  const calculateFormationDamage = (formation, enemyFormation) => {
    // Create hypothetical balanced enemy stats (average stats)
    const avgEnemyStats = {
      ATK: 500,
      DEF: 500,
      LETH: 400,
      HP: 400
    };
    
    const enemyAtkLeth = {
      Inf: { ATK: avgEnemyStats.ATK, LETH: avgEnemyStats.LETH },
      Cav: { ATK: avgEnemyStats.ATK, LETH: avgEnemyStats.LETH },
      Arch: { ATK: avgEnemyStats.ATK, LETH: avgEnemyStats.LETH },
    };
    
    const enemyDefHp = {
      Inf: { DEF: avgEnemyStats.DEF, HP: avgEnemyStats.HP },
      Cav: { DEF: avgEnemyStats.DEF, HP: avgEnemyStats.HP },
      Arch: { DEF: avgEnemyStats.DEF, HP: avgEnemyStats.HP },
    };
    
    // Calculate the match result
    const result = runMatch(
      formation,
      youAtkLeth,
      youDefHp,
      youTroops,
      enemyFormation,
      enemyAtkLeth,
      enemyDefHp,
      youTroops, // Same troop count
      alpha,
      beta
    );
    
    return result;
  };
  
  // Archer Focus Formations
  const archerFormations = [
    {
      formation: { Inf: 0.40, Cav: 0.10, Arch: 0.50 },
      scenario: "🏹 Archer Focus: Blind PvP",
      description: "Balanced burst with archer dominance",
      enemyFormation: { Inf: 0.33, Cav: 0.33, Arch: 0.34 },
    },
    {
      formation: { Inf: 0.30, Cav: 0.10, Arch: 0.60 },
      scenario: "🏹 Archer Focus: vs Infantry Heavy",
      description: "Max DPS against tank-heavy enemies",
      enemyFormation: { Inf: 0.50, Cav: 0.25, Arch: 0.25 },
    },
    {
      formation: { Inf: 0.50, Cav: 0.10, Arch: 0.40 },
      scenario: "🏹 Archer Focus: vs Archer Heavy",
      description: "Strong wall against enemy archers",
      enemyFormation: { Inf: 0.25, Cav: 0.25, Arch: 0.50 },
    },
    {
      formation: { Inf: 0.60, Cav: 0.30, Arch: 0.10 },
      scenario: "🏹 Archer Focus: vs Cavalry Heavy",
      description: "Heavy counter - Infantry crush Cavalry",
      enemyFormation: { Inf: 0.25, Cav: 0.50, Arch: 0.25 },
    },
    {
      formation: { Inf: 0.40, Cav: 0.10, Arch: 0.50 },
      scenario: "🏹 Archer Focus: vs Balanced",
      description: "Safe mix for all-around matchups",
      enemyFormation: { Inf: 0.30, Cav: 0.20, Arch: 0.50 },
    },
  ].map(rec => {
    const result = calculateFormationDamage(rec.formation, rec.enemyFormation);
    return {
      ...rec,
      ratio: result.ratio,
      winPercentage: result.winPercentage,
      yourDamage: result.yourDamage,
      yourBreakdown: result.yourBreakdown,
      enemyDamage: result.enemyDamage,
      enemyBreakdown: result.enemyBreakdown,
    };
  });
  
  // Infantry Focus Formations
  const infantryFormations = [
    {
      formation: { Inf: 0.50, Cav: 0.20, Arch: 0.30 },
      scenario: "🛡️ Infantry Focus: Blind PvP",
      description: "Tank-heavy wall with sustained damage",
      enemyFormation: { Inf: 0.33, Cav: 0.33, Arch: 0.34 },
    },
    {
      formation: { Inf: 0.55, Cav: 0.15, Arch: 0.30 },
      scenario: "🛡️ Infantry Focus: vs Cavalry Heavy",
      description: "Massive frontline to counter cavalry",
      enemyFormation: { Inf: 0.25, Cav: 0.50, Arch: 0.25 },
    },
    {
      formation: { Inf: 0.45, Cav: 0.25, Arch: 0.30 },
      scenario: "🛡️ Infantry Focus: vs Archer Heavy",
      description: "Tank through archer damage with cavalry flanks",
      enemyFormation: { Inf: 0.25, Cav: 0.25, Arch: 0.50 },
    },
    {
      formation: { Inf: 0.50, Cav: 0.20, Arch: 0.30 },
      scenario: "🛡️ Infantry Focus: vs Infantry Heavy",
      description: "Mirror match with sustained frontline",
      enemyFormation: { Inf: 0.50, Cav: 0.25, Arch: 0.25 },
    },
    {
      formation: { Inf: 0.50, Cav: 0.20, Arch: 0.30 },
      scenario: "🛡️ Infantry Focus: vs Balanced",
      description: "Solid wall for all-purpose defense",
      enemyFormation: { Inf: 0.30, Cav: 0.20, Arch: 0.50 },
    },
  ].map(rec => {
    const result = calculateFormationDamage(rec.formation, rec.enemyFormation);
    return {
      ...rec,
      ratio: result.ratio,
      winPercentage: result.winPercentage,
      yourDamage: result.yourDamage,
      yourBreakdown: result.yourBreakdown,
      enemyDamage: result.enemyDamage,
      enemyBreakdown: result.enemyBreakdown,
    };
  });
  
  // Cavalry Focus Formations
  const cavalryFormations = [
    {
      formation: { Inf: 0.30, Cav: 0.40, Arch: 0.30 },
      scenario: "🐎 Cavalry Focus: Blind PvP",
      description: "Aggressive flanking and disruption",
      enemyFormation: { Inf: 0.33, Cav: 0.33, Arch: 0.34 },
    },
    {
      formation: { Inf: 0.25, Cav: 0.45, Arch: 0.30 },
      scenario: "🐎 Cavalry Focus: vs Archer Heavy",
      description: "Heavy cavalry rush against archers",
      enemyFormation: { Inf: 0.25, Cav: 0.25, Arch: 0.50 },
    },
    {
      formation: { Inf: 0.35, Cav: 0.35, Arch: 0.30 },
      scenario: "🐎 Cavalry Focus: vs Infantry Heavy",
      description: "Bypass infantry with cavalry flanking",
      enemyFormation: { Inf: 0.50, Cav: 0.25, Arch: 0.25 },
    },
    {
      formation: { Inf: 0.30, Cav: 0.40, Arch: 0.30 },
      scenario: "🐎 Cavalry Focus: vs Cavalry Heavy",
      description: "Mobility vs mobility matchup",
      enemyFormation: { Inf: 0.25, Cav: 0.50, Arch: 0.25 },
    },
    {
      formation: { Inf: 0.30, Cav: 0.40, Arch: 0.30 },
      scenario: "🐎 Cavalry Focus: vs Balanced",
      description: "Flanking pressure for all scenarios",
      enemyFormation: { Inf: 0.30, Cav: 0.20, Arch: 0.50 },
    },
  ].map(rec => {
    const result = calculateFormationDamage(rec.formation, rec.enemyFormation);
    return {
      ...rec,
      ratio: result.ratio,
      winPercentage: result.winPercentage,
      yourDamage: result.yourDamage,
      yourBreakdown: result.yourBreakdown,
      enemyDamage: result.enemyDamage,
      enemyBreakdown: result.enemyBreakdown,
    };
  });
  
  // Test multiple formations and pick the top 5 performers
  const testFormations = [];
  
  // Test a wide range of balanced formations
  const formationsToTest = [
    // Standard meta variations
    { Inf: 0.50, Cav: 0.20, Arch: 0.30, label: "Standard Meta (5:2:3)" },
    { Inf: 0.25, Cav: 0.25, Arch: 0.50, label: "Balanced Aggressive" },
    { Inf: 0.35, Cav: 0.15, Arch: 0.50, label: "Tank Meta" },
    { Inf: 0.30, Cav: 0.30, Arch: 0.40, label: "Cav Heavy" },
    { Inf: 0.35, Cav: 0.25, Arch: 0.40, label: "Defensive" },
    { Inf: 0.40, Cav: 0.20, Arch: 0.40, label: "Fortress" },
    { Inf: 0.25, Cav: 0.30, Arch: 0.45, label: "Flanking Pressure" },
    { Inf: 0.30, Cav: 0.25, Arch: 0.45, label: "Versatile" },
  ];
  
  // For balanced playstyle, calculate best formations against different enemy types
  const enemyScenarios = [
    { formation: { Inf: 0.33, Cav: 0.33, Arch: 0.34 }, label: "Blind PvP" },
    { formation: { Inf: 0.50, Cav: 0.25, Arch: 0.25 }, label: "vs Infantry Heavy" },
    { formation: { Inf: 0.25, Cav: 0.50, Arch: 0.25 }, label: "vs Cavalry Heavy" },
    { formation: { Inf: 0.25, Cav: 0.25, Arch: 0.50 }, label: "vs Archer Heavy" },
    { formation: { Inf: 0.30, Cav: 0.20, Arch: 0.50 }, label: "vs Balanced" },
  ];
  
  const balancedFormations = enemyScenarios.map(scenario => {
    // Test all formations against this enemy type
    const results = formationsToTest.map(form => {
      const result = calculateFormationDamage(form, scenario.formation);
      return {
        formation: form,
        result: result,
        score: result.ratio, // Use ratio as score
      };
    });
    
    // Pick the best formation for this scenario
    results.sort((a, b) => b.score - a.score);
    const best = results[0];
    
    return {
      formation: best.formation,
      scenario: `📊 Balanced: ${scenario.label}`,
      description: `${best.formation.label} - Best against ${scenario.label.toLowerCase()}`,
      enemyFormation: scenario.formation,
      ratio: best.result.ratio,
      winPercentage: best.result.winPercentage,
      yourDamage: best.result.yourDamage,
      yourBreakdown: best.result.yourBreakdown,
      enemyDamage: best.result.enemyDamage,
      enemyBreakdown: best.result.enemyBreakdown,
    };
  });
  

  
  // Return formations based on detected playstyle
  switch (playstyle) {
    case "archer":
      return archerFormations;
    case "infantry":
      return infantryFormations;
    case "cavalry":
      return cavalryFormations;
    default:
      return balancedFormations;
  }
}

// 🔟 Intelligent Formation Search with Advanced Genetic Optimization
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
  // Check if this is "blind PVP" (enemy has no stats or minimal stats)
  const enemyStats = {};
  for (const t of ["Inf", "Cav", "Arch"]) {
    enemyStats[t] = { ...enemyAtkLeth[t], ...enemyDefHp[t] };
  }
  const isBlindPVP = Object.values(enemyStats).every(stat => 
    stat.ATK === 0 && stat.DEF === 0 && stat.LETH === 0 && stat.HP === 0
  );
  
  // For blind PVP, return advanced strategic counter-formations
  if (isBlindPVP) {
    const yourStats = {};
    for (const t of ["Inf", "Cav", "Arch"]) {
      yourStats[t] = { ...youAtkLeth[t], ...youDefHp[t] };
    }
    return getAdvancedBlindPVPRecommendations(yourStats, youAtkLeth, youDefHp, youTroops, alpha, beta);
  }

  // For known enemy, use genetic algorithm optimization with constraints
  return geneticFormationOptimizationWithConstraints(
    enemyForm,
    youAtkLeth,
    youDefHp,
    youTroops,
    enemyAtkLeth,
    enemyDefHp,
    enemyTroops,
    alpha,
    beta,
    60, // population size
    30, // generations
    0.12 // mutation rate
  );
}

// 🔟 Advanced Genetic Algorithm for Formation Optimization
function geneticFormationOptimization(
  enemyForm,
  youAtkLeth,
  youDefHp,
  youTroops,
  enemyAtkLeth,
  enemyDefHp,
  enemyTroops,
  alpha = 0.7,
  beta = 0.3,
  populationSize = 50,
  generations = 20,
  mutationRate = 0.1
) {
  // Initialize population with diverse formations
  let population = [];
  for (let i = 0; i < populationSize; i++) {
    population.push(generateRandomFormation());
  }

  // Fitness function
  const fitness = (formation) => {
    const result = runMatch(
      formation,
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
    // Multi-objective fitness: ratio + win probability + formation efficiency
    const efficiency = calculateFormationEfficiency(formation);
    return result.ratio * 0.6 + (result.winPercentage / 100) * 0.3 + efficiency * 0.1;
  };

  // Evolution loop
  for (let gen = 0; gen < generations; gen++) {
    // Evaluate fitness
    const fitnessScores = population.map(fitness);

    // Selection (tournament selection)
    const selected = [];
    for (let i = 0; i < populationSize; i++) {
      const tournament = [];
      for (let j = 0; j < 3; j++) {
        const randomIndex = Math.floor(Math.random() * populationSize);
        tournament.push({ formation: population[randomIndex], fitness: fitnessScores[randomIndex] });
      }
      tournament.sort((a, b) => b.fitness - a.fitness);
      selected.push(tournament[0].formation);
    }

    // Crossover and mutation
    const newPopulation = [];
    for (let i = 0; i < populationSize; i += 2) {
      const parent1 = selected[i];
      const parent2 = selected[i + 1] || selected[0];

      // Crossover (blend crossover)
      const child1 = {
        Inf: (parent1.Inf + parent2.Inf) / 2 + (Math.random() - 0.5) * 0.1,
        Cav: (parent1.Cav + parent2.Cav) / 2 + (Math.random() - 0.5) * 0.1,
        Arch: (parent1.Arch + parent2.Arch) / 2 + (Math.random() - 0.5) * 0.1,
      };

      const child2 = {
        Inf: (parent1.Inf + parent2.Inf) / 2 + (Math.random() - 0.5) * 0.1,
        Cav: (parent1.Cav + parent2.Cav) / 2 + (Math.random() - 0.5) * 0.1,
        Arch: (parent1.Arch + parent2.Arch) / 2 + (Math.random() - 0.5) * 0.1,
      };

      // Normalize and validate
      [child1, child2].forEach(child => {
        // Ensure valid ranges
        child.Inf = Math.max(0.15, Math.min(0.60, child.Inf));
        child.Cav = Math.max(0.10, Math.min(0.55, child.Cav));
        child.Arch = Math.max(0.15, Math.min(0.60, child.Arch));

        // Renormalize to sum to 1
        const total = child.Inf + child.Cav + child.Arch;
        child.Inf /= total;
        child.Cav /= total;
        child.Arch /= total;

        // Mutation
        if (Math.random() < mutationRate) {
          const mutateType = Math.floor(Math.random() * 3);
          const mutation = (Math.random() - 0.5) * 0.1;
          if (mutateType === 0) child.Inf = Math.max(0.15, Math.min(0.60, child.Inf + mutation));
          else if (mutateType === 1) child.Cav = Math.max(0.10, Math.min(0.55, child.Cav + mutation));
          else child.Arch = Math.max(0.15, Math.min(0.60, child.Arch + mutation));

          // Renormalize after mutation
          const newTotal = child.Inf + child.Cav + child.Arch;
          child.Inf /= newTotal;
          child.Cav /= newTotal;
          child.Arch /= newTotal;
        }
      });

      newPopulation.push(child1, child2);
    }

    population = newPopulation.slice(0, populationSize);
  }

  // Return the best formations
  const finalFitness = population.map(f => ({ formation: f, fitness: fitness(f) }));
  finalFitness.sort((a, b) => b.fitness - a.fitness);

  return finalFitness.slice(0, 5).map(item => {
    const roundedFormation = roundFormationTo5Percent(item.formation);
    const result = runMatch(
      roundedFormation, youAtkLeth, youDefHp, youTroops,
      enemyForm, enemyAtkLeth, enemyDefHp, enemyTroops,
      alpha, beta
    );
    return result;
  });
}

// Formation Constraint Validation
function validateFormationConstraints(formation) {
  // Basic range validation
  if (formation.Inf < 0.15 || formation.Inf > 0.60) return false;
  if (formation.Cav < 0.10 || formation.Cav > 0.55) return false;
  if (formation.Arch < 0.15 || formation.Arch > 0.60) return false;

  // Sum validation (should be very close to 1.0)
  const total = formation.Inf + formation.Cav + formation.Arch;
  if (Math.abs(total - 1.0) > 0.01) return false;

  // Kingshot-specific constraints
  // 1. No single troop type should exceed 60% (unrealistic spam)
  if (formation.Inf > 0.60 || formation.Cav > 0.55 || formation.Arch > 0.60) return false;

  // 2. Minimum viable presence for each troop type
  if (formation.Inf < 0.15 || formation.Cav < 0.10 || formation.Arch < 0.15) return false;

  // 3. Cavalry should not exceed infantry + archers combined (unbalanced)
  if (formation.Cav > formation.Inf + formation.Arch) return false;

  // 4. Extreme imbalances penalty (but not complete ban)
  const ratios = [formation.Inf, formation.Cav, formation.Arch].sort((a, b) => b - a);
  const imbalanceRatio = ratios[0] / (ratios[1] + ratios[2]);
  if (imbalanceRatio > 2.5) return false; // Max 2.5:1 ratio between strongest and others combined

  return true;
}

// Enhanced Formation Generation with Constraints
function generateConstrainedFormation(baseFormation = null, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let formation;

    if (baseFormation) {
      // Generate variation around base
      const variationRange = 0.15;
      formation = {
        Inf: Math.max(0.15, Math.min(0.60, baseFormation.Inf + (Math.random() - 0.5) * variationRange)),
        Cav: Math.max(0.10, Math.min(0.55, baseFormation.Cav + (Math.random() - 0.5) * variationRange)),
        Arch: Math.max(0.15, Math.min(0.60, baseFormation.Arch + (Math.random() - 0.5) * variationRange)),
      };
    } else {
      // Generate completely random formation
      formation = generateRandomFormation();
    }

    // Renormalize to ensure sum = 1.0
    const total = formation.Inf + formation.Cav + formation.Arch;
    formation.Inf /= total;
    formation.Cav /= total;
    formation.Arch /= total;

    // Validate constraints
    if (validateFormationConstraints(formation)) {
      return roundFormationTo5Percent(formation);
    }
  }

  // Fallback to a safe default formation
  return roundFormationTo5Percent({ Inf: 0.33, Cav: 0.33, Arch: 0.34 });
}

// Enhanced Genetic Algorithm with Constraint Validation
function geneticFormationOptimizationWithConstraints(
  enemyForm,
  youAtkLeth,
  youDefHp,
  youTroops,
  enemyAtkLeth,
  enemyDefHp,
  enemyTroops,
  alpha = 0.7,
  beta = 0.3,
  populationSize = 50,
  generations = 20,
  mutationRate = 0.1
) {
  // Initialize population with valid formations
  let population = [];
  for (let i = 0; i < populationSize; i++) {
    population.push(generateConstrainedFormation());
  }

  // Enhanced fitness function with constraint penalties
  const fitness = (formation) => {
    // Base fitness from combat simulation
    const result = runMatch(
      formation, youAtkLeth, youDefHp, youTroops,
      enemyForm, enemyAtkLeth, enemyDefHp, enemyTroops,
      alpha, beta
    );

    // Multi-objective fitness
    const efficiency = calculateFormationEfficiency(formation);
    let baseFitness = result.ratio * 0.5 + (result.winPercentage / 100) * 0.3 + efficiency * 0.2;

    // Constraint satisfaction bonus
    const constraintScore = validateFormationConstraints(formation) ? 1.0 : 0.5;
    baseFitness *= constraintScore;

    return baseFitness;
  };

  // Evolution loop with constraint validation
  for (let gen = 0; gen < generations; gen++) {
    // Evaluate fitness
    const fitnessScores = population.map(fitness);

    // Selection (tournament selection)
    const selected = [];
    for (let i = 0; i < populationSize; i++) {
      const tournament = [];
      for (let j = 0; j < 3; j++) {
        const randomIndex = Math.floor(Math.random() * populationSize);
        tournament.push({ formation: population[randomIndex], fitness: fitnessScores[randomIndex] });
      }
      tournament.sort((a, b) => b.fitness - a.fitness);
      selected.push(tournament[0].formation);
    }

    // Crossover and mutation with constraint validation
    const newPopulation = [];
    for (let i = 0; i < populationSize; i += 2) {
      const parent1 = selected[i];
      const parent2 = selected[i + 1] || selected[0];

      // Crossover (blend crossover)
      let child1 = {
        Inf: (parent1.Inf + parent2.Inf) / 2 + (Math.random() - 0.5) * 0.1,
        Cav: (parent1.Cav + parent2.Cav) / 2 + (Math.random() - 0.5) * 0.1,
        Arch: (parent1.Arch + parent2.Arch) / 2 + (Math.random() - 0.5) * 0.1,
      };

      let child2 = {
        Inf: (parent1.Inf + parent2.Inf) / 2 + (Math.random() - 0.5) * 0.1,
        Cav: (parent1.Cav + parent2.Cav) / 2 + (Math.random() - 0.5) * 0.1,
        Arch: (parent1.Arch + parent2.Arch) / 2 + (Math.random() - 0.5) * 0.1,
      };

      // Validate and repair children
      [child1, child2].forEach(child => {
        // Renormalize
        const total = child.Inf + child.Cav + child.Arch;
        child.Inf /= total;
        child.Cav /= total;
        child.Arch /= total;

        // Mutation
        if (Math.random() < mutationRate) {
          const mutateType = Math.floor(Math.random() * 3);
          const mutation = (Math.random() - 0.5) * 0.1;
          if (mutateType === 0) child.Inf = Math.max(0.15, Math.min(0.60, child.Inf + mutation));
          else if (mutateType === 1) child.Cav = Math.max(0.10, Math.min(0.55, child.Cav + mutation));
          else child.Arch = Math.max(0.15, Math.min(0.60, child.Arch + mutation));

          // Renormalize after mutation
          const newTotal = child.Inf + child.Cav + child.Arch;
          child.Inf /= newTotal;
          child.Cav /= newTotal;
          child.Arch /= newTotal;
        }

        // Ensure constraints are satisfied
        if (!validateFormationConstraints(child)) {
          // Repair by generating a new constrained formation
          Object.assign(child, generateConstrainedFormation(child));
        }
      });

      newPopulation.push(child1, child2);
    }

    population = newPopulation.slice(0, populationSize);
  }

  // Return the best validated formations
  const finalFitness = population.map(f => ({ formation: f, fitness: fitness(f) }));
  finalFitness.sort((a, b) => b.fitness - a.fitness);

  return finalFitness.slice(0, 5).map(item => {
    const roundedFormation = roundFormationTo5Percent(item.formation);
    const result = runMatch(
      roundedFormation, youAtkLeth, youDefHp, youTroops,
      enemyForm, enemyAtkLeth, enemyDefHp, enemyTroops,
      alpha, beta
    );
    return result;
  });
}

// Helper: Generate random valid formation
function generateRandomFormation() {
  let inf = Math.random() * 0.45 + 0.15; // 15-60%
  let cav = Math.random() * 0.45 + 0.10; // 10-55%
  let arch = Math.random() * 0.45 + 0.15; // 15-60%

  // Normalize to sum to 1
  const total = inf + cav + arch;
  return roundFormationTo5Percent({
    Inf: inf / total,
    Cav: cav / total,
    Arch: arch / total
  });
}

// Helper: Calculate formation efficiency score
function calculateFormationEfficiency(formation) {
  // Reward formations that balance offense, defense, and synergy
  const synergy = calculateFormationSynergy(formation);

  // Efficiency based on role distribution
  let efficiency = 0;

  // Archers should be primary damage (ideal: 35-55%)
  if (formation.Arch >= 0.35 && formation.Arch <= 0.55) efficiency += 0.3;
  else if (formation.Arch >= 0.25 && formation.Arch <= 0.65) efficiency += 0.2;

  // Infantry should provide defense (ideal: 25-45%)
  if (formation.Inf >= 0.25 && formation.Inf <= 0.45) efficiency += 0.3;
  else if (formation.Inf >= 0.15 && formation.Inf <= 0.55) efficiency += 0.2;

  // Cavalry for flanking (ideal: 15-35%)
  if (formation.Cav >= 0.15 && formation.Cav <= 0.35) efficiency += 0.3;
  else if (formation.Cav >= 0.10 && formation.Cav <= 0.45) efficiency += 0.2;

  // Penalize extreme imbalances
  const maxRatio = Math.max(formation.Inf, formation.Cav, formation.Arch);
  const minRatio = Math.min(formation.Inf, formation.Cav, formation.Arch);
  if (maxRatio > minRatio * 3) efficiency *= 0.8; // Penalty for extreme specialization

  return efficiency * synergy;
}

// 🔟 Default Stats
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

export const DEFAULT_YOU_TROOPS = 135000;
export const DEFAULT_ENEMY_TROOPS = 135000;

export const DEFAULT_ENEMY_FORMATION = {
  Inf: 0.30,
  Cav: 0.20,
  Arch: 0.50,
};

export const DEFAULT_YOU_FORMATION = {
  Inf: 0.30,
  Cav: 0.20,
  Arch: 0.50,
};

// 🔟 Advanced Enemy Formation Modeling for Blind PVP
function generateProbabilisticEnemyFormations(numScenarios = 10) {
  const formations = [];

  // Common meta formations with probabilities
  const metaFormations = [
    { formation: { Inf: 0.50, Cav: 0.20, Arch: 0.30 }, weight: 0.25, label: "Standard Meta (5:2:3)" },
    { formation: { Inf: 0.30, Cav: 0.20, Arch: 0.50 }, weight: 0.20, label: "Classic Meta (3:2:5)" },
    { formation: { Inf: 0.40, Cav: 0.30, Arch: 0.30 }, weight: 0.15, label: "Balanced Tank" },
    { formation: { Inf: 0.25, Cav: 0.35, Arch: 0.40 }, weight: 0.12, label: "Flanking Focus" },
    { formation: { Inf: 0.35, Cav: 0.25, Arch: 0.40 }, weight: 0.10, label: "Defensive Archer" },
    { formation: { Inf: 0.45, Cav: 0.20, Arch: 0.35 }, weight: 0.08, label: "Heavy Infantry" },
    { formation: { Inf: 0.30, Cav: 0.40, Arch: 0.30 }, weight: 0.06, label: "Cavalry Rush" },
    { formation: { Inf: 0.25, Cav: 0.25, Arch: 0.50 }, weight: 0.04, label: "Archer Spam" },
  ];

  // Generate scenarios based on weighted probabilities
  for (let i = 0; i < numScenarios; i++) {
    let random = Math.random();
    let selectedMeta = null;

    for (const meta of metaFormations) {
      random -= meta.weight;
      if (random <= 0) {
        selectedMeta = meta;
        break;
      }
    }

    if (!selectedMeta) selectedMeta = metaFormations[0]; // Fallback

    // Add realistic variation (±5-10% random variation)
    const variation = 0.08; // ±8% variation
    const variedFormation = {
      Inf: Math.max(0.15, Math.min(0.60, selectedMeta.formation.Inf + (Math.random() - 0.5) * variation)),
      Cav: Math.max(0.10, Math.min(0.55, selectedMeta.formation.Cav + (Math.random() - 0.5) * variation)),
      Arch: Math.max(0.15, Math.min(0.60, selectedMeta.formation.Arch + (Math.random() - 0.5) * variation)),
    };

    // Renormalize
    const total = variedFormation.Inf + variedFormation.Cav + variedFormation.Arch;
    variedFormation.Inf /= total;
    variedFormation.Cav /= total;
    variedFormation.Arch /= total;

    formations.push({
      formation: variedFormation,
      label: `${selectedMeta.label} Variant`,
      probability: selectedMeta.weight
    });
  }

  return formations;
}

// Enhanced Blind PVP with Probabilistic Enemy Modeling
function getAdvancedBlindPVPRecommendations(yourStats, youAtkLeth, youDefHp, youTroops, alpha, beta) {
  const playstyle = detectAdvancedPlaystyle(yourStats);

  // Generate diverse enemy scenarios
  const enemyScenarios = generateProbabilisticEnemyFormations(8);

  // Test formations against each scenario
  const testFormations = generateOptimalFormationsForPlaystyle(playstyle, 12);

  const results = [];

  for (const enemyScenario of enemyScenarios) {
    for (const formation of testFormations) {
      const result = runMatch(
        formation,
        youAtkLeth,
        youDefHp,
        youTroops,
        enemyScenario.formation,
        // Use average enemy stats (could be enhanced with stat distributions)
        { Inf: { ATK: 500, LETH: 400 }, Cav: { ATK: 500, LETH: 400 }, Arch: { ATK: 500, LETH: 400 } },
        { Inf: { DEF: 500, HP: 400 }, Cav: { DEF: 500, HP: 400 }, Arch: { DEF: 500, HP: 400 } },
        youTroops,
        alpha,
        beta
      );

      results.push({
        formation: formation,
        enemyFormation: enemyScenario.formation,
        enemyLabel: enemyScenario.label,
        result: result,
        scenarioWeight: enemyScenario.probability
      });
    }
  }

  // Group by formation and calculate weighted average performance
  const formationPerformance = {};
  results.forEach(item => {
    const key = `${Math.round(item.formation.Inf * 100)}-${Math.round(item.formation.Cav * 100)}-${Math.round(item.formation.Arch * 100)}`;
    if (!formationPerformance[key]) {
      formationPerformance[key] = {
        formation: item.formation,
        totalScore: 0,
        totalWeight: 0,
        scenarios: [],
        bestResult: null,
        worstResult: null
      };
    }

    const weightedScore = item.result.ratio * item.scenarioWeight;
    formationPerformance[key].totalScore += weightedScore;
    formationPerformance[key].totalWeight += item.scenarioWeight;
    formationPerformance[key].scenarios.push({
      enemyLabel: item.enemyLabel,
      ratio: item.result.ratio,
      winPercentage: item.result.winPercentage
    });

    // Track best and worst case
    if (!formationPerformance[key].bestResult || item.result.ratio > formationPerformance[key].bestResult.ratio) {
      formationPerformance[key].bestResult = item.result;
    }
    if (!formationPerformance[key].worstResult || item.result.ratio < formationPerformance[key].worstResult.ratio) {
      formationPerformance[key].worstResult = item.result;
    }
  });

  // Convert to array and sort by average performance
  const rankedFormations = Object.values(formationPerformance)
    .map(fp => ({
      formation: fp.formation,
      averageRatio: fp.totalScore / fp.totalWeight,
      bestCase: fp.bestResult,
      worstCase: fp.worstResult,
      scenarios: fp.scenarios,
      consistency: fp.bestResult.ratio - fp.worstResult.ratio // Lower is more consistent
    }))
    .sort((a, b) => b.averageRatio - a.averageRatio)
    .slice(0, 5);

  // Format for display
  return rankedFormations.map(item => ({
    formation: roundFormationTo5Percent(item.formation),
    scenario: `🎯 ${playstyle.charAt(0).toUpperCase() + playstyle.slice(1)}: Advanced Blind PVP`,
    description: `Optimized for ${playstyle} playstyle - Avg Ratio: ${(item.averageRatio * 100).toFixed(1)}%`,
    enemyFormation: { Inf: 0.33, Cav: 0.33, Arch: 0.34 }, // Representative formation
    ratio: item.averageRatio,
    winPercentage: (item.bestCase.winPercentage + item.worstCase.winPercentage) / 2,
    yourDamage: item.bestCase.yourDamage,
    yourBreakdown: item.bestCase.yourBreakdown,
    enemyDamage: item.bestCase.enemyDamage,
    enemyBreakdown: item.bestCase.enemyBreakdown,
    consistency: item.consistency,
    scenarios: item.scenarios
  }));
}
