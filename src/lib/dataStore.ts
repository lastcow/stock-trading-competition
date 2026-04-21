import type {
  Market,
  Category,
  Participant,
  CapitalRecord,
  Ranking,
  CompetitionConfig,
  MonthlyRankingItem,
} from '@/types';

const STORAGE_KEYS = {
  participants: 'trading_competition_participants',
  capitalRecords: 'trading_competition_capital_records',
  competitionConfig: 'trading_competition_config',
};

// Default competition config
export const DEFAULT_CONFIG: CompetitionConfig = {
  name: '巅峰杯模拟股票交易大赛',
  startDate: '2026-04-01',
  endDate: '2026-09-30',
  initialCapital: {
    A_SHARES: 1000000,
    US_STOCKS: 100000,
  },
  markets: ['A_SHARES', 'US_STOCKS'],
  categories: ['PERSONAL', 'TEAM'],
  months: [4, 5, 6, 7, 8, 9],
};

// ---- Participants ----

export function getParticipants(): Participant[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.participants);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getParticipantsByMarketCategory(
  market: Market,
  category: Category
): Participant[] {
  return getParticipants().filter(
    (p) => p.market === market && p.type === category
  );
}

export function saveParticipant(participant: Participant): void {
  const participants = getParticipants();
  const existingIndex = participants.findIndex((p) => p.id === participant.id);
  if (existingIndex >= 0) {
    participants[existingIndex] = participant;
  } else {
    participants.push(participant);
  }
  localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(participants));
}

export function deleteParticipant(id: string): void {
  const participants = getParticipants().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(participants));
}

// ---- Capital Records ----

export function getCapitalRecords(): CapitalRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.capitalRecords);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getCapitalRecordsByParticipant(participantId: string): CapitalRecord[] {
  return getCapitalRecords()
    .filter((r) => r.participantId === participantId)
    .sort((a, b) => a.month - b.month);
}

export function getCapitalRecordsByMarketCategory(
  market: Market,
  category: Category
): CapitalRecord[] {
  const participants = getParticipantsByMarketCategory(market, category);
  const participantIds = new Set(participants.map((p) => p.id));
  return getCapitalRecords()
    .filter((r) => participantIds.has(r.participantId))
    .sort((a, b) => a.month - b.month);
}

export function saveCapitalRecord(record: CapitalRecord): void {
  const records = getCapitalRecords();
  const existingIndex = records.findIndex(
    (r) => r.participantId === record.participantId && r.month === record.month
  );
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(STORAGE_KEYS.capitalRecords, JSON.stringify(records));
}

export function deleteCapitalRecord(id: string): void {
  const records = getCapitalRecords().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.capitalRecords, JSON.stringify(records));
}

// ---- Competition Config ----

export function getCompetitionConfig(): CompetitionConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.competitionConfig);
    return data ? { ...DEFAULT_CONFIG, ...JSON.parse(data) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveCompetitionConfig(config: Partial<CompetitionConfig>): void {
  const current = getCompetitionConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_KEYS.competitionConfig, JSON.stringify(updated));
}

// ---- Rankings ----

export function calculateRankings(
  market: Market,
  category: Category,
  month: number
): MonthlyRankingItem[] {
  const config = getCompetitionConfig();
  const participants = getParticipantsByMarketCategory(market, category);
  const allRecords = getCapitalRecordsByMarketCategory(market, category);
  const initialCapital = config.initialCapital[market];

  const items: MonthlyRankingItem[] = participants.map((p) => {
    const participantRecords = allRecords
      .filter((r) => r.participantId === p.id && r.month <= month)
      .sort((a, b) => a.month - b.month);

    const currentRecord = participantRecords.find((r) => r.month === month);
    const currentCapital = currentRecord?.capital ?? initialCapital;
    const previousCapital =
      participantRecords.length > 1
        ? participantRecords[participantRecords.length - 2]?.capital ?? initialCapital
        : initialCapital;

    const change = currentCapital - previousCapital;
    const changePercent = previousCapital > 0 ? (change / previousCapital) * 100 : 0;
    const totalReturn =
      initialCapital > 0
        ? ((currentCapital - initialCapital) / initialCapital) * 100
        : 0;

    return {
      participantId: p.id,
      participantName: p.name,
      rank: 0,
      initialCapital,
      currentCapital,
      change,
      changePercent,
      totalReturn,
    };
  });

  // Sort by total return descending and assign ranks
  items.sort((a, b) => b.totalReturn - a.totalReturn);
  items.forEach((item, index) => {
    item.rank = index + 1;
  });

  return items;
}

export function calculateOverallRankings(
  market: Market,
  category: Category
): Ranking[] {
  const config = getCompetitionConfig();
  const participants = getParticipantsByMarketCategory(market, category);
  const allRecords = getCapitalRecordsByMarketCategory(market, category);
  const initialCapital = config.initialCapital[market];
  const months = config.months;

  const rankings: Ranking[] = participants.map((p) => {
    const participantRecords = allRecords
      .filter((r) => r.participantId === p.id)
      .sort((a, b) => a.month - b.month);

    const finalCapital =
      participantRecords.length > 0
        ? participantRecords[participantRecords.length - 1].capital
        : initialCapital;

    const totalReturn =
      initialCapital > 0
        ? ((finalCapital - initialCapital) / initialCapital) * 100
        : 0;

    // Calculate monthly ranks
    const monthlyRanks: number[] = [];
    months.forEach((month) => {
      const monthRecords = allRecords
        .filter((r) => r.month === month)
        .sort((a, b) => b.changePercent - a.changePercent);
      const monthRank =
        monthRecords.findIndex((r) => r.participantId === p.id) + 1;
      monthlyRanks.push(monthRank || 0);
    });

    // Best and worst months based on change
    let bestMonth = 0;
    let worstMonth = 0;
    let bestChange = -Infinity;
    let worstChange = Infinity;

    participantRecords.forEach((record) => {
      if (record.changePercent > bestChange) {
        bestChange = record.changePercent;
        bestMonth = record.month;
      }
      if (record.changePercent < worstChange) {
        worstChange = record.changePercent;
        worstMonth = record.month;
      }
    });

    return {
      participantId: p.id,
      participantName: p.name,
      totalReturn,
      finalCapital,
      rank: 0,
      monthlyRanks,
      bestMonth,
      worstMonth,
    };
  });

  // Sort by total return descending and assign ranks
  rankings.sort((a, b) => b.totalReturn - a.totalReturn);
  rankings.forEach((r, index) => {
    r.rank = index + 1;
  });

  return rankings;
}

