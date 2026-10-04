import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { retargetClip } from "three/addons/utils/SkeletonUtils.js";
import { ASSETS } from "./AssetRegistry.js";

const MOVE_DEAD_ZONE=.08;
const CAMERA_SENSITIVITY=2.8;

export class Player{
  constructor(g){
    this.g=g;
    this.T=g.THREE;
    this.R=g.RAPIER;
    this.pos=new this.T.Vector3(0,0,10);
    this.spawn=new this.T.Vector3(0,0,10);
    this.vel=new this.T.Vector3();
    this.grounded=false;
    this.jumpSpeed=6.5;
    this.moveBlend=0;
    this.mixer=null;
    this.animations={};
    this.state="";
    this.animationPromise=null;
    this.extendedAnimationPromise=null;
    this.extendedAnimationsRequested=false;
    this.cameraYaw=0;
    this.cameraPitch=.28;
    this.cameraReady=false;
  }

  build(){
    const T=this.T;
    this.mesh=new T.Group();
    this.g.world.scene.add(this.mesh);

    const body=new T.Mesh(
      new T.CapsuleGeometry(.42,.9,6,10),
      new T.MeshStandardMaterial({color:0xdddddd})
    );
    body.position.y=1.05;
    body.castShadow=true;
    this.mesh.add(body);

    const head=new T.Mesh(
      new T.SphereGeometry(.28,12,8),
      new T.MeshStandardMaterial({color:0xb87955})
    );
    head.position.y=1.8;
    head.castShadow=true;
    this.mesh.add(head);

    this.body=this.g.world.world.createRigidBody(
      this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,1,10)
    );
    this.collider=this.g.world.world.createCollider(
      this.R.ColliderDesc.capsule(.55,.42),
      this.body
    );

    this.controller=this.g.world.world.createCharacterController(.03);
    this.controller.enableAutostep(.45,.3,true);
    this.controller.enableSnapToGround(.2);
    this.controller.setMaxSlopeClimbAngle(Math.PI*.72);
    this.controller.setApplyImpulsesToDynamicBodies(true);

