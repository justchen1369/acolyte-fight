declare module "planck-js" {
    namespace PlanckJs {
        interface World {
            createBody(bodyDef: BodyDef): Body;
            destroyBody(body: Body): void;
            on(eventName: string, callback : any): void;
            step(timeSpan: number): void;
            getContactList(): Contact;
        }

        interface Body {
            createFixture(polygon: Polygon, fixtureDef: FixtureDef): void;
            getPosition(): Vec2;
            setPosition(pos: Vec2): void;
            getAngle(): number;
            setAngle(angle: number): void;
            getLinearVelocity(): Vec2;
            setLinearVelocity(velocity: Vec2): void;
            setLinearDamping(damping: number): void;
            applyLinearImpulse(impulse: Vec2, center: Vec2, wake: boolean): void;
            applyForce(force: Vec2, center: Vec2, wake: boolean): void;
            setMassData(massData: MassData): void;
            resetMassData(): void;
            getWorldPoint(vec: Vec2): Vec2;
            getWorldVector(vec: Vec2): Vec2;
            getUserData(): any;
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
        }

        interface FixtureDef {
            filterCategoryBits?: number;
            filterMaskBits?: number;
            density?: number;
            restitution?: number;
        }

        interface Polygon {

        }

        interface Vec2 {
            x: number;
            y: number;

            add(vec: Vec2): void;
        }

        interface Contact {
            getNext(): Contact;
            isTouching(): boolean;
            getFixtureA(): Fixture;
            getFixtureB(): Fixture;
        }

        function Circle(radius: number): Polygon;
        function Vec2(x: number, y: number): Vec2;
        function World(): World;
    }

    export = PlanckJs;
}