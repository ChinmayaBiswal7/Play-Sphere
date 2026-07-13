// ==========================================
// EnvironmentManager.js
// Apex Stars F1 Engine V2
// Rebuild Foundation - Part 1A
// ==========================================

class EnvironmentManager {

    constructor(scene, trackData) {

        this.scene = scene;
        this.track = trackData;

        this.groups = {

            terrain: new THREE.Group(),
            road: new THREE.Group(),
            kerbs: new THREE.Group(),
            runoff: new THREE.Group(),
            barriers: new THREE.Group(),
            fences: new THREE.Group(),
            pitlane: new THREE.Group(),
            pitBuilding: new THREE.Group(),
            grandstands: new THREE.Group(),
            props: new THREE.Group(),
            trees: new THREE.Group(),
            lights: new THREE.Group(),
            crowd: new THREE.Group(),
            sky: new THREE.Group()

        };

        this.spawnedObjects = [];

        this.settings = {

            roadWidth: 16,
            kerbWidth: 1.2,
            runoffWidth: 5,
            barrierOffset: 11,
            fenceOffset: 14,
            treeOffset: 26,
            buildingOffset: 42,
            mountainOffset: 180,

            minTreeSpacing: 8,
            minBuildingSpacing: 25,
            minPropSpacing: 4,

            roadSamples: 600

        };

    }

    //====================================
    // Build Whole Environment
    //====================================

    build() {

        console.log("Building Environment...");

        this.addGroups();

        this.buildTerrain();

        this.buildRoad();

        this.buildKerbs();

        this.buildRunoff();

        this.buildBarriers();

        this.buildFences();

        this.buildPitLane();

        this.buildPitBuilding();

        this.buildGrandstands();

        this.buildTrees();

        this.buildProps();

        this.buildLighting();

        console.log("Environment Complete");

    }

    //====================================
    // Scene Groups
    //====================================

    addGroups(){

        Object.values(this.groups).forEach(group=>{

            this.scene.add(group);

        });

    }

    //====================================
    // Helpers
    //====================================

    getPoint(t){

        return this.track.curve.getPointAt(t);

    }

    getTangent(t){

        return this.track.curve.getTangentAt(t);

    }

    getNormal(t){

        const tangent=this.getTangent(t);

        const normal=new THREE.Vector3(

            -tangent.z,
            0,
            tangent.x

        );

        if(normal.lengthSq()<0.0001){

            normal.set(1,0,0);

        }

        return normal.normalize();

    }

    //====================================
    // Returns world position beside road
    //====================================

    getOffsetPoint(t,offset){

        const p=this.getPoint(t);

        const n=this.getNormal(t);

        return p.clone().add(

            n.multiplyScalar(offset)

        );

    }

    //====================================
    // Checks if point is too close to road
    //====================================

    isNearRoad(position){

        let nearest=999999;

        for(let i=0;i<this.settings.roadSamples;i++){

            const t=i/this.settings.roadSamples;

            const p=this.getPoint(t);

            const d=p.distanceTo(position);

            if(d<nearest){

                nearest=d;

            }

        }

        return nearest<22;

    }

    //====================================
    // Prevent props overlapping
    //====================================

    canSpawn(position,minDistance){

        if(this.isNearRoad(position))
            return false;

        for(const obj of this.spawnedObjects){

            if(obj.position.distanceTo(position)<minDistance)
                return false;

        }

        return true;

    }

    register(object){

        this.spawnedObjects.push(object);

    }

    //==================================================
    // TERRAIN GENERATION (Part 1A.2)
    //==================================================

    buildTerrain(){

        const terrain = this.createTerrain();
        this.groups.terrain.add(terrain);

        const beach = this.createBeach();
        this.groups.terrain.add(beach);

        const ocean = this.createOcean();
        this.groups.terrain.add(ocean);

    }

    //----------------------------------------------------
    // Main Terrain
    //----------------------------------------------------

    createTerrain(){

        const size = 3500;
        const segments = 250;

        const geo = new THREE.PlaneGeometry(
            size,
            size,
            segments,
            segments
        );

        const pos = geo.attributes.position;

        for(let i=0;i<pos.count;i++){

            const x = pos.getX(i);
            const y = pos.getY(i);

            let h = 0;

            // Large rolling hills
            h += Math.sin(x*0.0025)*10;
            h += Math.cos(y*0.0020)*8;

            // Medium hills
            h += Math.sin((x+y)*0.0035)*5;

            // Small bumps
            h += Math.sin(x*0.020)*0.7;
            h += Math.cos(y*0.017)*0.6;

            // Keep centre flatter where the track is
            const d = Math.sqrt(x*x+y*y);

            if(d<350){

                h*=0.15;

            }else if(d<600){

                h*=0.45;

            }

            pos.setZ(i,h);

        }

        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({

            color:0x2f8f3d,

            roughness:1,

            metalness:0

        });

        const mesh = new THREE.Mesh(
            geo,
            mat
        );

        mesh.rotation.x=-Math.PI/2;

        mesh.receiveShadow=true;

        return mesh;

    }

    //----------------------------------------------------
    // Beach Ring
    //----------------------------------------------------

