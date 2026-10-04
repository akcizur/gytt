import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ASSETS } from "./AssetRegistry.js";

export class Vehicle{
  constructor(g){
    this.g=g;
    this.T=g.THREE;
    this.R=g.RAPIER;
    this.driver=false;
    this.speed=0;
    this.speedKmh=0;
    this.pos=new this.T.Vector3(0,0,0);
    this.heading=0;
  }

  build(){
    this.mesh=new this.T.Group();
    this.g.world.scene.add(this.mesh);
    this.body=this.g.world.world.createRigidBody(
      this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.45,0)
    );
    this.collider=this.g.world.world.createCollider(
      this.R.ColliderDesc.cuboid(1.05,.45,2.1),
      this.body
    );
    this.loadCar();
  }

  async loadCar(){
    try{
      const gltf=await new GLTFLoader().loadAsync(ASSETS.car("sedan"));
      const car=gltf.scene;
      car.traverse(o=>{
        if(o.isMesh){o.castShadow=true;o.receiveShadow=true}
      });
      const box=new this.T.Box3().setFromObject(car);
      const size=box.getSize(new this.T.Vector3());
      if(size.z>0)car.scale.setScalar(4.2/size.z);
      const scaled=new this.T.Box3().setFromObject(car);
      car.position.y=-scaled.min.y;
      this.mesh.clear();
      this.mesh.add(car);
      this.carModel=car;
    }catch(error){
      console.warn("Car asset unavailable; procedural fallback active",error);
      this.buildFallback();
    }
  }

  buildFallback(){
    if(this.mesh.children.length)return;
    const T=this.T;
    const car=new T.Mesh(
      new T.BoxGeometry(2.1,.65,4),
      new T.MeshStandardMaterial({color:0x9b1c24,metalness:.2,roughness:.5})
    );
    car.position.y=.65;
    car.castShadow=true;
    this.mesh.add(car);
  }

  toggleDriver(){
    const p=this.g.player;
    if(this.driver){
      this.driver=false;
      p.mesh.visible=true;
      const side=new this.T.Vector3(1.6,0,0).applyAxisAngle(
        new this.T.Vector3(0,1,0),
        this.heading
      );
      p.teleport(this.pos.x+side.x,1,this.pos.z+side.z);
      p.cameraYaw=this.heading;
      return;
    }

    if(p.pos.distanceTo(this.pos)<4){
      this.driver=true;
      p.mesh.visible=false;
      p.vel.set(0,0,0);
    }
  }


  update(dt){
    const i=this.g.input;

    if(i.pressed("KeyE"))this.toggleDriver();

    if(i.pressed("KeyR")){
      this.reset();
      this.g.player.reset();
      return;
    }

    if(this.driver){
      const move=i.axisY();
      const steer=i.axisX();

      const throttle=Math.abs(move)>.08
        ?move
        :(i.down("KeyW")?1:0)-(i.down("KeyS")?.65:0);

      const steering=Math.abs(steer)>.08
        ?steer
        :(i.down("KeyD")?1:0)-(i.down("KeyA")?1:0);

      this.speed+=(throttle*18-this.speed*1.6)*dt;
      if(Math.abs(throttle)<.05)this.speed*=Math.pow(.18,dt);
      this.speed=Math.max(-8,Math.min(30,this.speed));

      const steerFactor=Math.min(1,Math.abs(this.speed)/5);
      this.heading+=steering*steerFactor*(this.speed>=0?1:-1)*1.5*dt;

      this.pos.x+=Math.sin(this.heading)*this.speed*dt;
      this.pos.z+=Math.cos(this.heading)*this.speed*dt;
      this.pos.x=Math.max(-335,Math.min(335,this.pos.x));
      this.pos.z=Math.max(-335,Math.min(335,this.pos.z));
      this.body.setNextKinematicTranslation({
        x:this.pos.x,y:.45,z:this.pos.z
      });
    }else{
      this.speed*=Math.pow(.02,dt);
    }

    this.speedKmh=Math.abs(this.speed)*3.6;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y=this.heading;
  }

  reset(){
    this.driver=false;
    this.speed=0;
    this.pos.set(0,0,0);
    this.heading=0;
    if(this.body)this.body.setNextKinematicTranslation({x:0,y:.45,z:0});
    if(this.mesh){
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.y=0;
    }
  }
}