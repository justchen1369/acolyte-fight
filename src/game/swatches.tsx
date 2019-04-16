export const volcano: SwatchTemplate = {
    id: "volcano",
    fill: [
        {
            color: "rgba(255, 224, 0, 1)",
            flash: 1,
        },
    ],
    smoke: [{
        color: "rgba(255, 224, 0, 0.9)",
        fade: "rgba(0, 0, 0, 0)",
        ticks: 30,
        interval: 1,
        speed: 0.05,
        particleRadius: 0.003,
    }],

    hitInterval: 15,
    buffs: [
        {
            type: "burn",
            hitInterval: 15,
            stack: "burn",
            packet: { damage: 1 },
            maxTicks: 15,
            render: {
                color: "#ffffff",
                alpha: 0.05,
                ticks: 15,
                emissionRadiusFactor: 1,
                particleRadius: 0.005,
            },
        },
    ],
}

export const Swatches: SwatchTemplates = {
    volcano,
};