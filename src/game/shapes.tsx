import _ from 'lodash';
import pl from 'planck-js';
import * as vector from './vector';

export type Shape =
    Circle
    | Symmetrical
    | Polygon

export interface Circle {
    type: "circle";
    radius: number;
}

export interface Symmetrical {
    type: "symmetrical";
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

export function createCircle(radius: number): Circle {
    return { type: "circle", radius };
}

export function createSymmetrical(numPoints: number, extent: number): Symmetrical {
    const points = new Array<pl.Vec2>();
    for (let i = 0; i < numPoints; ++i) {
        const point = vector.multiply(vector.fromAngle((i / numPoints) * (2 * Math.PI)), extent);
        points.push(point);
    }
    return { type: "symmetrical", points, extent };
}

// points must be specified clockwise
export function createPolygon(points: pl.Vec2[]): Polygon {
    const distances = points.map(p => vector.length(p));

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

    return {
        type: "polygon",
        points,
        normals,
        minExtent: _.min(distances) || 0,
        maxExtent: _.max(distances) || 0,
    };
}

export function getMinExtent(shape: Shape) {
    switch (shape.type) {
        case "circle": return shape.radius;
        case "symmetrical": return shape.extent;
        case "polygon": return shape.minExtent;
        default: return 0;
    }
}

export function getMaxExtent(shape: Shape) {
    switch (shape.type) {
        case "circle": return shape.radius;
        case "symmetrical": return shape.extent;
        case "polygon": return shape.maxExtent;
        default: return 0;
    }
}

export function grow(shape: Shape, amount: number): Shape {
    if (shape.type === "circle") {
        return {
            type: "circle",
            radius: shape.radius + amount,
        };
    } else if (shape.type === "symmetrical") {
        const multiplier = 1 + amount / shape.extent;
        return {
            type: "symmetrical",
            points: shape.points.map(p => vector.multiply(p, multiplier)),
            extent: shape.extent * multiplier,
        };
    } else if (shape.type === "polygon") {
        const newPoints = new Array<pl.Vec2>();
        for (let i = 0; i < shape.points.length; ++i) {
            newPoints.push(vector.plus(shape.points[i], vector.multiply(shape.normals[i], amount)));
        }
        return {
            type: "polygon",
            points: newPoints,
            normals: shape.normals,
            minExtent: shape.minExtent + amount,
            maxExtent: shape.maxExtent + amount,
        };
    } else {
        throw "Unknown shape type";
    }
}

export function closestExtreme(shape: Shape, pos: pl.Vec2, angle: number, target: pl.Vec2) {
    if (shape.type === "circle") {
        return vector.towards(pos, target, shape.radius);
    } else if (shape.type === "symmetrical") {
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

export function inside(shape: Shape, pos: pl.Vec2, angle: number, target: pl.Vec2, targetRadius: number = 0) {
    let worldPoint = target;
    if (targetRadius > 0) {
        worldPoint = vector.towards(target, pos, targetRadius);
    }

    const localPoint = toLocalCoords(pos, angle, worldPoint);
    return insideLocal(shape, localPoint);
}

function insideLocal(shape: Shape, localPoint: pl.Vec2): boolean {
    if (shape.type === "circle") {
        return vector.length(localPoint) <= shape.radius;
    } else if (shape.type === "symmetrical") {
        // This is not 100% correct but close enough for our purposes
        return vector.length(localPoint) <= shape.extent;
    } else if (shape.type === "polygon") {
        const length = vector.length(localPoint);
        if (length > shape.maxExtent) {
            return false;
        } else if (length <= shape.minExtent) {
            return true;
        } else {
            for (let i = 0; i < shape.points.length; ++i) {
                const point = shape.points[i];
                const next = shape.points[(i + 1) % shape.points.length];

                const outside = vector.rotateLeft(vector.unit(vector.diff(next, point)));
                const distanceToEdge = vector.dot(point, outside);
                const distanceToTarget = vector.dot(localPoint, outside);
                if (distanceToTarget > distanceToEdge) {
                    return false;
                }
            }
            return true;
        }
    } else {
        return false;
    }
}

function toLocalCoords(pos: pl.Vec2, angle: number, worldPoint: pl.Vec2) {
    return vector.turnVectorBy(vector.diff(worldPoint, pos), -angle);
}

function toWorldCoords(pos: pl.Vec2, angle: number, localPoint: pl.Vec2) {
    return vector.plus(pos, vector.turnVectorBy(localPoint, angle));
}

export function shapeToPlanck(shape: Shape): pl.Shape {
    if (shape.type === "circle") {
        return pl.Circle(shape.radius);
    } else if (shape.type === "symmetrical" || shape.type === "polygon") {
        return pl.Polygon(shape.points);
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