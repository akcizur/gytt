import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ASSETS } from "./AssetRegistry.js";
import { CharacterController } from "./CharacterController.js";

const MOVE_DEAD=.08;
const LOOK_SPEED=4.8;
const LOOK_DEAD=.06;

export class Player{
  constructor(g){
    this.g=g; this.T=g.THREE; this.R=g.RAPIER;
    this.pos=new this.T.Vector3(0,0,10);
    this.vel=new this.T.Vector3();
    this.spawn=this.pos.clone();
    this.yaw=0; this.pitch=.22;
    this.grounded=true;
    this.driver=false;
    this.model=null;
    this.mixer=null;
    this.actions={};
    this.animationState="idle";
    this.current="";
    this.animationState="idle";
    this.wasGrounded=true;
    this.landUntil=0;
    this.ready=false;
    this.radius=.42;
    this.height=1.8;
    this.body=null;
    this.collider=null;
    this.controller=null;
    this.motor=null;
  }

  build(){
    this.mesh=new this.T.Group();
    this.g.world.scene.add(this.mesh);
    const capsule=new this.T.Mesh(
      new this.T.CapsuleGeometry(.36,.95,6,10),
      new this.T.MeshStandardMaterial({color:0x7aa18f,roughness:.8})
    );
    capsule.position.y=.95; capsule.visible=false;
    this.mesh.add(capsule);

    this.motor=new CharacterController(this.g,{x:0,y:0,z:10});
    this.motor.build();
    this.body=this.motor.body;
    this.collider=this.motor.collider;
    this.controller=this.motor.controller;
    this.sync();
    this.loadModel();
  }

  async loadModel(){
    try{
      // Use the Universal Animation Library character itself as the player.
      // Its mesh, skeleton and locomotion clips are from the same GLB, so
      // there is no runtime retargeting or skeleton mismatch.
      const gltf=await new GLTFLoader().loadAsync(ASSETS.hero);
      this.model=gltf.scene;
      this.model.traverse(o=>{
        if(o.isMesh){o.castShadow=true;o.receiveShadow=true}
      });

      const box=new this.T.Box3().setFromObject(this.model);
      const size=box.getSize(new this.T.Vector3());
      if(size.y>0)this.model.scale.setScalar(1.8/size.y);
      const scaled=new this.T.Box3().setFromObject(this.model);
      this.model.position.y=-scaled.min.y;
      this.mesh.clear();
      this.mesh.add(this.model);

      this.mixer=new this.T.AnimationMixer(this.model);
      for(const clip of gltf.animations){
        const key=this.key(clip.name);
        if(!this.actions[key])this.actions[key]=this.mixer.clipAction(clip);
      }
      this.ready=true;
      this.play("idle",true);
    }catch(error){
      console.warn("Player GLB unavailable",error);
    }
  }