    this.syncMesh();
    this.loadModel();
  }

  async loadModel(){
    try{
      const gltf=await new GLTFLoader().loadAsync(ASSETS.hero);
      const model=gltf.scene;
      model.traverse(o=>{
        if(o.isMesh){o.castShadow=true;o.receiveShadow=true}
      });

      const box=new this.T.Box3().setFromObject(model);
      const size=box.getSize(new this.T.Vector3());
      if(size.y>0)model.scale.setScalar(1.8/size.y);

      const scaled=new this.T.Box3().setFromObject(model);
      model.position.y=-scaled.min.y;

      this.mesh.clear();
      this.mesh.add(model);
      this.mesh.userData.model=model;
      model.userData.baseY=model.position.y;

      this.mixer=new this.T.AnimationMixer(model);
      for(const clip of gltf.animations){
        const key=this.normalizeAnimationName(clip.name);
        this.animations[key]=this.mixer.clipAction(clip);
      }

      this.cameraYaw=this.mesh.rotation.y;
      this.cameraReady=true;
      this.play("idle");
      void this.loadAnimationLibrary();
    }catch(error){
      console.warn("CC0 hero unavailable; procedural fallback active",error);
    }
  }

  normalizeAnimationName(name){
    return String(name||"animation")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,"_")
      .replace(/^_|_$/g,"");
  }

  async loadAnimationLibrary(){
    if(this.animationPromise)return this.animationPromise;
    this.animationPromise=this.loadAnimationPack(ASSETS.animationPacks?.locomotion);
    return this.animationPromise;
  }

  async loadExtendedAnimations(){
    if(this.extendedAnimationPromise)return this.extendedAnimationPromise;
    this.extendedAnimationPromise=this.loadAnimationPack(ASSETS.animationPacks?.extended);
    return this.extendedAnimationPromise;
  }

  async loadAnimationPack(url){
    if(!url)return;
    try{
      const gltf=await new GLTFLoader().loadAsync(url);
      let sourceMesh=null;
      this.traverseFirstSkinned(gltf.scene,result=>{if(!sourceMesh)sourceMesh=result});
      let targetMesh=null;
      this.traverseFirstSkinned(this.mesh,result=>{if(!targetMesh)targetMesh=result});

      if(!sourceMesh||!targetMesh||!this.mixer)return;

      for(const clip of gltf.animations){
        try{
          const key=this.normalizeAnimationName(clip.name);
          if(this.animations[key])continue;
          const retargeted=retargetClip(
            targetMesh,
            sourceMesh,
            clip,
            {useFirstFramePosition:true}
          );
          this.animations[key]=this.mixer.clipAction(retargeted);
        }catch(error){
          console.warn("Animation skipped",clip.name,error);
        }
      }
      this.play(this.state||"idle",true);
    }catch(error){
      console.warn("Open animation pack unavailable",url,error);
    }
  }

  traverseFirstSkinned(root,callback){
    root?.traverse(object=>{
      if(object.isSkinnedMesh)callback(object);
    });
  }

  play(wanted,force=false){
    if(!this.mixer)return;
    const keys=Object.keys(this.animations);
    if((wanted==="jump"||wanted==="fall")&&!this.extendedAnimationsRequested){
      this.extendedAnimationsRequested=true;
      void this.loadExtendedAnimations();
    }
    if(!keys.length)return;

    const aliases={
      idle:["idle","stand","breathing","relaxed"],
      walk:["walk","locomotion","jog_fwd","jog"],
      run:["run","sprint","jog","fast","jog_fwd"],
      jump:["jump","jump_up","takeoff"],
      fall:["fall","air","falling","jump"],
      land:["land","landing","idle"]
    };

    const key=keys.find(name=>(aliases[wanted]||[wanted]).some(alias=>name.includes(alias)))||keys[0];
    if(!force&&this.state===wanted&&this.activeAnimationKey===key)return;

    Object.entries(this.animations).forEach(([name,action])=>{
      if(name!==key)action.fadeOut(.14);
    });

    this.animations[key].reset().fadeIn(.14).play();
    this.activeAnimationKey=key;
    this.state=wanted;
  }

  getMoveAxes(){
    const i=this.g.input;
    let x=i.axisX();
    let y=i.axisY();

    if(Math.hypot(x,y)<MOVE_DEAD_ZONE){
      x=(i.down("KeyD")?1:0)-(i.down("KeyA")?1:0);
      y=(i.down("KeyW")?1:0)-(i.down("KeyS")?1:0);
    }

    return {
      x,
      y,
      magnitude:Math.min(1,Math.hypot(x,y))
    };
  }

  update(dt){
    if(this.g.vehicle.driver){
      this.followVehicle(dt);
      if(this.mixer)this.mixer.update(dt);
      return;
    }

    const i=this.g.input;
    const axes=this.getMoveAxes();
    const moving=axes.magnitude>MOVE_DEAD_ZONE;
    const analogMagnitude=moving
      ?Math.min(1,(axes.magnitude-MOVE_DEAD_ZONE)/(1-MOVE_DEAD_ZONE))
      :0;
    this.moveBlend+=(analogMagnitude-this.moveBlend)*Math.min(1,dt*10);

    let x=axes.x;
    let z=-axes.y;
    if(moving){
      const n=Math.hypot(x,z);
      x/=n;
      z/=n;
    }

    const sprint=i.down("ShiftLeft")||i.down("ShiftRight");
    const speed=(sprint?9:5)*analogMagnitude;

    const yaw=this.cameraYaw;
    const wx=x*Math.cos(yaw)+z*Math.sin(yaw);
    const wz=-x*Math.sin(yaw)+z*Math.cos(yaw);

    this.vel.x+=(wx*speed-this.vel.x)*Math.min(1,dt*12);
    this.vel.z+=(wz*speed-this.vel.z)*Math.min(1,dt*12);

    if(!moving){
      const drag=Math.pow(.02,dt);
      this.vel.x*=drag;
      this.vel.z*=drag;
    }

    if(i.pressed("Space")&&this.grounded)this.vel.y=this.jumpSpeed;
    this.vel.y-=18*dt;

    this.controller.computeColliderMovement(this.collider,{
      x:this.vel.x*dt,
      y:this.vel.y*dt,
      z:this.vel.z*dt
    });

    const movement=this.controller.computedMovement();
    const p=this.body.translation();
    const next={
      x:p.x+movement.x,
      y:p.y+movement.y,
      z:p.z+movement.z
    };

    this.body.setNextKinematicTranslation(next);
    this.pos.set(next.x,next.y-1,next.z);
    this.mesh.position.copy(this.pos);

    this.grounded=this.controller.computedGrounded();
    if(this.grounded&&this.vel.y<0)this.vel.y=0;

    const state=!this.grounded
      ?(this.vel.y>0?"jump":"fall")
      :(moving?(sprint?"run":"walk"):"idle");
    this.play(state);

    if(this.mixer)this.mixer.update(dt);

    if(moving){
      const targetYaw=Math.atan2(this.vel.x,this.vel.z);
      let delta=targetYaw-this.mesh.rotation.y;
      while(delta>Math.PI)delta-=Math.PI*2;
      while(delta<-Math.PI)delta+=Math.PI*2;
      this.mesh.rotation.y+=delta*Math.min(1,dt*14);
    }

    if(this.mesh.userData.model&&!this.mixer){
      const model=this.mesh.userData.model;
      const phase=performance.now()*.012;
      const bob=moving?Math.abs(Math.sin(phase*1.7))*.035:0;
      model.position.y=model.userData.baseY+bob;
      model.rotation.x=(moving?.025:0);
    }

    this.updateCamera(dt);
  }

  updateCamera(dt){
    const T=this.T;
    const c=this.g.world.camera;
    const target=this.pos.clone().add(new T.Vector3(0,1.2,0));
    const input=this.g.input;

    if(!this.cameraReady){
      this.cameraYaw=this.mesh.rotation.y;
      this.cameraReady=true;
    }

    if(input.touchActive){
      this.cameraYaw-=input.lookX()*CAMERA_SENSITIVITY*dt;
      this.cameraPitch-=input.lookY()*CAMERA_SENSITIVITY*dt;
      this.cameraPitch=Math.max(-.22,Math.min(.82,this.cameraPitch));
    }else{
      const targetYaw=this.mesh.rotation.y;
      let delta=targetYaw-this.cameraYaw;
      while(delta>Math.PI)delta-=Math.PI*2;
      while(delta<-Math.PI)delta+=Math.PI*2;
      this.cameraYaw+=delta*Math.min(1,dt*1.5);
    }

    const offset=new T.Vector3(
      Math.sin(this.cameraYaw)*7,
      2.8+Math.sin(this.cameraPitch)*2.3,
      Math.cos(this.cameraYaw)*7
    );

    c.position.lerp(target.clone().add(offset),.14);
    c.lookAt(target);
  }

  followVehicle(dt){
    const T=this.T;
    const v=this.g.vehicle;
    const c=this.g.world.camera;
    const input=this.g.input;
    const target=v.pos.clone().add(new T.Vector3(0,1.4,0));

    if(input.look.strength>0){
      this.cameraYaw-=input.lookX()*CAMERA_SENSITIVITY*dt;
      this.cameraPitch-=input.lookY()*CAMERA_SENSITIVITY*dt;
      this.cameraPitch=Math.max(-.18,Math.min(.7,this.cameraPitch));
    }else{
      let delta=v.heading-this.cameraYaw;
      while(delta>Math.PI)delta-=Math.PI*2;
      while(delta<-Math.PI)delta+=Math.PI*2;
      this.cameraYaw+=delta*Math.min(1,dt*2.2);
    }

    const back=new T.Vector3(
      Math.sin(this.cameraYaw)*8,
      3.1+Math.sin(this.cameraPitch)*2,
      Math.cos(this.cameraYaw)*8
    );
    c.position.lerp(target.clone().add(back),.16);
    c.lookAt(target);
  }

  syncMesh(){
    const t=this.body.translation();
    this.pos.set(t.x,t.y-1,t.z);
    this.mesh.position.copy(this.pos);
  }

  reset(){
    this.mesh.rotation.y=0;
    this.body.setNextKinematicTranslation({
      x:this.spawn.x,
      y:1,
      z:this.spawn.z
    });
    this.vel.set(0,0,0);
    this.grounded=false;
    this.cameraPitch=.28;
    this.cameraYaw=0;
    this.syncMesh();
    this.mesh.visible=true;
  }
}