export const TicksPerSecond = 60;
export const TicksPerTurn = 2;
export const MaxIdleTicks = 30 * TicksPerSecond;
export const SnapshotTicks = 10;
export const ObstacleSnapshotTicks = 30;
export const MaxCooldownWait = 0;
export const MaxTextMessageLength = 240;
export const MaxGamesToKeep = 50;
export const Pixel = 0.001;

export namespace Categories {
	export const All = 0xFFFF;
	export const Hero = 0x1;
	export const Projectile = 0x2;
	export const Massive = 0x4;
	export const Obstacle = 0x8;
	export const Shield = 0x10;
	export const Blocker = 0x20;
	export const Crater = 0x40;
	export const None = 0;
}

export namespace Alliances {
	export const All = 0xFFFF;
	export const None = 0;

	export const Self = 0x01;
	export const Ally = 0x02;
	export const Enemy = 0x04;
	export const Neutral = 0x08;

	export const Friendly = Self | Ally;
	export const NotFriendly = Enemy | Neutral;
}

export namespace Matchmaking {
	export const MaxHistoryLength = 15 * 60 * TicksPerSecond;
	export const WaitForMorePeriod = 10 * TicksPerSecond;
	export const JoinPeriod = 3 * TicksPerSecond;
}

export namespace Placements {
	export const Rank1 = 1;
	export const MinGames = 10;
	export const VerificationGames = 5;

	export const InitialAco = 1000;
	export const ActivityBonusPerGame = 3;
	export const MaxActivityGames = 100;

	export const AcoDecayLengthDays = 21;

	export const AcoDeflatePerDay = 5;
	export const AcoDeflateIntervalHours = 24 / AcoDeflatePerDay;
	export const AcoMaxDeflate = 100;
	export const AcoInflatePerGame = 1;

	export const MaxLeaderboardLength = 100;
	export const LeaderboardCacheMinutes = 5;

	export const Grandmaster = 98;
	export const Master = 90;
	export const Diamond = 80;
	export const Platinum = 70;
	export const Gold = 60;
	export const Silver = 40;
	export const Bronze = 20;
	export const Wood = 0;
}

export namespace SpellFrequencies {
	export const MinGames = 100;
}

export namespace Atlas {
	export const Width = 1024;
	export const Height = 1024;
}