  key(name){
    return String(name||"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
  }

  find(names){
    const keys=Object.keys(this.actions);
    for(const wanted of names){
      const exact=this.key(wanted);
      if(this.actions[exact])return this.actions[exact];
      const found=keys.find(k=>k.includes(exact));
      if(found)return this.actions[found];
    }
    return null;
  }

  play(state,force=false){
    if(!this.mixer)return;
    const map={
      idle:["idle_loop","idle","breathing"],
      walk:["walk_loop","walk"],
      run:["sprint_loop","jog_fwd_loop","run_loop","run"],
      jump:["jump_start","jump"],
      fall:["jump_loop","fall"],
      land:["jump_land","land"]
    };
    const action=this.find(map[state]||[state]);
    if(!action)return;
    if(!force&&this.current===state)return;
    const previous=this.current?this.actions[this.current]:null;
    if(previous&&previous!==action){
      action.reset().setEffectiveWeight(1);
      action.setEffectiveTimeScale(1);
      action.crossFadeFrom(previous,.14,true).play();
    }else{
        action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    }
    if(state==="land"){
      action.setLoop(this.T.LoopOnce,1);
      action.clampWhenFinished=true;
    }else{
      action.setLoop(this.T.LoopRepeat,Infinity);
      action.clampWhenFinished=false;
    }
    this.current=state;
  }

  axes(){
    const i=this.g.input;
    let x=i.axisX(), y=i.axisY();
    if(Math.hypot(x,y)<MOVE_DEAD){
      x=(i.down("KeyD")?1:0)-(i.down("KeyA")?1:0);
      y=(i.down("KeyW")?1:0)-(i.down("KeyS")?1:0);
    }
    const len=Math.hypot(x,y);
    if(len>1){x/=len;y/=len}
    return {x,y,magnitude:Math.min(1,len)};
  }

  update(dt){
    if(this.g.vehicle.driver){
      this.followVehicle(dt);
      if(this.mixer)this.mixer.update(dt);
      return;
    }

    const i=this.g.input;
    const motorState=this.motor.update(i,this.yaw,dt);
    const moving=motorState.moving;
    const sprint=motorState.sprint;
    this.vel.copy(motorState.velocity);
    this.pos.copy(this.motor.position);
    this.grounded=this.motor.grounded;

    this.mesh.position.copy(this.pos);

    const speed2=Math.hypot(this.vel.x,this.vel.z);
    const landed=!this.wasGrounded&&this.grounded;
    let animationState=!this.grounded
      ?(this.vel.y>0.15?"jump":"fall")
      :(speed2<.12?"idle":speed2<6.2?"walk":"run");
    if(landed&&this.find(["jump_land","land"])){
      animationState="land";
      this.landUntil=performance.now()+260;
    }else if(performance.now()<this.landUntil){
      animationState="land";
    }
    this.play(animationState);
    this.animationState=animationState;
    this.wasGrounded=this.grounded;

    // Synchronize locomotion animation speed with actual world velocity.
    // This keeps foot cadence tied to movement instead of keyboard state.
    const locomotion=this.actions[this.current];
    if(locomotion&&this.grounded&&(animationState==="walk"||animationState==="run")){
      const base=animationState==="run"?7.0:3.2;
      locomotion.setEffectiveTimeScale(
        Math.max(.55,Math.min(1.55,speed2/Math.max(.01,base)))
      );
    }

    if(moving){
      const targetYaw=Math.atan2(this.vel.x,this.vel.z);
      let d=targetYaw-this.mesh.rotation.y;
      while(d>Math.PI)d-=Math.PI*2;
      while(d<-Math.PI)d+=Math.PI*2;
      this.mesh.rotation.y+=d*Math.min(1,dt*14);
    }

    if(this.mixer)this.mixer.update(dt);
    this.updateCamera(dt);
  }

  updateCamera(dt){
    const T=this.T,c=this.g.world.camera,i=this.g.input;
    const target=this.pos.clone().add(new T.Vector3(0,1.05,0));
    const mouse=i.consumeMouseLook();

    if(i.lookActive && i.look.strength>LOOK_DEAD){
      const strength=Math.min(1,i.look.strength);
      this.yaw-=i.lookX()*LOOK_SPEED*(.55+.45*strength)*dt;
      this.pitch-=i.lookY()*LOOK_SPEED*(.55+.45*strength)*dt;
    }else if(Math.abs(mouse.x)+Math.abs(mouse.y)>0){
      this.yaw-=mouse.x*.003;
      this.pitch-=mouse.y*.0025;
    }
    this.pitch=Math.max(-.35,Math.min(.75,this.pitch));

    const desired=target.clone().add(new T.Vector3(
      Math.sin(this.yaw)*6.5,
      2.1+this.pitch*2.4,
      Math.cos(this.yaw)*6.5
    ));
    const safe=this.g.world.cameraPosition(target,desired,this.mesh,1);
    c.position.lerp(safe,.28);
    c.lookAt(target);
  }

  followVehicle(dt){
    const T=this.T,c=this.g.world.camera,i=this.g.input;
    const target=this.g.vehicle.pos.clone().add(new T.Vector3(0,1.35,0));
    const mouse=i.consumeMouseLook();
    if(i.lookActive && i.look.strength>LOOK_DEAD){
      const strength=Math.min(1,i.look.strength);
      this.yaw-=i.lookX()*LOOK_SPEED*(.55+.45*strength)*dt;
      this.pitch-=i.lookY()*LOOK_SPEED*(.55+.45*strength)*dt;
    }else if(Math.abs(mouse.x)+Math.abs(mouse.y)>0){
      this.yaw-=mouse.x*.003;
      this.pitch-=mouse.y*.0025;
    }
    this.pitch=Math.max(-.2,Math.min(.7,this.pitch));
    const desired=target.clone().add(new T.Vector3(
      Math.sin(this.yaw)*8,3+this.pitch*2,Math.cos(this.yaw)*8
    ));
    const safe=this.g.world.cameraPosition(target,desired,this.mesh,1.1);
    c.position.lerp(safe,.25); c.lookAt(target);
  }

  sync(){
    const t=this.body.translation();
    this.pos.set(t.x,t.y-1,t.z);
    this.mesh.position.copy(this.pos);
  }

  teleport(x,y,z){
    this.body.setTranslation({x,y:y+1,z},true);
    this.motor.position.set(x,y,z);
    this.motor.velocity.set(0,0,0);
    this.pos.set(x,y,z);
    this.mesh.position.copy(this.pos);
  }

  reset(){
    this.vel.set(0,0,0); this.yaw=0; this.pitch=.22;
    this.teleport(this.spawn.x,this.spawn.y,this.spawn.z);
    this.mesh.visible=true;
  }
}