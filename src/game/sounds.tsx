export const Sounds: Sounds = {
    "thrust-channelling": {
        start: [
            {
                "stopTime": 0.25,
                "attack": 0.05,
                "decay": 0.2,
                "lowPass": 600,
                "wave": "brown-noise"
            }
        ],
    },
    "teleport-channelling": {
        start: [
            {
                stopTime: 0.1,
                attack: 0.03,
                decay: 0.07,

                highPass: 780,
                lowPass: 800,

                wave: "brown-noise",
            },
        ],
    },
    "teleport-arriving": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 0.25,
                attack: 0.03,
                decay: 0.22,

                highPass: 1080,
                lowPass: 1100,

                wave: "brown-noise",
            },
        ],
    },
    "swap": {
        "start": [
            {
                "volume": 0.25,
                "stopTime": 0.75,
                "attack": 0.05,
                "decay": 0.7,
                "startFreq": 4800,
                "stopFreq": 7200,
                "modStartFreq": 30,
                "modStopFreq": 30,
                "modStartStrength": 3600,
                "modStopStrength": 4200,
                "tremoloFreq": 5,
                "tremoloStrength": 0.05,
                "wave": "triangle",
                "ratios": [
                    1,
                    1.33,
                    1.5
                ]
            }
        ]
    },
    "voidRush-lavaImmunity": {
        "start": [
            {
                "volume": 0.25,
                "stopTime": 2.5,
                "attack": 0.25,
                "decay": 2.25,
                "startFreq": 60,
                "stopFreq": 70,
                "highPass": 40,
                "wave": "sine",
                "ratios": [
                    1,
                    1.5
                ]
            },
            {
                "volume": 0.25,
                "stopTime": 2.5,
                "attack": 0.25,
                "decay": 2.25,
                "highPass": 980,
                "lowPass": 1000,
                "wave": "brown-noise"
            }
        ]
    },
    "vanish": {
        "start": [
            {
                "stopTime": 1.25,
                "attack": 0.25,
                "decay": 1,
                "highPass": 980,
                "lowPass": 1000,
                "wave": "brown-noise"
            }
        ]
    },
    "shield": {
        start: [
            {
                volume: 0.25,

                stopTime: 3,
                attack: 0.25,
                decay: 2.9,

                startFreq: 90,
                stopFreq: 90,
                highPass: 40,

                wave: "sine",

                ratios: [1],
            },
        ],
    },
    "shield-hit": {
        cutoffEarly: false,
        start: [
            {
                volume: 0.5,

                stopTime: 0.5,
                attack: 0.01,
                decay: 0.49,

                startFreq: 90,
                stopFreq: 90,
                lowPass: 90,
                highPass: 40,

                modStartFreq: 180,
                modStopFreq: 180,
                modStartStrength: 90,
                modStopStrength: 90,

                wave: "sine",

                ratios: [1],
            },
        ],
    },
    "icewall": {
        start: [
            {
                volume: 0.25,

                stopTime: 1.25,
                attack: 0.1,
                decay: 1.15,

                startFreq: 100,
                stopFreq: 100,
                highPass: 40,

                wave: "sine",

                ratios: [1],
            }
        ],
    },
    "icewall-hit": {
        cutoffEarly: false,
        start: [
            {
                volume: 0.5,

                stopTime: 0.5,
                attack: 0.01,
                decay: 0.49,

                startFreq: 100,
                stopFreq: 100,
                lowPass: 100,
                highPass: 40,

                modStartFreq: 200,
                modStopFreq: 200,
                modStartStrength: 100,
                modStopStrength: 100,

                wave: "sine",

                ratios: [1],
            },
        ],
    },
    "drain": {
        start: [
            {
                stopTime: 2,
                attack: 0.25,
                decay: 1.75,

                highPass: 2500,
                lowPass: 2510,

                wave: "brown-noise",
            },
            {
                stopTime: 2,
                attack: 0.25,
                decay: 1.75,

                startFreq: 1100,
                stopFreq: 1103,
                lowPass: 300,

                tremoloFreq: 10,
                tremoloStrength: 0.2,

                wave: "square",

                ratios: [1, 1.34, 1.5],
            },
        ],
    },
    "fireball": {
        sustain: [
            {
                stopTime: 1.5,
                attack: 0.25,
                decay: 0.25,

                highPass: 432,
                lowPass: 438,

                wave: "brown-noise",

            },
        ],
    },
    "flamestrike": {
        sustain: [
            {
                stopTime: 1.5,
                attack: 0.25,
                decay: 0.25,

                highPass: 300,
                lowPass: 303,

                wave: "brown-noise",
            },
        ],
    },
    "flamestrike-detonating": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 2,
                attack: 0.01,
                decay: 1.95,

                startFreq: 100,
                stopFreq: 0.01,
                lowPass: 300,

                wave: "triangle",

                ratios: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2],
            }
        ],
    },
    "triplet-channelling": {
        "cutoffEarly": false,
        "start": [
            {
                "stopTime": 0.5,
                "attack": 0.25,
                "decay": 0.25,
                "highPass": 732,
                "lowPass": 738,
                "wave": "brown-noise"
            }
        ]
    },
    "lightning": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 0.3,
                attack: 0.001,
                decay: 0.29,

                startFreq: 4500,
                stopFreq: 5000,

                wave: "sawtooth",
                ratios: [1, 1.33, 1.5, 1.78, 2, 2.67, 3, 3.56],
            },
        ],
    },
    "link": {
        start: [
            {
                stopTime: 2,
                attack: 1,
                decay: 1,

                startFreq: 150,
                stopFreq: 150,
                lowPass: 150,
                tremoloFreq: 10,
                tremoloStrength: 0.2,

                wave: "square",

                ratios: [1, 2, 4, 8, 16],
            },
        ],
    },
    "grapple": {
        "start": [
            {
                "stopTime": 1.25,
                "attack": 1,
                "decay": 0.25,
                "startFreq": 200,
                "stopFreq": 200,
                "lowPass": 200,
                "tremoloFreq": 16,
                "tremoloStrength": 0.2,
                "wave": "square",
                "ratios": [
                    1,
                    2,
                    4,
                    8,
                    16
                ]
            }
        ]
    },
    "gravity": {
        start: [
            {
                stopTime: 8,
                attack: 0.25,
                decay: 7.75,

                startFreq: 410,
                stopFreq: 415,
                lowPass: 100,

                tremoloFreq: 12,
                tremoloStrength: 0.3,

                wave: "square",

                ratios: [1, 1.33, 1.4, 1.5],
            },
        ],
    },
    "gravity-trapped": {
        start: [
            {
                stopTime: 2,
                attack: 0.01,
                decay: 1.95,

                startFreq: 410,
                stopFreq: 415,
                lowPass: 100,

                tremoloFreq: 12,
                tremoloStrength: 0.4,

                wave: "square",

                ratios: [1, 1.33, 1.4, 1.5],
            },
        ],
    },
    "whirlwind": {
        "start": [
            {
                "volume": 0.25,
                "stopTime": 5,
                "attack": 1,
                "decay": 4,
                "highPass": 180,
                "lowPass": 300,
                "wave": "brown-noise"
            }
        ]
    },
    "iceBomb-channelling": {
        "cutoffEarly": false,
        "start": [
            {
                "volume": 0.25,
                "stopTime": 0.6,
                "attack": 0.07,
                "decay": 0.5,
                "highPass": 100,
                "lowPass": 150,
                "wave": "brown-noise"
            }
        ]
    },
    "homing": {
        start: [
            {
                volume: 0.25,

                stopTime: 5,
                attack: 0.25,
                decay: 4.5,

                highPass: 1800,
                lowPass: 1803,

                wave: "brown-noise",
            },
            {
                stopTime: 5,
                attack: 0.5,
                decay: 4.5,

                startFreq: 800,
                stopFreq: 800,
                lowPass: 200,

                modStartFreq: 2400,
                modStopFreq: 2400,
                modStartStrength: 800,
                modStopStrength: 800,

                tremoloFreq: 6,
                tremoloStrength: 0.2,

                wave: "sine",

                ratios: [1, 1.5],
            },
        ],
    },
    "boomerang": {
        start: [
            {
                volume: 0.25,

                stopTime: 5,
                attack: 0.25,
                decay: 4,

                highPass: 895,
                lowPass: 925,

                wave: "brown-noise",
            },
            {
                stopTime: 5,
                attack: 0.25,
                decay: 4,

                startFreq: 205,
                stopFreq: 206,
                lowPass: 100,

                tremoloFreq: 7,
                tremoloStrength: 0.3,

                wave: "sine",

                ratios: [1, 1.5, 2, 2.75, 4, 5.5],
            },
        ],
    },
    "retractor": {
        "start": [
            {
                "volume": 0.25,
                "stopTime": 2,
                "attack": 0.25,
                "decay": 1.5,
                "highPass": 1400,
                "lowPass": 1403,
                "wave": "brown-noise"
            },
            {
                "stopTime": 2,
                "attack": 0.5,
                "decay": 1.5,
                "startFreq": 900,
                "stopFreq": 900,
                "lowPass": 200,
                "modStartFreq": 1900,
                "modStopFreq": 1900,
                "modStartStrength": 300,
                "modStopStrength": 300,
                "tremoloFreq": 8,
                "tremoloStrength": 0.3,
                "wave": "sine",
                "ratios": [
                    1,
                    1.5
                ]
            }
        ]
    },
    "retractor-detonating": {
        "cutoffEarly": false,
        "start": [
            {
                "stopTime": 2,
                "attack": 0.01,
                "decay": 1.95,
                "startFreq": 100,
                "stopFreq": 0.01,
                "lowPass": 300,
                "wave": "triangle",
                "ratios": [
                    1,
                    1.1,
                    1.2,
                    1.3,
                    1.4,
                    1.5,
                    1.6,
                    1.7,
                    1.8,
                    1.9,
                    2
                ]
            }
        ]
    },
    "backlash": {
        "start": [
            {
                "volume": 0.25,
                "stopTime": 1.5,
                "attack": 0.25,
                "decay": 1.25,
                "highPass": 1900,
                "lowPass": 1904,
                "wave": "brown-noise"
            },
            {
                "stopTime": 1.5,
                "attack": 0.01,
                "decay": 1.4,
                "startFreq": 1900,
                "stopFreq": 1900,
                "lowPass": 400,
                "modStartFreq": 2000,
                "modStopFreq": 2000,
                "modStartStrength": 300,
                "modStopStrength": 300,
                "tremoloFreq": 21,
                "tremoloStrength": 0.5,
                "wave": "sine",
                "ratios": [
                    1,
                    1.5
                ]
            }
        ]
    },
    "backlash-hit": {
        cutoffEarly: false,
        "start": [
            {
                "stopTime": 0.3,
                "attack": 0.01,
                "decay": 0.29,
                "startFreq": 1900,
                "stopFreq": 1900,
                "lowPass": 125,
                "modStartFreq": 2000,
                "modStopFreq": 2000,
                "modStartStrength": 2400,
                "modStopStrength": 2400,
                "tremoloFreq": 21,
                "tremoloStrength": 0.5,
                "wave": "sine",
                "ratios": [
                    1,
                    1.5
                ]
            }
        ]
    },
    "rocket": {
        "start": [
            {
                "volume": 0.25,
                "stopTime": 2,
                "attack": 0.25,
                "decay": 1.5,
                "highPass": 2100,
                "lowPass": 2103,
                "wave": "brown-noise"
            },
            {
                "stopTime": 2,
                "attack": 0.5,
                "decay": 1.5,
                "startFreq": 900,
                "stopFreq": 900,
                "lowPass": 200,
                "modStartFreq": 2100,
                "modStopFreq": 2100,
                "modStartStrength": 100,
                "modStopStrength": 100,
                "tremoloFreq": 11,
                "tremoloStrength": 0.3,
                "wave": "sine",
                "ratios": [
                    1,
                    1.5
                ]
            }
        ]
    },
    "rocket-detonating": {
        "cutoffEarly": false,
        "start": [
            {
                "stopTime": 2,
                "attack": 0.01,
                "decay": 1.95,
                "startFreq": 100,
                "stopFreq": 0.01,
                "lowPass": 300,
                "wave": "triangle",
                "ratios": [
                    1,
                    1.1,
                    1.2,
                    1.3,
                    1.4,
                    1.5,
                    1.6,
                    1.7,
                    1.8,
                    1.9,
                    2
                ]
            }
        ]
    },
    "blast-charging": {
        "start": [
            {
                "stopTime": 2,
                "attack": 0.25,
                "decay": 0.5,
                "startFreq": 4,
                "stopFreq": 4,
                "wave": "triangle",
                "ratios": [
                    1,
                    2,
                    2.5,
                    4,
                    5,
                    8,
                    10,
                    16
                ],
                "tremoloFreq": 12,
                "tremoloStrength": 0.4
            }
        ]
    },
    "blast": {
        "start": [
            {
                "stopTime": 1,
                "attack": 0.1,
                "decay": 0.9,
                "highPass": 100,
                "lowPass": 500,
                "wave": "brown-noise"
            }
        ]
    },
    "blast-hit": {
        "cutoffEarly": false,
        "start": [
            {
                "stopTime": 0.9,
                "attack": 0.01,
                "decay": 0.85,
                "highPass": 100,
                "lowPass": 500,
                "wave": "brown-noise"
            },
            {
                "stopTime": 2,
                "attack": 0.01,
                "decay": 1.95,
                "startFreq": 50,
                "stopFreq": 0.01,
                "lowPass": 300,
                "wave": "triangle",
                "ratios": [
                    1,
                    1.1,
                    1.2,
                    1.3,
                    1.4,
                    1.5,
                    1.6,
                    1.7,
                    1.8,
                    1.9,
                    2
                ]
            }
        ]
    },
    "kamehameha-charging": {
        start: [
            {
                stopTime: 0.5,
                attack: 0.49,
                decay: 0.01,

                startFreq: 4,
                stopFreq: 19,

                wave: "triangle",

                ratios: [1, 2, 2.5, 4, 5, 8, 10, 16],
            },
        ],
    },
    "kamehameha-channelling": {
        repeatIntervalSeconds: 0.1,
        start: [
            {
                stopTime: 0.25,
                attack: 0.05,
                decay: 0.20,

                startFreq: 40,
                stopFreq: 18,

                wave: "triangle",

                ratios: [1, 2, 4],
            },
        ],
        sustain: [
            {
                stopTime: 0.25,
                attack: 0.1,
                decay: 0.15,

                startFreq: 18,
                stopFreq: 18.1,
                lowPass: 200,

                wave: "triangle",

                ratios: [
                    1,
                    8,
                    24,
                    56,
                    88
                ],
            },
            {
                stopTime: 0.25,
                attack: 0.1,
                decay: 0.15,

                startFreq: 18,
                stopFreq: 17.9,
                lowPass: 200,

                wave: "square",

                ratios: [1, 2.16, 4.16, 8, 16],
            },
        ],
    },
    "meteor": {
        start: [
            {
                stopTime: 1.0,
                attack: 0.1,
                decay: 0.9,

                startFreq: 20,
                stopFreq: 1,
                highPass: 40,
                lowPass: 300,

                wave: "square",

                ratios: [1, 2, 3, 4, 5, 6, 7, 8],
            },
        ],
        sustain: [
            {
                stopTime: 2,
                attack: 0.5,
                decay: 1.0,

                startFreq: 1,
                stopFreq: 10,
                highPass: 40,
                lowPass: 100,

                wave: "square",

                ratios: [1, 1.5, 2, 2.1, 2.16, 3.5, 6.7, 8.2],
            },
        ],
    },
    "meteorite": {
        "start": [
            {
                "stopTime": 1,
                "attack": 0.1,
                "decay": 0.9,
                "startFreq": 20,
                "stopFreq": 1,
                "highPass": 150,
                "lowPass": 300,
                "wave": "square",
                "ratios": [
                    1,
                    2,
                    3,
                    4,
                    5,
                    6,
                    7,
                    8
                ]
            }
        ],
        "sustain": [
            {
                "stopTime": 2,
                "attack": 0.5,
                "decay": 1,
                "startFreq": 1,
                "stopFreq": 10,
                "highPass": 150,
                "lowPass": 200,
                "wave": "square",
                "ratios": [
                    1,
                    1.5,
                    2,
                    2.1,
                    2.16,
                    3.5,
                    6.7,
                    8.2
                ]
            }
        ]
    },
    "supernova": {
        start: [
            {
                stopTime: 1,
                attack: 0.1,
                decay: 0.9,

                lowPass: 450,
                startFreq: 900,
                stopFreq: 1000,

                tremoloFreq: 7,
                tremoloStrength: 0.3,

                modStartFreq: 1000,
                modStopFreq: 1000,
                modStartStrength: 1000,
                modStopStrength: 1000,

                wave: "triangle",

                ratios: [1],
            },
        ],
    },
    "supernova-detonating": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 0.75,
                attack: 0.01,
                decay: 0.74,

                startFreq: 100,
                stopFreq: 10,

                modStartFreq: 800,
                modStopFreq: 800,
                modStartStrength: 100,
                modStopStrength: 100,

                tremoloFreq: 3,
                tremoloStrength: 0.1,

                wave: "triangle",

                ratios: [1, 1.2, 1.4, 1.6, 1.8, 2.4, 2.8, 3.2, 3.6],
            },
        ],
    },
    "scourge-charging": {
        start: [
            {
                volume: 0.25,

                stopTime: 0.5,
                attack: 0.49,
                decay: 0.01,

                startFreq: 50,
                stopFreq: 200,

                modStartFreq: 25,
                modStopFreq: 100,
                modStartStrength: 25,
                modStopStrength: 100,

                wave: "triangle",

                ratios: [1, 1.25, 1.5, 1.75],
            },
        ],
    },
    "scourge-detonating": {
        cutoffEarly: false,
        start: [
            {
                volume: 0.25,

                stopTime: 1,
                attack: 0.01,
                decay: 0.99,

                startFreq: 100,
                stopFreq: 10,

                wave: "triangle",

                ratios: [1, 1.2, 1.4, 1.6, 1.8],
            },
            {
                volume: 0.25,

                stopTime: 1,
                attack: 0.01,
                decay: 0.99,

                startFreq: 100,
                stopFreq: 30,

                modStartFreq: 313,
                modStopFreq: 100,
                modStartStrength: 600,
                modStopStrength: 100,

                tremoloFreq: 3,
                tremoloStrength: 0.1,

                wave: "triangle",

                ratios: [1, 1.33, 1.5],
            },
        ],
    },
    "bouncer": {
        start: [
            {
                stopTime: 0.5,
                attack: 0.1,
                decay: 0.4,

                startFreq: 8900,
                stopFreq: 8100,
                lowPass: 9000,

                wave: "square",

                ratios: [1, 1.33, 1.5],
            },
        ],
    },
    "bouncer-hit": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 0.5,
                attack: 0.001,
                decay: 0.49,

                startFreq: 8100,
                stopFreq: 8500,
                lowPass: 9000,

                wave: "square",

                ratios: [1, 1.33, 1.5],
            },
        ],
    },
    "repeater": {
        "start": [
            {
                "stopTime": 1,
                "attack": 0.1,
                "decay": 0.9,
                "startFreq": 2000,
                "stopFreq": 2000,
                "lowPass": 1000,
                "wave": "triangle",
                "tremoloFreq": 15,
                "tremoloStrength": 0.4,
                "ratios": [
                    1,
                    1.5
                ]
            },
            {
                "volume": 0.5,
                "stopTime": 1,
                "attack": 0.25,
                "decay": 0.75,
                "highPass": 2000,
                "lowPass": 2000,
                "wave": "brown-noise"
            }
        ]
    },
    "repeater-setCooldown": {
        cutoffEarly: false,
        "start": [
            {
                "volume": 0.5,
                "stopTime": 0.25,
                "attack": 0.01,
                "decay": 0.24,
                "startFreq": 4000,
                "stopFreq": 4000,
                "lowPass": 4000,
                "wave": "square",
                "tremoloFreq": 15,
                "tremoloStrength": 0.4,
                "ratios": [
                    1,
                    1.5
                ]
            }
        ]
    },
    "firespray-channelling": {
        cutoffEarly: false,
        start: [
            {
                volume: 0.25,

                stopTime: 0.5,
                attack: 0.1,
                decay: 0.25,

                startFreq: 4800,
                stopFreq: 7200,

                modStartFreq: 30,
                modStopFreq: 30,
                modStartStrength: 3600,
                modStopStrength: 10800,

                tremoloFreq: 30,
                tremoloStrength: 0.1,

                wave: "triangle",

                ratios: [1, 1.33, 1.5],
            }
        ],
    },
    "saber": {
        "start": [
            {
                "volume": 0.25,
                "stopTime": 5,
                "attack": 0.15,
                "decay": 0.5,
                "startFreq": 15.3,
                "stopFreq": 15.3,
                "modStartFreq": 5,
                "modStopFreq": 4,
                "modStartStrength": 1,
                "modStopStrength": 1,
                "lowPass": 100,
                "highPass": 40,
                "tremoloFreq": 7,
                "tremoloStrength": 0.2,
                "wave": "square",
                "ratios": [
                    1,
                    2,
                    4,
                    8,
                    16
                ]
            }
        ]
    },
    "saber-hit": {
        "cutoffEarly": false,
        "start": [
            {
                "volume": 0.5,
                "stopTime": 0.5,
                "attack": 0.1,
                "decay": 0.4,
                "startFreq": 100,
                "stopFreq": 100,
                "lowPass": 100,
                "highPass": 40,
                "modStartFreq": 200,
                "modStopFreq": 200,
                "modStartStrength": 100,
                "modStopStrength": 100,
                "wave": "sine",
                "ratios": [
                    1
                ]
            }
        ]
    },
    "whip": {
        "start": [
            {
                "volume": 0.25,
                "stopTime": 0.25,
                "attack": 0.05,
                "decay": 0.2,
                "startFreq": 4800,
                "stopFreq": 7200,
                "modStartFreq": 30,
                "modStopFreq": 30,
                "modStartStrength": 3600,
                "modStopStrength": 3600,
                "tremoloFreq": 30,
                "tremoloStrength": 0.1,
                "wave": "triangle",
                "ratios": [
                    1,
                    1.33,
                    1.5
                ]
            }
        ]
    },
    "whip-detonating": {
        "cutoffEarly": false,
        "start": [
            {
                "stopTime": 0.15,
                "attack": 0.01,
                "decay": 0.14,
                "startFreq": 3000,
                "stopFreq": 3000,
                "modStartFreq": 20,
                "modStopFreq": 10,
                "modStartStrength": 6000,
                "modStopStrength": 3000,
                "tremoloFreq": 3,
                "tremoloStrength": 0.1,
                "wave": "triangle",
                "ratios": [
                    1,
                    1.2,
                    1.4,
                    1.6,
                    1.8,
                    2.4,
                    2.8,
                    3.2,
                    3.6
                ]
            }
        ]
    },
    "halo": {
        "start": [
            {
                "stopTime": 0.3,
                "attack": 0.01,
                "decay": 0.29,
                "startFreq": 9000,
                "stopFreq": 11500,
                "wave": "sawtooth",
                "ratios": [
                    1,
                    1.167,
                    1.33,
                    1.78,
                    2,
                    2.25
                ]
            }
        ]
    },
    "halo-hit": {
        cutoffEarly: false,
        "start": [
            {
                "stopTime": 0.3,
                "attack": 0.001,
                "decay": 0.29,
                "startFreq": 7000,
                "stopFreq": 6800,
                "wave": "sawtooth",
                "ratios": [
                    1,
                    1.167,
                    1.33,
                    1.78,
                    2,
                    2.25
                ]
            },
            {
                "volume": 0.25,
                "stopTime": 1,
                "attack": 0.01,
                "decay": 0.7,
                "startFreq": 150,
                "stopFreq": 0.001,
                "lowPass": 300,
                "wave": "triangle",
                "ratios": [
                    1,
                    1.1,
                    1.2,
                    1.3,
                    1.4,
                    1.5,
                    1.6,
                    1.7,
                    1.8,
                    1.9,
                    2
                ]
            }
        ]
    },
    "horcrux": {
        "start": [
            {
                "volume": 0.25,
                "stopTime": 1,
                "attack": 0.25,
                "decay": 0.75,
                "startFreq": 150,
                "stopFreq": 150,
                "wave": "sine",
                "ratios": [
                    1,
                    1.5
                ],
                "tremoloFreq": 8,
                "tremoloStrength": 0.1
            }
        ]
    },
    "mines-channelling": {
        "cutoffEarly": false,
        "start": [
            {
                "volume": 0.25,
                "stopTime": 0.17,
                "attack": 0.05,
                "decay": 0.05,
                "startFreq": 6000,
                "stopFreq": 6400,
                "modStartFreq": 30,
                "modStopFreq": 30,
                "modStartStrength": 3000,
                "modStopStrength": 12588,
                "tremoloFreq": 30,
                "tremoloStrength": 0.1,
                "wave": "triangle",
                "ratios": [
                    1,
                    1.33,
                    1.5
                ]
            }
        ]
    },
    "mines-detonating": {
        "cutoffEarly": false,
        "start": [
            {
                "stopTime": 1,
                "attack": 0.01,
                "decay": 0.95,
                "startFreq": 50,
                "stopFreq": 0.01,
                "lowPass": 300,
                "wave": "triangle",
                "ratios": [
                    1,
                    1.1,
                    1.2,
                    1.3,
                    1.4,
                    1.5,
                    1.6,
                    1.7,
                    1.8,
                    1.9,
                    2
                ]
            }
        ]
    },
    "standard-hit": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 0.75,
                attack: 0.01,
                decay: 0.70,

                startFreq: 150,
                stopFreq: 0.01,
                lowPass: 250,

                wave: "triangle",

                ratios: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2],
            },
        ],
    },
    "death": {
        cutoffEarly: false,
        start: [
            {
                stopTime: 0.3,
                attack: 0.01,
                decay: 0.29,

                startFreq: 225,
                stopFreq: 225,
                lowPass: 225,

                tremoloFreq: 6,
                tremoloStrength: 1,

                wave: "triangle",

                ratios: [1, 1.5],
            },
        ],
    },
    "bumper": {
        "cutoffEarly": false,
        "start": [
            {
                "volume": 0.1,
                "stopTime": 0.5,
                "attack": 0.001,
                "decay": 0.49,
                "startFreq": 120,
                "stopFreq": 120,
                "lowPass": 120,
                "highPass": 40,
                "modStartFreq": 240,
                "modStopFreq": 240,
                "modStartStrength": 120,
                "modStopStrength": 120,
                "wave": "square",
                "ratios": [
                    1
                ]
            }
        ]
    },
    "explosive-detonating": {
        "cutoffEarly": false,
        "start": [
            {
                "stopTime": 2,
                "attack": 0.01,
                "decay": 1.95,
                "startFreq": 100,
                "stopFreq": 0.01,
                "lowPass": 300,
                "wave": "triangle",
                "ratios": [
                    1,
                    1.1,
                    1.2,
                    1.3,
                    1.4,
                    1.5,
                    1.6,
                    1.7,
                    1.8,
                    1.9,
                    2
                ]
            }
        ]
    },
};