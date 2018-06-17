declare module "planck-js" {
    namespace PlanckJs {
        interface World {
            createBody(bodyDef: BodyDef): Body;
            destroyBody(body: Body);
            on(eventName: string, callback : any);
            step(timeSpan: number);
        }

        interface Body {
            createFixture(polygon: Polygon, fixtureDef: FixtureDef);
            getPosition(): Vec2;
            setPosition(pos: Vec2);
            getLinearVelocity(): Vec2;
            setLinearVelocity(velocity: Vec2);
            setLinearDamping(damping: number);
            applyLinearImpulse(impulse: Vec2, center: Vec2, unknown?: boolean);
            setMassData(massData: MassData);
            resetMassData();
        }

        interface BodyDef {

        }

        interface MassData {
            mass: number;
            center: Vec2;
            I: number;
        }

        interface Fixture {

        }

        interface FixtureDef {

        }

        interface Polygon {

        }

        interface Vec2 {
            x: number;
            y: number;
        }

        function Circle(radius: number): Polygon;
        function Vec2(x: number, y: number): Vec2;
        function World(): World;
    }

    export = PlanckJs;
}