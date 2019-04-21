export const Layouts: Layouts = {
    "cold": {
        "numPoints": 6,
        "obstacles": [
            {
                "numObstacles": 3,
                "layoutRadius": 0.0725,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 6,
                "extent": 0.0125,
                "orientationAngleOffsetInRevs": 0
            },
            {
                "numObstacles": 6,
                "layoutRadius": 0.34,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 6,
                "extent": 0.015,
                "orientationAngleOffsetInRevs": 0
            }
        ],
        "swatches": [
            {
                "type": "slow",
                "minRadius": 0.3375,
                "maxRadius": 0.3425,
                "numSwatches": 6,
                "angularOffsetInRevs": 0.0833333333333,
                "angularWidthInRevs": 0.12
            },
            {
                "type": "slow",
                "minRadius": 0.07,
                "maxRadius": 0.075,
                "numSwatches": 3,
                "angularOffsetInRevs": 0.1666666666667,
                "angularWidthInRevs": 0.2
            }
        ]
    },
    "double": {
        "numPoints": 4,
        "obstacles": [
            {
                "numObstacles": 2,
                "layoutRadius": 0.07,
                "layoutAngleOffsetInRevs": 0.125,
                "numPoints": 4,
                "extent": 0.017,
                "orientationAngleOffsetInRevs": 0.125
            },
            {
                "numObstacles": 4,
                "layoutRadius": 0.33,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 4,
                "extent": 0.007,
                "orientationAngleOffsetInRevs": 0,
            }
        ],
    },
    "ring": {
        "obstacles": [
            {
                "numObstacles": 1,
                "layoutRadius": 0,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 6,
                "extent": 0.015,
                "orientationAngleOffsetInRevs": 0.5
            },
            {
                "numObstacles": 4,
                "layoutRadius": 0.32,
                "layoutAngleOffsetInRevs": 0.08333333333,
                "numPoints": 4,
                "extent": 0.01,
                "orientationAngleOffsetInRevs": 0
            }
        ],
        "angleOffsetInRevs": 0.08333333333,
        "numPoints": 4,
        "swatches": [
            {
                "type": "fast",
                "minRadius": 0.13,
                "maxRadius": 0.135,
                "numSwatches": 10,
                "angularOffsetInRevs": 0,
                "angularWidthInRevs": 0.1
            }
        ]
    },
    "snowflake": {
        "numPoints": 6,
        "angleOffsetInRevs": 0.08333333333,
        "obstacles": [
            {
                "numObstacles": 4,
                "layoutRadius": 0.12,
                "layoutAngleOffsetInRevs": 0.125,
                "numPoints": 4,
                "extent": 0.017,
                "orientationAngleOffsetInRevs": 0
            },
            {
                "numObstacles": 6,
                "layoutRadius": 0.35,
                "layoutAngleOffsetInRevs": 0.08333333333,
                "numPoints": 4,
                "extent": 0.0075,
                "orientationAngleOffsetInRevs": 0
            }
        ]
    },
    "inside5": {
        "numPoints": 5,
        "obstacles": [
            {
                "numObstacles": 5,
                "layoutRadius": 0.15,
                "layoutAngleOffsetInRevs": 0.1,
                "numPoints": 3,
                "extent": 0.015,
                "orientationAngleOffsetInRevs": 0.5
            },
        ],
        "swatches": [
            {
                "type": "volcano",
                "minRadius": 0,
                "maxRadius": 0.025,
                "numSwatches": 5,
                "angularWidthInRevs": 0.2,
                "angularOffsetInRevs": 0
            }
        ]
    },
    "single": {
        "numPoints": 3,
        "obstacles": [
            {
                "numObstacles": 1,
                "layoutRadius": 0,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 3,
                "extent": 0.017,
                "orientationAngleOffsetInRevs": 0
            }
        ]
    },
    "pepper": {
        "obstacles": [
            {
                "numObstacles": 5,
                "layoutRadius": 0.32,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 3,
                "extent": 0.017,
                "orientationAngleOffsetInRevs": 0.1666667
            },
            {
                "numObstacles": 5,
                "layoutRadius": 0.15,
                "layoutAngleOffsetInRevs": 0.1,
                "numPoints": 4,
                "extent": 0.01,
                "orientationAngleOffsetInRevs": 0.125
            }
        ],
        "numPoints": 5
    },
    "innerStar": {
        "obstacles": [
            {
                "numObstacles": 10,
                "layoutRadius": 0.12,
                "layoutAngleOffsetInRevs": 0.1,
                "numPoints": 4,
                "extent": 0.005,
                "orientationAngleOffsetInRevs": 0.5,
                "health": 10,
                detonate: true,
            },
            {
                "numObstacles": 5,
                "layoutRadius": 0.32,
                "layoutAngleOffsetInRevs": 0.1,
                "numPoints": 4,
                "extent": 0.02,
                "orientationAngleOffsetInRevs": 0.5
            }
        ],
        "numPoints": 5,
        "angleOffsetInRevs": 0.1,
        swatches: [
            {
                type: "volcano",
                minRadius: 0.318,
                maxRadius: 0.322,
                numSwatches: 5,
                angularOffsetInRevs: 0,
                angularWidthInRevs: 0.15,
            },
        ],
    },
    "triplet": {
        obstacles: [
            {
                numObstacles: 3,
                layoutRadius: 0.28,
                layoutAngleOffsetInRevs: 0.5,
                numPoints: 3,
                extent: 0.015 * 1.5,
                orientationAngleOffsetInRevs: 0.5,
            },
        ],
        "numPoints": 3,
        "angleOffsetInRevs": 0.16666667,
    },
    "surrounded": {
        "obstacles": [
            {
                "numObstacles": 15,
                "layoutRadius": 0.35,
                "layoutAngleOffsetInRevs": 0.1,
                "numPoints": 3,
                "extent": 0.015,
                "orientationAngleOffsetInRevs": 0.5
            },
            {
                "numObstacles": 6,
                "layoutRadius": 0.15,
                "layoutAngleOffsetInRevs": 0.2666667,
                "numPoints": 4,
                "extent": 0.005,
                "orientationAngleOffsetInRevs": 0.5
            },
            {
                "numObstacles": 1,
                "layoutRadius": 0,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 4,
                "extent": 0.01,
                "orientationAngleOffsetInRevs": 0.5
            }
        ]
    },
    "tripletSwirl": {
        "numPoints": 6,
        "obstacles": [
            {
                "numObstacles": 3,
                "layoutRadius": 0.06,
                "layoutAngleOffsetInRevs": 0.32,
                "numPoints": 3,
                "extent": 0.00375,
                "orientationAngleOffsetInRevs": 0.125
            },
            {
                "numObstacles": 3,
                "layoutRadius": 0.14,
                "layoutAngleOffsetInRevs": 0.28,
                "numPoints": 3,
                "extent": 0.0075,
                "orientationAngleOffsetInRevs": 0.125,
                "health": 20
            },
            {
                "numObstacles": 3,
                "layoutRadius": 0.22,
                "layoutAngleOffsetInRevs": 0.23,
                "numPoints": 3,
                "extent": 0.01125,
                "orientationAngleOffsetInRevs": 0.125,
                "health": 20
            },
            {
                "numObstacles": 3,
                "layoutRadius": 0.3,
                "layoutAngleOffsetInRevs": 0.18,
                "numPoints": 6,
                "extent": 0.025,
                "orientationAngleOffsetInRevs": 0.125
            }
        ]
    },
}