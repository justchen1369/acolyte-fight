export const TicksPerSecond = 60;
export const TicksPerTurn = 2;
export const MaxIdleTicks = 30 * TicksPerSecond;
export const MaxCooldownWait = 0;
export const Pixel = 0.001;

export namespace Categories {
	export const All = 0xFFFF;
	export const Hero = 0x1;
	export const Projectile = 0x2;
	export const Massive = 0x4;
	export const Obstacle = 0x8;
	export const Shield = 0x10;
	export const Solid = 0x20;
	export const None = 0;
}

export namespace Matchmaking {
	export const JoinPeriod = 3 * TicksPerSecond;
	export const MaxHistoryLength = 15 * 60 * TicksPerSecond;
	export const MaxPlayers = 5;
	export const BotName = "AcolyteBot";
}

export namespace HeroColors {
	export const MyHeroColor = '#00ccff';
	export const BotColor = '#cccccc';
	export const InactiveColor = '#666666';
	export const HealColor = '#22ee88';
	export const Colors = [
		"#6d89cc",
		"#cb8fc1",
		"#7db37d",
		"#56b5bf",
		"#917ccc",
		"#cc7c88",
	];
	export const HitGlowFactor = 0.3;
	export const HitFlashTicks = 3;
};

export namespace HealthBar {
	export const HeroRadiusFraction = 0.9;
	export const Height = Pixel * 3;
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
	export const Spacing = 8;
	export const Margin = 5;
	export const Size = 64;
	export const SecondaryButtonSize = 48;
	export const Gap = 12;
}