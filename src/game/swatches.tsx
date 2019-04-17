export const volcano: SwatchTemplate = {
    id: "volcano",
    fill: [
        {
            color: "rgba(255, 0, 128, 0.9)",
            flash: 1,
        },
    ],
    smoke: [{
        color: "rgba(255, 0, 128, 1)",
        fade: "rgba(0, 0, 0, 0)",
        ticks: 30,
        interval: 1,
        speed: 0.1,
    }],

    hitInterval: 15,
    damage: 5,
}

export const Swatches: SwatchTemplates = {
    volcano,
};