    createBeach(){

        const geo = new THREE.RingGeometry(
            1200,
            1500,
            128
        );

        const mat = new THREE.MeshStandardMaterial({

            color:0xd9c38a,

            roughness:1

        });

        const beach = new THREE.Mesh(
            geo,
            mat
        );

        beach.rotation.x=-Math.PI/2;

        beach.position.y=0.02;

        return beach;

    }

    //----------------------------------------------------
    // Ocean
    //----------------------------------------------------

    createOcean(){

        const geo = new THREE.CircleGeometry(
            2200,
            128
        );

        const mat = new THREE.MeshPhysicalMaterial({

            color:0x2ea8ff,

            roughness:0.12,

            metalness:0,

            transparent:true,

            opacity:0.95

        });

        const ocean = new THREE.Mesh(
            geo,
            mat
        );

        ocean.rotation.x=-Math.PI/2;

        ocean.position.y=-0.2;

        ocean.receiveShadow=true;

        return ocean;

    }

    //----------------------------------------------------
    // Ocean Animation
    //----------------------------------------------------

    updateTerrain(time){

        const ocean = this.groups.terrain.children.find(
            m=>m.geometry instanceof THREE.CircleGeometry
        );

        if(!ocean) return;

        ocean.material.color.offsetHSL(
            Math.sin(time*0.0002)*0.0002,
            0,
            0
        );

    }

    // ==================================================
    // SCENERY GENERATION (Part 1A.3)
    // ==================================================

    buildProps(){

        this.spawnPalmTrees();

        this.spawnHotels();

        this.spawnRocks();

        this.spawnFlowers();

    }

    //----------------------------------------------------
    // Palm Trees
    //----------------------------------------------------

    spawnPalmTrees(){

        const trunkMat=new THREE.MeshStandardMaterial({
            color:0x6b4423
        });

        const leafMat=new THREE.MeshStandardMaterial({
            color:0x2fa54a
        });

        let count=0;

        while(count<350){

            const x=Math.random()*2800-1400;
            const z=Math.random()*2800-1400;

            const pos=new THREE.Vector3(x,0,z);

            if(!this.canSpawn(pos,8))
                continue;

            const tree=new THREE.Group();

            const trunk=new THREE.Mesh(

                new THREE.CylinderGeometry(
                    .35,
                    .55,
                    7,
                    8
                ),

                trunkMat

            );

            trunk.position.y=3.5;

            tree.add(trunk);

            for(let i=0;i<8;i++){

                const leaf=new THREE.Mesh(

                    new THREE.ConeGeometry(
                        2.5,
                        5,
                        6
                    ),

                    leafMat

                );

                leaf.position.y=7;

                leaf.rotation.z=Math.PI/3;

                leaf.rotation.y=i*Math.PI/4;

                tree.add(leaf);

            }

            tree.position.copy(pos);

            tree.rotation.y=Math.random()*Math.PI*2;

            this.groups.trees.add(tree);

            this.register(tree);

            count++;

        }

    }

    //----------------------------------------------------
    // Hotels
    //----------------------------------------------------

    spawnHotels(){

        const mat=new THREE.MeshStandardMaterial({

            color:0xf2f2f2

        });

        let built=0;

        while(built<15){

            const x=Math.random()*2500-1250;
            const z=Math.random()*2500-1250;

            const pos=new THREE.Vector3(x,0,z);

            if(!this.canSpawn(pos,60))
                continue;

            const hotel=new THREE.Mesh(

                new THREE.BoxGeometry(

                    25,

                    18+Math.random()*20,

                    25

                ),

                mat

            );

            hotel.position.copy(pos);

            hotel.position.y=hotel.geometry.parameters.height/2;

            this.groups.props.add(hotel);

            this.register(hotel);

            built++;

        }

    }

    //----------------------------------------------------
    // Rocks
    //----------------------------------------------------

    spawnRocks(){

        const rockMat=new THREE.MeshStandardMaterial({

            color:0x777777,

            roughness:1

        });

        let rocks=0;

        while(rocks<180){

            const x=Math.random()*2800-1400;
            const z=Math.random()*2800-1400;

            const pos=new THREE.Vector3(x,0,z);

            if(!this.canSpawn(pos,5))
                continue;

            const rock=new THREE.Mesh(

                new THREE.DodecahedronGeometry(

                    .8+Math.random()*2

                ),

                rockMat

            );

            rock.position.copy(pos);

            rock.rotation.set(

                Math.random()*5,

                Math.random()*5,

                Math.random()*5

            );

            this.groups.props.add(rock);

            this.register(rock);

            rocks++;

        }

    }

    //----------------------------------------------------
    // Flowers
    //----------------------------------------------------

    spawnFlowers(){

        const colors=[

            0xff3366,

            0xffff00,

            0xffffff,

            0xff66ff

        ];

        let flowers=0;

        while(flowers<700){

            const x=Math.random()*2600-1300;
            const z=Math.random()*2600-1300;

            const pos=new THREE.Vector3(x,0,z);

            if(!this.canSpawn(pos,2))
                continue;

            const flower=new THREE.Mesh(

                new THREE.SphereGeometry(.12,6,6),

                new THREE.MeshStandardMaterial({

                    color:colors[

                        Math.floor(

                            Math.random()*colors.length

                        )

                    ]

                })

            );

            flower.position.copy(pos);

            flower.position.y=.1;

            this.groups.props.add(flower);

            flowers++;

        }

    }

