import _ from 'lodash';
import pl from 'planck-js';
import * as vector from './vector';

const vectorZero = vector.zero();

export type Shape =
    Circle
    | Radial
    | Polygon
    | Arc

export interface Circle {
    type: "circle";
    radius: number;
}

export interface Radial {
    type: "radial";
    points: pl.Vec2[];
    extent: number;
}

export interface Polygon {
    type: "polygon";
    points: pl.Vec2[];
    normals: pl.Vec2[];
    minExtent: number;
    maxExtent: number;
}

export interface Arc {
    type: "arc";
    radius: number;
    radialExtent: number;
    angularExtent: number;
    localCenter: pl.Vec2; // in local coordinates
}

export function createCircle(radius: number): Circle {
    return { type: "circle", radius };
}

export function createArc(radius: number, radialExtent: number, angularExtent: number): Arc {
    const localCenter = vector.fromAngle(0, radius).neg();
    return {
        type: "arc",
        radius,
        radialExtent,
        angularExtent,
        localCenter,
    };
}

export function createRadial(numPoints: number, extent: number): Radial {
    const points = new Array<pl.Vec2>();
    for (let i = 0; i < numPoints; ++i) {
        const point = vector.fromAngle((i / numPoints) * (2 * Math.PI)).mul(extent);
        points.push(point);
    }
    return { type: "radial", points, extent };
}

// points must be specified clockwise
export function createPolygon(points: pl.Vec2[]): Polygon {
    const normals = new Array<pl.Vec2>();
    for (let i = 0; i < points.length; ++i) {
        const point = points[i];
        const previous = points[posMod(i - 1, points.length)];
        const next = points[posMod(i + 1, points.length)];

        const normal = vector.plus(
            vector.unit(vector.diff(point, previous)),
            vector.unit(vector.diff(point, next)),
        );
        normals.push(normal);
    }

    let minExtent = Infinity;
    let maxExtent = 0;
    for (let i = 0; i < points.length; ++i) {
        const current = points[i];
        const next = points[posMod(i + 1, points.length)];

        const normal = vector.rotateLeft(vector.unit(vector.diff(next, current)));
        const distanceToLine = Math.abs(vector.dot(current, normal));
        minExtent = Math.min(minExtent, distanceToLine);
        maxExtent = Math.max(maxExtent, distanceToLine);
    }

    return {
        type: "polygon",
        points,
        normals,
        minExtent,
        maxExtent,
    };
}

export function getMinExtent(shape: Shape) {
    switch (shape.type) {
        case "circle": return shape.radius;
        case "radial": return shape.extent;
        case "polygon": return shape.minExtent;
        case "arc": return shape.radialExtent;
        default: return 0;
    }
}

export function grow(shape: Shape, amount: number): Shape {
    if (shape.type === "circle") {
        return {
            type: "circle",
            radius: shape.radius + amount,
        };
    } else if (shape.type === "radial") {
        const multiplier = 1 + amount / shape.extent;
        return {
            type: "radial",
            points: shape.points.map(p => p.clone().mul(multiplier)),
            extent: shape.extent * multiplier,
        };
    } else if (shape.type === "polygon") {
        const newPoints = new Array<pl.Vec2>();
        for (let i = 0; i < shape.points.length; ++i) {
            newPoints.push(shape.points[i].clone().addMul(amount, shape.normals[i]));
        }
        return {
            type: "polygon",
            points: newPoints,
            normals: shape.normals,
            minExtent: shape.minExtent + amount,
            maxExtent: shape.maxExtent + amount,
        };
    } else if (shape.type === "arc") {
        return {
            type: "arc",
            radius: shape.radius,
            radialExtent: Math.max(0, shape.radialExtent + amount),
            angularExtent: shape.angularExtent,
            localCenter: shape.localCenter,
        };
    } else {
        throw "Unknown shape type";
    }
}

export function proportionalEdgePoint(shape: Shape, pos: pl.Vec2, angle: number, angularProportion: number, radialProportion: number, clearance: number = 0): pl.Vec2 {
    if (shape.type === "circle") {
        const localPoint = vector.fromAngle(angularProportion * vector.Tau, radialProportion * Math.max(0, shape.radius - clearance));
        return toWorldCoords(pos, angle, localPoint);

    } else if (shape.type === "radial" || shape.type === "polygon") {
        const seed = angularProportion * shape.points.length;
        const before = Math.floor(seed);
        const after = Math.ceil(seed) % shape.points.length;
        const alpha = seed - before;

        // Edge point
        let localPoint = pl.Vec2.combine(1 - alpha, shape.points[before], alpha, shape.points[after]);

        // Retract within clearance
        if (shape.type === "radial") {
            localPoint.add(vector.diff(vectorZero, localPoint).clamp(clearance));
        } else if (shape.type === "polygon") {
            const normal = pl.Vec2.combine(1 - alpha, shape.normals[before], alpha, shape.normals[after]);
            localPoint.addMul(-clearance, normal);
        }

        // Apply radial proportion
        localPoint.mul(radialProportion);

        return toWorldCoords(pos, angle, localPoint);

    } else if (shape.type === "arc") {
        const localAngle = (2 * angularProportion - 1) * shape.angularExtent;
        const localRadius = shape.radius + (2 * radialProportion - 1) * Math.max(0, shape.radialExtent - clearance);
        const localPoint = vector.fromAngle(localAngle, localRadius).add(shape.localCenter);
        return toWorldCoords(pos, angle, localPoint);

    } else {
        return pos;
    }
}

