export const TicksPerSecond = 60;
export const TicksPerTurn = 2;
export const MaxIdleTicks = 30 * TicksPerSecond;
export const SnapshotTicks = 10;
export const ObstacleSnapshotTicks = 30;
export const MaxCooldownWait = 0;
export const MaxTextMessageLength = 64;
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
	export const WaitForMorePeriod = 10 * TicksPerSecond;
	export const JoinPeriod = 3 * TicksPerSecond;
	export const MaxHistoryLength = 15 * 60 * TicksPerSecond;
	export const MaxPlayers = 7;
	export const TargetGameSize = 3;
	export const BotName = "AcolyteBot";
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

	export const Grandmaster = 98;
	export const Master = 90;
	export const Diamond = 80;
	export const Platinum = 70;
	export const Gold = 60;
	export const Silver = 40;
	export const Bronze = 20;
	export const Wood = 0;
}

export namespace HeroColors {
	export const WorldColor = '#222';
	export const WorldAnimateWinTicks = 15;
	export const WorldWinGrowth = 0.05;
	export const GlowRadius = 4 * Pixel;

	export const ShakeDistance = 0.02;
	export const ShakeTicks = 3;
	export const ShakeGlowFactor = 0.01;

	export const MyHeroColor = '#00ccff';
	export const AllyColor = '#00a3cc';
	export const BotColor = '#cccccc';
	export const InactiveColor = '#666666';
	export const HealColor = '#22ee88';

	export const Colors = [
		"#cb8fc1",
		"#7db37d",
		"#917ccc",
		"#cc7c88",
		"#d0c16b",
		"#56b5bf",
		"#6d89cc",
		"#b9cc64",
		"#cea85c",
		"#54b7a2",
		"#a97fc1",
	];

	export const TeamColors = [
		"#cb8fc1",
		"#d0c16b",
		"#7db37d",
		"#cea85c",
		"#54b7a2",
		"#a97fc1",
	];

	export const LavaFlashInterval = 20;

	export const DamageGrowFactor = 0.25;
	export const DamageGlowFactor = 1.0;
	export const DamageFlashTicks = 10;

	export const ShieldGlowFactor = 1.0;
	export const ShieldGrowFactor = 0.05;
	export const ShieldFlashTicks = 3;

	export const ObstacleFlashTicks = 6;
	export const ObstacleGrowFactor = 0.25;

	export const RangeIndicatorWidth = Pixel * 2;
};

export namespace HealthBar {
	export const HeroRadiusFraction = 0.95;
	export const Height = Pixel * 2;
	export const Margin = Pixel * 2;
}
export namespace ChargingIndicator {
	export const Margin = Pixel * 5;
	export const Width = Pixel * 2;
}
export namespace DashIndicator {
	export const Color = "#44eeff";
	export const Height = Pixel * 2;
	export const Margin = Pixel * 0;
}
export namespace ButtonBar {
	export const MaxHeightProportion = 0.15;
	export const Spacing = 8;
	export const Margin = 5;
	export const Size = 72;
	export const Gap = 12;
}