declare module "planck-js" {
    namespace PlanckJs {
        interface WorldDef {
            gravity?: Vec2;
            allowSleep?: boolean;
            warmStarting?: boolean;
            continuousPhysics?: boolean;
            subStepping?: boolean;
            blockSolve?: boolean;
            velocityIterations?: number;
            positionIterations?: number;
        }

        interface World {
            createBody(bodyDef: BodyDef): Body;
            destroyBody(body: Body): void;
            rayCast(from: Vec2, to: Vec2, callback: RayCastCallback): void;
            on(eventName: string, callback : any): void;
            step(timeSpan: number): void;
            getContactList(): Contact;
        }

        interface Body {
            createFixture(shape: Shape, fixtureDef: FixtureDef): Fixture;
            destroyFixture(fixture: Fixture): void;
            isBullet(): boolean;
            setBullet(bullet: boolean): void;
            getPosition(): Vec2;
            setPosition(pos: Vec2): void;
            getAngle(): number;
            setAngle(angle: number): void;
            getAngularVelocity(): number;
            setAngularVelocity(angularVelocity: number): void;
            getLinearVelocity(): Vec2;
            setLinearVelocity(velocity: Vec2): void;
            getLinearDamping(): number;
            setLinearDamping(damping: number): void;
            applyLinearImpulse(impulse: Vec2, center: Vec2, wake: boolean): void;
            applyForce(force: Vec2, center: Vec2, wake: boolean): void;
            getMass(): number;
            setMassData(massData: MassData): void;
            resetMassData(): void;
            getWorldPoint(vec: Vec2): Vec2;
            getWorldVector(vec: Vec2): Vec2;
            getUserData(): any;
            getFixtureList(): Fixture;
        }

        interface BodyDef {
            userData?: string;
            type?: string;
            position?: Vec2;
            angle?: number;
            linearVelocity?: Vec2;
            linearDamping?: number;
            angularDamping?: number;
            allowSleep?: boolean;
            bullet?: boolean;
        }

        interface MassData {
            mass: number;
            center: Vec2;
            I: number;
        }

        interface Fixture {
            getBody(): Body;
            getNext(): Fixture;
            getShape(): Shape;
            isSensor(): boolean;
            setSensor(sensor: boolean): void;
            getFilterGroupIndex(): number;
            getFilterCategoryBits(): number;
            getFilterMaskBits(): number;
            setFilterData(filter: Filter): void;
            shouldCollide(other: Fixture): boolean;
        }

        interface FixtureDef {
            filterCategoryBits?: number;
            filterMaskBits?: number;
            filterGroupIndex?: number;
            density?: number;
            restitution?: number;
            isSensor?: boolean;
        }

        interface Filter {
            categoryBits: number;
            maskBits: number;
            groupIndex: number;
        }

        type Shape = Circle | Polygon;

        interface Circle {
            m_type: "circle";
        }

        interface Polygon {
            m_type: "polygon";
        }

        interface Vec2 {
            x: number;
            y: number;
        }

        interface Contact {
            getNext(): Contact;
            isTouching(): boolean;
            getFixtureA(): Fixture;
            getFixtureB(): Fixture;
            getWorldManifold(): Manifold;
        }

        interface Manifold {
            points: Vec2[];
        }

        interface RayCastCallback {
            (fixture: Fixture, point: Vec2, normal: Vec2, fraction: number): number;
        }

        function Circle(radius: number): Circle;
        function Polygon(points: Vec2[]): Polygon;
        function Vec2(x: number, y: number): Vec2;
        function World(def?: WorldDef): World;
    }

    export = PlanckJs;
}