// ---- Demo Data ----

export function getDemoData(): {
  participants: Participant[];
  capitalRecords: CapitalRecord[];
} {
  const participants: Participant[] = [];
  const capitalRecords: CapitalRecord[] = [];

  // Demo names for each market/category
  const aSharesPersonalNames = [
    '张伟', '李娜', '王强', '刘洋', '陈静', '杨超', '赵敏', '黄磊', '周婷', '吴刚',
  ];
  const aSharesTeamNames = [
    '龙腾战队', '凤凰投资组', '金牛小队', '战狼团队', '祥云资本',
  ];
  const usPersonalNames = [
    'Tom Chen', 'Lisa Wang', 'David Liu', 'Amy Zhang', 'James Li',
    'Sarah Wu', 'Michael Huang', 'Emily Zhao', 'Robert Yang', 'Jessica Lin',
  ];
  const usTeamNames = [
    'WallStreet Wolves', 'Tech Traders', 'Alpha Squad', 'Bull Runners',
  ];

  const months = [4, 5, 6, 7, 8, 9];

  // Helper to generate consistent random returns
  function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function generateParticipantRecords(
    participant: Participant,
    initialCapital: number,
    seed: number
  ): CapitalRecord[] {
    const rng = seededRandom(seed);
    const records: CapitalRecord[] = [];
    let currentCapital = initialCapital;

    months.forEach((month, idx) => {
      // Realistic monthly return between -15% and +25%
      const changePercent = -15 + rng() * 40;
      const changeAmount = (currentCapital * changePercent) / 100;
      const newCapital = Math.round(currentCapital + changeAmount);

      records.push({
        id: `${participant.id}_m${month}`,
        participantId: participant.id,
        month,
        capital: newCapital,
        change: newCapital - (idx === 0 ? initialCapital : currentCapital),
        changePercent: parseFloat(changePercent.toFixed(2)),
        inputBy: 'admin',
        inputAt: new Date(2026, month - 1, 28).toISOString(),
      });

      currentCapital = newCapital;
    });

    return records;
  }

  // Generate participants and records for A_SHARES PERSONAL
  aSharesPersonalNames.forEach((name, idx) => {
    const p: Participant = {
      id: `asp_${idx + 1}`,
      name,
      type: 'PERSONAL',
      market: 'A_SHARES',
    };
    participants.push(p);
    capitalRecords.push(
      ...generateParticipantRecords(p, DEFAULT_CONFIG.initialCapital.A_SHARES, 1000 + idx * 137)
    );
  });

  // Generate participants and records for A_SHARES TEAM
  aSharesTeamNames.forEach((name, idx) => {
    const p: Participant = {
      id: `ast_${idx + 1}`,
      name,
      type: 'TEAM',
      market: 'A_SHARES',
    };
    participants.push(p);
    capitalRecords.push(
      ...generateParticipantRecords(p, DEFAULT_CONFIG.initialCapital.A_SHARES, 5000 + idx * 251)
    );
  });

  // Generate participants and records for US_STOCKS PERSONAL
  usPersonalNames.forEach((name, idx) => {
    const p: Participant = {
      id: `usp_${idx + 1}`,
      name,
      type: 'PERSONAL',
      market: 'US_STOCKS',
    };
    participants.push(p);
    capitalRecords.push(
      ...generateParticipantRecords(p, DEFAULT_CONFIG.initialCapital.US_STOCKS, 9000 + idx * 173)
    );
  });

  // Generate participants and records for US_STOCKS TEAM
  usTeamNames.forEach((name, idx) => {
    const p: Participant = {
      id: `ust_${idx + 1}`,
      name,
      type: 'TEAM',
      market: 'US_STOCKS',
    };
    participants.push(p);
    capitalRecords.push(
      ...generateParticipantRecords(p, DEFAULT_CONFIG.initialCapital.US_STOCKS, 12000 + idx * 331)
    );
  });

  return { participants, capitalRecords };
}

export function initializeDemoData(): void {
  const existingParticipants = getParticipants();
  if (existingParticipants.length === 0) {
    const { participants, capitalRecords } = getDemoData();
    localStorage.setItem(
      STORAGE_KEYS.participants,
      JSON.stringify(participants)
    );
    localStorage.setItem(
      STORAGE_KEYS.capitalRecords,
      JSON.stringify(capitalRecords)
    );
    localStorage.setItem(
      STORAGE_KEYS.competitionConfig,
      JSON.stringify(DEFAULT_CONFIG)
    );
  }
}

export function resetAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.participants);
  localStorage.removeItem(STORAGE_KEYS.capitalRecords);
  localStorage.removeItem(STORAGE_KEYS.competitionConfig);
}
