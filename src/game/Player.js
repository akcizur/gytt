import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ASSETS } from "./AssetRegistry.js";

export class Player{
  constructor(g){
    this.g=g;this.T=g.THREE;this.R=g.RAPIER;
    this.pos=new this.T.Vector3(0,0,10);this.vel=new this.T.Vector3();
    this.grounded=false;this.jumpSpeed=6.5;this.mixer=null;this.animations={};this.state="";
  }
  build(){
    const T=this.T;
    this.mesh=new T.Group();this.g.world.scene.add(this.mesh);
    const body=new T.Mesh(new T.CapsuleGeometry(.42,.9,6,10),new T.MeshStandardMaterial({color:0xdddddd}));
    body.position.y=1.05;body.castShadow=true;this.mesh.add(body);
    const head=new T.Mesh(new T.SphereGeometry(.28,12,8),new T.MeshStandardMaterial({color:0xb87955}));
    head.position.y=1.8;head.castShadow=true;this.mesh.add(head);
    this.body=this.g.world.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,1,10));
    this.collider=this.g.world.world.createCollider(this.R.ColliderDesc.capsule(.55,.42),this.body);
    this.controller=this.g.world.world.createCharacterController(.03);
    this.controller.enableAutostep(.45,.3,true);this.controller.enableSnapToGround(.2);
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.syncMesh();this.loadModel();
  }
  async loadModel(){
    try{
      const gltf=await new GLTFLoader().loadAsync(ASSETS.hero),model=gltf.scene;
      model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
      const box=new this.T.Box3().setFromObject(model),size=box.getSize(new this.T.Vector3());
      if(size.y>0)model.scale.setScalar(1.8/size.y);
      const scaled=new this.T.Box3().setFromObject(model);model.position.y=-scaled.min.y;
      this.mesh.clear();this.mesh.add(model);
      this.mixer=gltf.animations.length?new this.T.AnimationMixer(model):null;
      for(const clip of gltf.animations)this.animations[clip.name.toLowerCase()]=this.mixer.clipAction(clip);
      this.play("idle");
    }catch(e){console.warn("CC0 hero unavailable; procedural fallback active",e)}
  }
  play(wanted){
    if(!this.mixer)return;
    const keys=Object.keys(this.animations);
    const aliases=wanted==="run"?["run","jog","sprint","walk"]:wanted==="walk"?["walk","locomotion","idle"]:wanted==="idle"?["idle","stand"]:["jump","fall","idle"];
    const key=keys.find(k=>aliases.some(a=>k.includes(a)))||keys[0];
    if(!key||this.state===wanted)return;
    Object.values(this.animations).forEach(a=>a.fadeOut(.12));
    this.animations[key].reset().fadeIn(.12).play();this.state=wanted;
  }
  update(dt){
    if(this.g.vehicle.driver){this.followVehicle();if(this.mixer)this.mixer.update(dt);return}
    const i=this.g.input,T=this.T;
    let x=(i.down("KeyD")?1:0)-(i.down("KeyA")?1:0);
    let z=(i.down("KeyS")?1:0)-(i.down("KeyW")?1:0);
    const moving=Math.hypot(x,z)>0;
    if(moving){const n=Math.hypot(x,z);x/=n;z/=n}
    const sprint=i.down("ShiftLeft")||i.down("ShiftRight"),speed=sprint?9:5;
    // Camera-relative movement keeps WASD intuitive in third person.
    const yaw=Math.atan2(this.g.world.camera.position.x-this.pos.x,this.g.world.camera.position.z-this.pos.z);
    const wx=x*Math.cos(yaw)+z*Math.sin(yaw),wz=-x*Math.sin(yaw)+z*Math.cos(yaw);
    this.vel.x+=(wx*speed-this.vel.x)*Math.min(1,dt*12);
    this.vel.z+=(wz*speed-this.vel.z)*Math.min(1,dt*12);
    if(!moving){const drag=Math.pow(.02,dt);this.vel.x*=drag;this.vel.z*=drag}
    if(i.pressed("Space")&&this.grounded)this.vel.y=this.jumpSpeed;
    this.vel.y-=18*dt;
    this.controller.computeColliderMovement(this.collider,{x:this.vel.x*dt,y:this.vel.y*dt,z:this.vel.z*dt});
    const m=this.controller.computedMovement(),p=this.body.translation();
    this.body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});
    this.grounded=this.controller.computedGrounded();
    if(this.grounded&&this.vel.y<0)this.vel.y=0;
    this.syncMesh();
    const state=!this.grounded?(this.vel.y>0?"jump":"fall"):moving?(sprint?"run":"walk"):"idle";
    this.play(state);if(this.mixer)this.mixer.update(dt);
    if(moving)this.mesh.rotation.y=Math.atan2(this.vel.x,this.vel.z);
    this.updateCamera();
  }
  updateCamera(){
    const T=this.T,c=this.g.world.camera,target=this.pos.clone().add(new T.Vector3(0,1.2,0));
    const back=new T.Vector3(0,2.8,7).applyAxisAngle(new T.Vector3(0,1,0),this.mesh.rotation.y);
    c.position.lerp(target.clone().add(back),.14);c.lookAt(target);
  }
  followVehicle(){
    const T=this.T,v=this.g.vehicle,c=this.g.world.camera,target=v.pos.clone().add(new T.Vector3(0,1.4,0));
    const back=new T.Vector3(0,3.1,8).applyAxisAngle(new T.Vector3(0,1,0),v.heading);
    c.position.lerp(target.clone().add(back),.18);c.lookAt(target);
  }
  syncMesh(){const t=this.body.translation();this.pos.set(t.x,t.y-1,t.z);this.mesh.position.copy(this.pos)}
  reset(){this.body.setNextKinematicTranslation({x:0,y:1,z:10});this.vel.set(0,0,0);this.grounded=false;this.syncMesh();this.mesh.visible=true;this.mesh.rotation.y=0}
}