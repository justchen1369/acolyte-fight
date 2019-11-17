export const Layouts: Layouts = {
    "circle": {
        "color": "#222835",
        "background": "#181b20",
        "obstacles": []
    },
    "cold": {
        "color": "#1d2e33",
        "background": "#121d20",
        "numPoints": 6,
        "obstacles": [
            {
                "type": "slow",
                "extent": 0.0025,
                "layoutRadius": 0.34,
                "numObstacles": 6,
                "layoutAngleOffsetInRevs": 0.0833333333333,
                "angularWidthInRevs": 0.12
            },
            {
                "type": "slow",
                "layoutRadius": 0.0725,
                "extent": 0.002,
                "numObstacles": 3,
                "layoutAngleOffsetInRevs": 0.1666666666667,
                "angularWidthInRevs": 0.2
            },
            {
                "numObstacles": 3,
                "layoutRadius": 0.0725,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 6,
                "extent": 0.01,
                "orientationAngleOffsetInRevs": 0
            },
            {
                "numObstacles": 3,
                "layoutRadius": 0.34,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 6,
                "extent": 0.015,
                "orientationAngleOffsetInRevs": 0
            }
        ]
    },
    "octogon": {
        "color": "#192c36",
        "background": "#121c21",
        "obstacles": [
            {
                "type": "slow",
                "numObstacles": 3,
                "layoutRadius": 0.075,
                "layoutAngleOffsetInRevs": 0.125,
                "numPoints": 4,
                "extent": 0.0025,
                "orientationAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.333333
            },
            {
                "numObstacles": 20,
                "layoutRadius": 0.25,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 4,
                "extent": 0.009,
                "orientationAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.015,
                "pattern": [
                    1,
                    1,
                    1,
                    0,
                    0
                ]
            }
        ],
        "numPoints": 8
    },
    "return": {
        "color": "#33272c",
        "background": "#211b1d",
        "obstacles": [
            {
                "type": "volcano",
                "numObstacles": 1,
                "layoutRadius": 0,
                "layoutAngleOffsetInRevs": 0.2,
                "numPoints": 3,
                "extent": 0.025,
                "orientationAngleOffsetInRevs": 0.5
            },
            {
                "type": "inward",
                "layoutRadius": 0.15,
                "extent": 0.1,
                "numObstacles": 3,
                "layoutAngleOffsetInRevs": 0.2,
                "angularWidthInRevs": 0.01,
                "health": 200
            },
            {
                "numObstacles": 3,
                "layoutRadius": 0.25,
                "layoutAngleOffsetInRevs": 0.36666666667,
                "numPoints": 4,
                "extent": 0.01,
                "orientationAngleOffsetInRevs": 0
            }
        ],
        "numPoints": 6,
        "angleOffsetInRevs": 0.2
    },
    "double": {
        "color": "#332e26",
        "background": "#1f1a18",
        "numPoints": 4,
        "obstacles": [
            {
                "type": "bumper",
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
                "extent": 0.009,
                "orientationAngleOffsetInRevs": 0
            }
        ]
    },
    "ring": {
        "color": "#232833",
        "background": "#161c21",
        "obstacles": [
            {
                "type": "fast",
                "layoutRadius": 0.1325,
                "extent": 0.0025,
                "numObstacles": 10,
                "layoutAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.1
            },
            {
                "type": "mirror",
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
        "numPoints": 4
    },
    "exit": {
        "color": "#1f2333",
        "background": "#151a20",
        "obstacles": [
            {
                "type": "outward",
                "layoutRadius": 0.075,
                "extent": 0.075,
                "numObstacles": 3,
                "layoutAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.16667,
                "health": 200
            },
            {
                "type": "fast",
                "layoutRadius": 0.23,
                "extent": 0.002,
                "numObstacles": 3,
                "layoutAngleOffsetInRevs": 0.16666667,
                "angularWidthInRevs": 0.15
            },
            {
                "pattern": [
                    1,
                    1,
                    1,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    1
                ],
                "type": "explosive",
                "numObstacles": 30,
                "layoutRadius": 0.25,
                "layoutAngleOffsetInRevs": 0.16666667,
                "numPoints": 3,
                "extent": 0.007,
                "orientationAngleOffsetInRevs": 0
            }
        ],
        "numPoints": 0
    },
    "heal": {
        "startMessage": "Game started. Fight over this healing pool!",
        "color": "#1d2e26",
        "background": "#0d2118",
        "obstacles": [
            {
                "type": "healing",
                "layoutRadius": 0,
                "extent": 0.02,
                "numObstacles": 1,
                "layoutAngleOffsetInRevs": 0.08333333,
                "numPoints": 6
            },
            {
                "type": "fast",
                "numObstacles": 6,
                "layoutRadius": 0.085,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 6,
                "extent": 0.003,
                "orientationAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.166667
            },
            {
                "numObstacles": 6,
                "layoutRadius": 0.25,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 6,
                "extent": 0.025,
                "orientationAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.012
            }
        ],
        "numPoints": 6
    },
    "snowflake": {
        "color": "#2f1f33",
        "background": "#190d21",
        "numPoints": 6,
        "angleOffsetInRevs": 0.08333333333,
        "obstacles": [
            {
                "type": "fast",
                "numObstacles": 2,
                "layoutRadius": 0.085,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 4,
                "extent": 0.003,
                "orientationAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.24
            },
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
        "color": "#332529",
        "background": "#21141b",
        "numPoints": 5,
        "obstacles": [
            {
                "type": "volcano",
                "layoutRadius": 0.0125,
                "extent": 0.0125,
                "numObstacles": 4,
                "angularWidthInRevs": 0.25,
                "layoutAngleOffsetInRevs": 0
            },
            {
                "numObstacles": 5,
                "layoutRadius": 0.15,
                "layoutAngleOffsetInRevs": 0.1,
                "numPoints": 3,
                "extent": 0.015,
                "orientationAngleOffsetInRevs": 0.5
            }
        ]
    },
    "single": {
        "color": "#292032",
        "background": "#170b21",
        "numPoints": 3,
        "obstacles": [
            {
                "type": "spinner",
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
        "color": "#33302a",
        "background": "#211f1b",
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
                "type": "bumper",
                "numObstacles": 5,
                "layoutRadius": 0.12,
                "layoutAngleOffsetInRevs": 0.1,
                "numPoints": 4,
                "extent": 0.01,
                "orientationAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.04
            }
        ],
        "numPoints": 5
    },
    "mirrors": {
        "color": "#212332",
        "background": "#0d1021",
        "obstacles": [
            {
                "type": "mirror",
                "numObstacles": 7,
                "layoutRadius": 0.22,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 4,
                "extent": 0.01,
                "orientationAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.05
            }
        ],
        "numPoints": 7
    },
    "innerStar": {
        "color": "#33292d",
        "background": "#21181b",
        "obstacles": [
            {
                "type": "volcano",
                "layoutRadius": 0.32,
                "extent": 0.002,
                "numObstacles": 5,
                "layoutAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.15
            },
            {
                "type": "explosive",
                "numObstacles": 10,
                "layoutRadius": 0.07,
                "layoutAngleOffsetInRevs": 0.1,
                "numPoints": 3,
                "extent": 0.007,
                "orientationAngleOffsetInRevs": 0.5
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
        "angleOffsetInRevs": 0.1
    },
    "mirrorhenge": {
        "color": "#242b33",
        "background": "#171e21",
        "obstacles": [
            {
                "type": "fast",
                "numObstacles": 4,
                "layoutRadius": 0.18,
                "layoutAngleOffsetInRevs": 0.08333333,
                "numPoints": 4,
                "extent": 0.003,
                "orientationAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.25
            },
            {
                "type": "spinner",
                "numObstacles": 3,
                "layoutRadius": 0.0725,
                "layoutAngleOffsetInRevs": 0.2,
                "numPoints": 4,
                "extent": 0.018,
                "orientationAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.03
            },
            {
                "type": "mirror",
                "pattern": [
                    1,
                    1,
                    0,
                    0,
                    0,
                    1
                ],
                "numObstacles": 36,
                "layoutRadius": 0.35,
                "layoutAngleOffsetInRevs": 0.125,
                "numPoints": 4,
                "extent": 0.007,
                "orientationAngleOffsetInRevs": 0,
                "angularWidthInRevs": 0.02
            }
        ]
    },
    "spiral": {
        "color": "#1a2233",
        "background": "#0c131f",
        "obstacles": [
            {
                "type": "inward",
                "layoutRadius": 0.175,
                "extent": 0.0015,
                "numObstacles": 5,
                "layoutAngleOffsetInRevs": 0,
                "orientationAngleOffsetInRevs": -0.15,
                "angularWidthInRevs": 0.24
            },
            {
                "type": "bumper",
                "numObstacles": 1,
                "layoutRadius": 0,
                "layoutAngleOffsetInRevs": 0.125,
                "numPoints": 4,
                "extent": 0.015,
                "orientationAngleOffsetInRevs": 0.125
            },
            {
                "type": "explosive",
                "numObstacles": 5,
                "layoutRadius": 0.35,
                "layoutAngleOffsetInRevs": 0.2,
                "numPoints": 3,
                "extent": 0.007,
                "orientationAngleOffsetInRevs": 0.166667
            }
        ]
    },
    "triplet": {
        "color": "#1e2933",
        "background": "#111321",
        "obstacles": [
            {
                "type": "spinner",
                "numObstacles": 3,
                "layoutRadius": 0.28,
                "layoutAngleOffsetInRevs": 0.5,
                "numPoints": 3,
                "extent": 0.0225,
                "orientationAngleOffsetInRevs": 0.5
            }
        ],
        "numPoints": 3,
        "angleOffsetInRevs": 0.16666667
    },
    "square": {
        "color": "#1a2233",
        "background": "#0e1521",
        "numPoints": 4,
        "obstacles": [
            {
                "type": "fast",
                "layoutRadius": 0.2,
                "extent": 0.002,
                "numObstacles": 2,
                "layoutAngleOffsetInRevs": 0.125,
                "angularWidthInRevs": 0.25,
                "health": 200
            },
            {
                "numObstacles": 2,
                "layoutRadius": 0.33,
                "layoutAngleOffsetInRevs": 0.125,
                "numPoints": 4,
                "extent": 0.009,
                "orientationAngleOffsetInRevs": 0
            }
        ],
        "angleOffsetInRevs": 0.125
    },
    "surrounded": {
        "color": "#282333",
        "background": "#171221",
        "obstacles": [
            {
                "numObstacles": 15,
                "layoutRadius": 0.35,
                "layoutAngleOffsetInRevs": 0.1,
                "numPoints": 3,
                "extent": 0.013,
                "orientationAngleOffsetInRevs": 0.5,
                "pattern": [
                    1,
                    1,
                    1,
                    1,
                    0
                ]
            },
            {
                "type": "bumper",
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
        "color": "#332b2f",
        "background": "#211a1e",
        "obstacles": [
            {
                "type": "volcano",
                "numObstacles": 3,
                "layoutRadius": 0.3,
                "layoutAngleOffsetInRevs": 0.18,
                "numPoints": 6,
                "extent": 0.025,
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
                "type": "explosive",
                "numObstacles": 12,
                "layoutRadius": 0.06,
                "layoutAngleOffsetInRevs": 0.2216666667,
                "numPoints": 3,
                "extent": 0.007,
                "orientationAngleOffsetInRevs": 0,
                "pattern": [
                    1,
                    1,
                    1,
                    0
                ]
            }
        ]
    }
}