    //----------------------------------------------------
    // Automatic Cleanup / Culling
    //----------------------------------------------------

    update(camera){

        const camPos=camera.position;

        this.spawnedObjects.forEach(obj=>{

            const d=obj.position.distanceTo(camPos);

            obj.visible=d<350;

        });

    }

    //=====================================================
    // CONTINUOUS ARMCO BARRIER (Part 1A.4)
    //=====================================================

    buildBarriers(){

        const roadWidth = this.settings.roadWidth;

        this.createBarrierSide(-(roadWidth/2+6));
        this.createBarrierSide( roadWidth/2+6);

    }

    createBarrierSide(offset){

        const group = this.groups.barriers;

        const steel = new THREE.MeshStandardMaterial({

            color:0xb8bcc4,

            metalness:.75,

            roughness:.25

        });

        const postMaterial = new THREE.MeshStandardMaterial({

            color:0x555555

        });

        const samples = 700;

        let previous = null;

        for(let i=0;i<=samples;i++){

            const t=i/samples;

            // Leave opening for pit lane

            if(this.isPitGap(t)){

                previous=null;

                continue;

            }

            const p=this.getOffsetPoint(t,offset);

            if(previous){

                const dir=new THREE.Vector3()

                    .subVectors(p,previous);

                const length=dir.length();

                //--------------------------------
                // Rail 1
                //--------------------------------

                for(let h=0;h<3;h++){

                    const rail=new THREE.Mesh(

                        new THREE.BoxGeometry(
                            length,
                            .16,
                            .12
                        ),

                        steel

                    );

                    rail.position.copy(

                        previous.clone().add(p).multiplyScalar(.5)

                    );

                    rail.position.y=.55+h*.22;

                    rail.lookAt(p);

                    rail.rotateY(Math.PI/2);

                    group.add(rail);

                }

            }

            //----------------------------------
            // Vertical Post
            //----------------------------------

            const post=new THREE.Mesh(

                new THREE.BoxGeometry(
                    .14,
                    1.2,
                    .14
                ),

                postMaterial

            );

            post.position.copy(p);

            post.position.y=.6;

            group.add(post);

            previous=p;

        }

    }

    //----------------------------------------------------
    // Pit Lane Opening
    //----------------------------------------------------

    isPitGap(t){

        if(
            t>0.945 &&
            t<0.985
        ) return true;

        if(
            t>0.045 &&
            t<0.070
        ) return true;

        return false;

    }

    //=====================================================
    // Catch Fence
    //=====================================================

    buildFences(){

        const offset=this.settings.roadWidth/2+8;

        this.buildFenceSide(offset);

        this.buildFenceSide(-offset);

    }

    buildFenceSide(offset){

        const samples=400;

        const mat=new THREE.MeshStandardMaterial({

            color:0x777777

        });

        for(let i=0;i<samples;i++){

            const t=i/samples;

            if(this.isPitGap(t))
                continue;

            const p=this.getOffsetPoint(t,offset);

            //---------------------------------

            const pole=new THREE.Mesh(

                new THREE.CylinderGeometry(

                    .06,.06,3

                ),

                mat

            );

            pole.position.copy(p);

            pole.position.y=1.5;

            this.groups.fences.add(pole);

        }

    }

    //=====================================================
    // TecPro Barrier
    //=====================================================

    createTecPro(position){

        const group=new THREE.Group();

        const mat=new THREE.MeshStandardMaterial({

            color:0xffaa00

        });

        for(let i=0;i<8;i++){

            const block=new THREE.Mesh(

                new THREE.BoxGeometry(

                    1.2,

                    1,

                    .8

                ),

                mat

            );

            block.position.x=i*1.2;

            group.add(block);

        }

        group.position.copy(position);

        this.groups.barriers.add(group);

    }

    //=====================================================
    // Tire Wall
    //=====================================================

    createTyreWall(position){

        const group=new THREE.Group();

        const tyreMat=new THREE.MeshStandardMaterial({

            color:0x111111

        });

        for(let r=0;r<4;r++){

            for(let c=0;c<8;c++){

                const tyre=new THREE.Mesh(

                    new THREE.TorusGeometry(

                        .45,

                        .12,

                        10,

                        18

                    ),

                    tyreMat

                );

                tyre.rotation.y=Math.PI/2;

                tyre.position.set(

                    c*.9,

                    r*.5,

                    0

                );

                group.add(tyre);

            }

        }

        group.position.copy(position);

        this.groups.barriers.add(group);

    }

    //====================================
    // Empty methods (implemented later)
    //====================================

    buildRoad(){}
    buildKerbs(){}
    buildRunoff(){}
    buildPitLane(){}
    buildPitBuilding(){}
    buildGrandstands(){}
    buildTrees(){}
    buildLighting(){}

}
window.EnvironmentManager = EnvironmentManager;