export function closestExtreme(shape: Shape, pos: pl.Vec2, angle: number, target: pl.Vec2) {
    if (shape.type === "circle") {
        return vector.towards(pos, target, shape.radius);
    } else if (shape.type === "radial") {
        // Not 100% correct but close enough
        return vector.towards(pos, target, shape.extent);
    } else if (shape.type === "polygon") {
        const localPoint = toLocalCoords(pos, angle, target);
        const localExtreme = _.maxBy(shape.points, p => vector.dot(p, localPoint));
        return toWorldCoords(pos, angle, localExtreme);
    } else {
        return pos;
    }
}

export function isConvex(shape: Shape): boolean {
    switch(shape.type) {
        case "arc": return false;
        default: return true;
    }
}

export function inside(shape: Shape, pos: pl.Vec2, angle: number, target: pl.Vec2, targetRadius: number = 0) {
    const localPoint = toLocalCoords(pos, angle, target);
    return insideLocal(shape, localPoint, targetRadius);
}

function insideLocal(shape: Shape, localPoint: pl.Vec2, hitRadius: number = 0): boolean {
    if (shape.type === "circle") {
        return localPoint.length() <= shape.radius + hitRadius;
    } else if (shape.type === "radial") {
        // This is not 100% correct but close enough for our purposes
        if (localPoint.length() <= shape.extent + hitRadius) {
            for (let i = 0; i < shape.points.length; ++i) {
                const a = shape.points[i];
                const b = shape.points[(i + 1) % shape.points.length];
                if (!vector.insideLine(localPoint, hitRadius, a, b)) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    } else if (shape.type === "polygon") {
        const length = localPoint.length();
        if (length > shape.maxExtent) {
            return false;
        } else if (length <= shape.minExtent) {
            return true;
        } else {
            for (let i = 0; i < shape.points.length; ++i) {
                const point = shape.points[i];
                const next = shape.points[(i + 1) % shape.points.length];

                const outside = vector.rotateLeft(vector.diff(next, point));
                outside.normalize();

                const distanceToEdge = vector.dot(point, outside);
                const distanceToTarget = vector.dot(localPoint, outside);
                if (distanceToTarget > distanceToEdge + hitRadius) {
                    return false;
                }
            }
            return true;
        }
    } else if (shape.type === "arc") {
        const diff = vector.diff(localPoint, shape.localCenter);

        if (Math.abs(diff.length() - shape.radius) > shape.radialExtent + hitRadius) {
            return false;
        }

        const fromNormal = vector.fromAngle(-shape.angularExtent + Math.PI / 2);
        if (vector.dot(diff, fromNormal) + hitRadius < 0) {
            return false;
        }

        const toNormal = vector.fromAngle(shape.angularExtent - Math.PI / 2);
        if (vector.dot(diff, toNormal) + hitRadius < 0) {
            return false;
        }

        return true;
    } else {
        return false;
    }
}

export function toLocalCoords(pos: pl.Vec2, angle: number, worldPoint: pl.Vec2) {
    return vector.turnVectorBy(vector.diff(worldPoint, pos), -angle);
}

export function toWorldCoords(pos: pl.Vec2, angle: number, localPoint: pl.Vec2) {
    return vector.turnVectorBy(localPoint, angle).add(pos);
}

export function shapeToPlanck(shape: Shape): pl.Shape {
    if (shape.type === "circle") {
        return pl.Circle(shape.radius);
    } else if (shape.type === "radial" || shape.type === "polygon") {
        return pl.Polygon(shape.points);
    } else if (shape.type === "arc") {
        const points = new Array<pl.Vec2>();
        points.push(vector.fromAngle(-shape.angularExtent, shape.radius - shape.radialExtent).add(shape.localCenter));
        points.push(vector.fromAngle(-shape.angularExtent, shape.radius + shape.radialExtent).add(shape.localCenter));
        points.push(vector.fromAngle(0, Math.sqrt(2) * (shape.radius + shape.radialExtent)).add(shape.localCenter)); // means the polygon fully encloses the a)rc
        points.push(vector.fromAngle(shape.angularExtent, shape.radius + shape.radialExtent).add(shape.localCenter));
        points.push(vector.fromAngle(shape.angularExtent, shape.radius - shape.radialExtent).add(shape.localCenter));
        return pl.Polygon(points);
    } else {
        throw "Unknown shape type";
    }
}

function posMod(num: number, max: number) {
    let mod = num % max;
    if (mod < 0) {
        mod += max;
    }
    return mod;
}

// A polygon's extent needs to be larger than a circle's radius for them to look the same size
export function calculateMaxExtentMultiplier(numPoints: number) {
    return 1 + (1 / numPoints);
}