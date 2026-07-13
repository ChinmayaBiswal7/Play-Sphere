// ==========================================
// RoadGenerator.js
// Apex Stars Engine V2
// Rebuild Foundation - Part 1
// ==========================================

class RoadGenerator {

    constructor(track) {

        this.track = track;

        this.roadWidth = 16;

        this.kerbWidth = 1.2;

        this.samples = 900;

        this.group = new THREE.Group();

    }

    //--------------------------------------------------

    build() {

        this.buildRoad();

        this.buildRoadLines();

        this.buildKerbs();

        this.buildGrid();

        this.buildStartFinish();

        return this.group;

    }

    //--------------------------------------------------

    getPoint(t) {

        return this.track.curve.getPointAt(t);

    }

    getTangent(t) {

        return this.track.curve.getTangentAt(t);

    }

    getNormal(t) {

        const tan = this.getTangent(t);

        const n = new THREE.Vector3(

            -tan.z,
            0,
            tan.x

        );

        if (n.lengthSq() < 0.00001) {

            n.set(1, 0, 0);

        }

        return n.normalize();

    }

    //--------------------------------------------------

    buildRoad() {

        const shape = [];

        shape.push(

            new THREE.Vector2(
                -this.roadWidth / 2,
                0
            )

        );

        shape.push(

            new THREE.Vector2(
                this.roadWidth / 2,
                0
            )

        );

        const roadShape = new THREE.Shape(shape);

        const geo = new THREE.ExtrudeGeometry(

            roadShape,

            {

                steps: this.samples,

                bevelEnabled: false,

                extrudePath: this.track.curve

            }

        );

        geo.computeVertexNormals();

        const asphalt = new THREE.Mesh(

            geo,

            new THREE.MeshStandardMaterial({

                color: 0x2b2b2b,

                roughness: .92,

                metalness: .02

            })

        );

        asphalt.receiveShadow = true;

        this.group.add(asphalt);

    }

    //--------------------------------------------------

    buildRoadLines() {

        this.createEdgeLine(

            this.roadWidth / 2 - .35

        );

        this.createEdgeLine(

            -this.roadWidth / 2 + .35

        );

    }

    //--------------------------------------------------

    createEdgeLine(offset) {

        const pts = [];

        for (let i = 0; i <= this.samples; i++) {

            const t = i / this.samples;

            pts.push(

                this.getPoint(t)

                .add(

                    this.getNormal(t)

                    .multiplyScalar(offset)

                )

            );

        }

        const curve = new THREE.CatmullRomCurve3(pts);

        const geo = new THREE.TubeGeometry(

            curve,

            this.samples,

            .08,

            6,

            true

        );

        const mesh = new THREE.Mesh(

            geo,

            new THREE.MeshBasicMaterial({

                color: 0xffffff

            })

        );

        this.group.add(mesh);

    }

    //--------------------------------------------------

    buildKerbs() {

        this.createKerb(

            this.roadWidth / 2 + .55

        );

        this.createKerb(

            -this.roadWidth / 2 - .55

        );

    }

    //--------------------------------------------------

    createKerb(offset) {

        const pts = [];

        for (let i = 0; i <= this.samples; i++) {

            const t = i / this.samples;

            pts.push(

                this.getPoint(t)

                .add(

                    this.getNormal(t)

                    .multiplyScalar(offset)

                )

            );

        }

        const curve = new THREE.CatmullRomCurve3(pts);

        const geo = new THREE.TubeGeometry(

            curve,

            this.samples,

            .55,

            10,

            true

        );

        const mat = new THREE.MeshStandardMaterial({

            color: 0xffffff

        });

        const mesh = new THREE.Mesh(

            geo,

            mat

        );

        this.group.add(mesh);

    }

    //--------------------------------------------------

    buildGrid() {

        for (let i = 0; i < 16; i++) {

            const t = .985 - (i * .006);

            const p = this.getPoint(t);

            const n = this.getNormal(t);

            const tan = this.getTangent(t);

            const left = i % 2 === 0;

            const box = new THREE.Mesh(

                new THREE.PlaneGeometry(

                    2.8,

                    1.1

                ),

                new THREE.MeshBasicMaterial({

                    color: 0xffffff,

                    side: THREE.DoubleSide

                })

            );

            box.rotation.x = -Math.PI / 2;

            box.position.copy(

                p.add(

                    n.multiplyScalar(

                        left ? -2.2 : 2.2

                    )

                )

            );

            box.lookAt(

                box.position.clone().add(tan)

            );

            box.rotateX(Math.PI / 2);

            this.group.add(box);

        }

    }

    //--------------------------------------------------

    buildStartFinish() {

        const p = this.getPoint(.99);

        const tan = this.getTangent(.99);

        const line = new THREE.Mesh(

            new THREE.PlaneGeometry(

                this.roadWidth,

                .5

            ),

            new THREE.MeshBasicMaterial({

                color: 0xffffff,

                side: THREE.DoubleSide

            })

        );

        line.rotation.x = -Math.PI / 2;

        line.position.copy(p);

        line.lookAt(

            p.clone().add(tan)

        );

        line.rotateX(Math.PI / 2);

        this.group.add(line);

    }

}
window.RoadGenerator = RoadGenerator;
