export const Layouts: Layouts = {
    "double": {
        obstacles: [
            {
                numObstacles: 2,
                layoutRadius: 0.07,
                layoutAngleOffsetInRevs: 0.125,
                numPoints: 4,
                extent: 0.015 * 1.5,
                orientationAngleOffsetInRevs: 0.125,
            },
            {
                numObstacles: 4,
                layoutRadius: 0.33,
                layoutAngleOffsetInRevs: 0,
                numPoints: 4,
                extent: 0.015 * 1,
                orientationAngleOffsetInRevs: 0,
            },
        ],
    },
    "snowflake": {
        "obstacles": [
            {
                "numObstacles": 4,
                "layoutRadius": 0.12,
                "layoutAngleOffsetInRevs": 0.125,
                "numPoints": 4,
                "extent": 0.015,
                "orientationAngleOffsetInRevs": 0
            },
            {
                "numObstacles": 6,
                "layoutRadius": 0.35,
                "layoutAngleOffsetInRevs": 0.08333333333,
                "numPoints": 4,
                "extent": 0.01,
                "orientationAngleOffsetInRevs": 0
            }
        ]
    },
    "inside5": {
        obstacles: [
            {
                numObstacles: 5,
                layoutRadius: 0.15,
                layoutAngleOffsetInRevs: 0.5 * (1 / 5),
                numPoints: 3,
                extent: 0.015,
                orientationAngleOffsetInRevs: 0.5,
            },
        ],
    },
    "single": {
        "obstacles": [
            {
                "numObstacles": 1,
                "layoutRadius": 0,
                "layoutAngleOffsetInRevs": 0,
                "numPoints": 3,
                "extent": 0.025,
                "orientationAngleOffsetInRevs": 0
            }
        ]
    },
    "pepper": {
        obstacles: [
            {
                numObstacles: 5,
                layoutRadius: 0.32,
                layoutAngleOffsetInRevs: 0,
                numPoints: 4,
                extent: 0.015,
                orientationAngleOffsetInRevs: 0.5 * (1 / 4),
            },
            {
                numObstacles: 5,
                layoutRadius: 0.15,
                layoutAngleOffsetInRevs: 0.5 * (1 / 5),
                numPoints: 4,
                extent: 0.015,
                orientationAngleOffsetInRevs: 0.5 * (1 / 4),
            },
        ],
    },
    "innerStar": {
        "obstacles": [
            {
                "numObstacles": 10,
                "layoutRadius": 0.12,
                "layoutAngleOffsetInRevs": 0.1,
                "numPoints": 4,
                "extent": 0.01,
                "orientationAngleOffsetInRevs": 0.5,
                "health": 10
            },
            {
                "numObstacles": 5,
                "layoutRadius": 0.32,
                "layoutAngleOffsetInRevs": 0.1,
                "numPoints": 4,
                "extent": 0.02,
                "orientationAngleOffsetInRevs": 0.5
            }
        ]
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
    },
    "surrounded": {
        obstacles: [
            {
                numObstacles: 15,
                layoutRadius: 0.35,
                layoutAngleOffsetInRevs: 0.5 * (1 / 5),
                numPoints: 3,
                extent: 0.015,
                orientationAngleOffsetInRevs: 0.5,
            },
        ],
    },
    "tripletSwirl": {
        "obstacles": [
            {
                "numObstacles": 3,
                "layoutRadius": 0.06,
                "layoutAngleOffsetInRevs": 0.32,
                "numPoints": 3,
                "extent": 0.005,
                "orientationAngleOffsetInRevs": 0.125
            },
            {
                "numObstacles": 3,
                "layoutRadius": 0.14,
                "layoutAngleOffsetInRevs": 0.28,
                "numPoints": 3,
                "extent": 0.01,
                "orientationAngleOffsetInRevs": 0.125,
                "health": 20
            },
            {
                "numObstacles": 3,
                "layoutRadius": 0.22,
                "layoutAngleOffsetInRevs": 0.23,
                "numPoints": 3,
                "extent": 0.015,
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