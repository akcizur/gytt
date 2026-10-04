import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { Input } from "./Input.js";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Game{
  constructor({THREE,RAPIER,canvas}){this.T=THREE||T;this.R=RAPIER;this.canvas=canvas;this.input=new Input();this.scene=new this.T.Scene();this.scene.background=new this.T.Color(0x8fb0c9);this.scene.fog=new this.T.Fog(0x8fb0c9,55,260);this.camera=new this.T.PerspectiveCamera(62,innerWidth/innerHeight,.05,500);this.renderer=new this.T.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=this.T.SRGBColorSpace;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=this.T.PCFSoftShadowMap;this.world=new this.R.World({x:0,y:-18,z:0});this.inputYaw=0;this.pitch=-.22;this.mode="foot";this.gltfLoader=new GLTFLoader();this.money=2500;this.wanted=0;this.wantedTimer=0;this.toastTimer=0;this.last=performance.now();this.frames=0;this.fpsAt=0;this.bindResize();this.bindMouse()}
  async start(){this.buildLighting();this.buildWorld();this.buildPlayer();this.buildVehicle();this.buildTraffic();this.buildPedestrians();this.buildPolice();this.buildMissions();this.load();this.loadVisualModels();this.camera.position.set(5,4.2,14);this.camera.lookAt(0,1.2,8);document.querySelector("#boot").style.opacity=0;setTimeout(()=>document.querySelector("#boot")?.remove(),600);this.show("WASD + mouse • E enter vehicle • Shift sprint • Space jump");requestAnimationFrame(this.loop.bind(this))}
  assetUrl(path){return "https://raw.githubusercontent.com/Hidencod/tge-assets/main/packs/"+path}
  loadAsset(path,timeout=12000){return new Promise((resolve,reject)=>{let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error("asset timeout"))}},timeout);this.gltfLoader.load(this.assetUrl(path),g=>{if(settled)return;settled=true;clearTimeout(timer);resolve(g)},undefined,e=>{if(settled)return;settled=true;clearTimeout(timer);reject(e)})})}
  prepAsset(scene,height=2.5){const root=scene;const box=new this.T.Box3().setFromObject(root),size=box.getSize(new this.T.Vector3());if(height&&size.y>0.001){const s=height/size.y;root.scale.multiplyScalar(s)}const after=new this.T.Box3().setFromObject(root);root.position.y-=after.min.y;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;if(o.material?.map)o.material.map.colorSpace=this.T.SRGBColorSpace}});return root}
  replaceVisual(group,source,height=2.5){const clone=SkeletonUtils.clone(source);this.prepAsset(clone,height);group.clear();group.add(clone);return clone}
  async loadVisualModels(){try{const carPaths=["car-kit/sedan.glb","car-kit/suv.glb","car-kit/taxi.glb","car-kit/truck.glb"];
const [sedan,police,...traffic]=await Promise.allSettled([this.loadAsset("car-kit/sedan.glb"),this.loadAsset("car-kit/police.glb"),...carPaths.map(p=>this.loadAsset(p))]);
if(sedan.status==="fulfilled"){this.vehicle.assetSource=sedan.value.scene;this.replaceVisual(this.vehicle.group,sedan.value.scene,1.9)}
if(police.status==="fulfilled")for(const p of this.police){p.assetSource=police.value.scene;this.replaceVisual(p.mesh,police.value.scene,1.9)}
const trafficSources=traffic.filter(x=>x.status==="fulfilled").map(x=>x.value.scene);
if(trafficSources.length)for(let i=0;i<this.traffic.length;i++){const t=this.traffic[i];const clone=SkeletonUtils.clone(trafficSources[i%trafficSources.length]);this.prepAsset(clone,.95);t.mesh.visible=false;t.model=clone;this.scene.add(clone)}
this.show(sedan.status==="fulfilled"||trafficSources.length?"CC0 vehicle models ready":"Procedural vehicles active")}catch{this.show("Procedural vehicles active")}try{const buildingPaths=["city-kit-suburban/building-type-a.glb","city-kit-suburban/building-type-d.glb","city-kit-suburban/building-type-g.glb","city-kit-suburban/building-type-j.glb"];const loaded=await Promise.allSettled(buildingPaths.map(p=>this.loadAsset(p)));const sources=loaded.filter(x=>x.status==="fulfilled").map(x=>x.value.scene);if(sources.length){this.worldModelSources=sources;this.upgradeBuildings(sources)}}catch{}}
  upgradeBuildings(sources){const candidates=[];this.scene.traverse(o=>{if(o.userData?.proceduralBuilding&&o.isMesh)candidates.push(o)});for(let i=0;i<candidates.length;i++){const m=candidates[i],source=sources[i%sources.length],clone=SkeletonUtils.clone(source);this.prepAsset(clone,6+(i%5)*5);clone.position.set(m.position.x,0,m.position.z);clone.rotation.y=m.rotation.y;m.visible=false;this.scene.add(clone)}}
  bindResize(){addEventListener("resize",()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight)})}
  bindMouse(){this.canvas.addEventListener("click",()=>{if(matchMedia("(pointer:fine)").matches&&!this.input.touch)this.canvas.requestPointerLock?.()});addEventListener("mousemove",e=>{if(document.pointerLockElement!==this.canvas)return;this.inputYaw-=e.movementX*.0022;this.pitch=clamp(this.pitch-e.movementY*.0018,-1.05,.38)});this.canvas.addEventListener("pointerdown",e=>{if(e.pointerType==="touch")this.input.touch=true},{passive:true})}
  buildLighting(){this.scene.add(new this.T.HemisphereLight(0xdceeff,0x43505a,2.1));const sun=new this.T.DirectionalLight(0xfff1d0,3);sun.position.set(70,110,40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;sun.shadow.camera.top=100;sun.shadow.camera.bottom=-100;this.scene.add(sun)}
  mat(c,rough=.8,metal=0){return new this.T.MeshStandardMaterial({color:c,roughness:rough,metalness:metal})}
  box(w,h,d,c){const m=new this.T.Mesh(new this.T.BoxGeometry(w,h,d),this.mat(c));m.castShadow=true;m.receiveShadow=true;return m}
  colliderBox(x,y,z,w,h,d){const body=this.world.createRigidBody(this.R.RigidBodyDesc.fixed().setTranslation(x,y,z));this.world.createCollider(this.R.ColliderDesc.cuboid(w/2,h/2,d/2),body);return body}
  buildWorld(){const ground=this.box(520,.5,520,0x46524d);ground.position.y=-.25;this.scene.add(ground);this.colliderBox(0,-.35,0,520,.5,520);const roadW=12,block=38;for(let x=-190;x<=190;x+=block)this.addRoad(x,0,roadW,520,"x");for(let z=-190;z<=190;z+=block)this.addRoad(0,z,520,roadW,"z");for(let x=-171;x<=171;x+=38)for(let z=-171;z<=171;z+=38){if(Math.abs(x)<20&&Math.abs(z)<20)continue;this.addBuilding(x,z)}for(let i=0;i<120;i++){const x=(i*73%420)-210,z=(i*131%420)-210;if(Math.abs(x%38)<10||Math.abs(z%38)<10)continue;this.addTree(x,z)}for(const p of [[-75,0],[75,0],[0,-75],[0,75]])this.addLandmark(p[0],p[1])}
  addRoad(x,z,w,d,axis){const r=this.box(w,.08,d,0x24272b);r.position.set(x,.02,z);r.castShadow=false;this.scene.add(r);for(let i=-200;i<200;i+=12){const l=this.box(axis==="x"?5:.16,.02,axis==="x"?.16:5,0xe5dfb5);l.position.set(axis==="x"?i:x,.08,axis==="x"?z:i);l.castShadow=false;this.scene.add(l)}}
  addBuilding(x,z){const w=18+(Math.abs(x*z)%8),d=18+(Math.abs(x+z)%8),h=8+(Math.abs(x*7+z*3)%32);const m=this.box(w,h,d,0x66727b);m.position.set(x,h/2,z);m.userData.proceduralBuilding=true;this.scene.add(m);this.colliderBox(x,h/2,z,w,h,d);if(h>22)for(let y=5;y<h-2;y+=5){const strip=this.box(w*.72,.35,.08,0x9eb5b8);strip.position.set(x,y,z-d/2-.05);strip.castShadow=false;this.scene.add(strip)}}
  addTree(x,z){const g=new this.T.Group(),trunk=this.box(1.2,4,1.2,0x5b4430),crown=new this.T.Mesh(new this.T.IcosahedronGeometry(3.5,1),this.mat(0x31583e));trunk.position.y=2;crown.position.y=5.5;crown.castShadow=true;g.add(trunk,crown);g.position.set(x,0,z);this.scene.add(g)}
  addLandmark(x,z){const p=this.box(16,1,16,0x6d747b);p.position.set(x,.5,z);this.scene.add(p);const ring=new this.T.Mesh(new this.T.TorusGeometry(6,.18,10,48),this.mat(0xd9b25d,.4,.5));ring.rotation.x=Math.PI/2;ring.position.set(x,1.1,z);this.scene.add(ring)}
  buildPlayer(){this.player={pos:new this.T.Vector3(0,1,8),vel:new this.T.Vector3(),yaw:0,grounded:false,health:100,model:new this.T.Group(),action:"idle",mixer:null,clips:{},bones:{}};const g=this.player.model;g.userData.noCameraCollision=true;const body=this.box(1,1.7,.55,0x3e6fb4),head=new this.T.Mesh(new this.T.SphereGeometry(.38,16,12),this.mat(0xc98d6b));body.position.y=1.25;head.position.y=2.3;g.add(body,head);g.position.copy(this.player.pos);this.scene.add(g);this.player.body=this.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(this.player.pos.x,this.player.pos.y+.7,this.player.pos.z));this.player.collider=this.world.createCollider(this.R.ColliderDesc.capsule(.7,.38),this.player.body);this.player.controller=this.world.createCharacterController(.05);this.player.controller.enableAutostep(.6,.25,true);this.player.controller.enableSnapToGround(.3);this.player.controller.setApplyImpulsesToDynamicBodies?.(false);this.loadRiggedPlayer()}
  loadRiggedPlayer(){const url="https://raw.githubusercontent.com/programasweights/avatar/main/public/assets/character.glb";this.gltfLoader.load(url,gltf=>{const rig=gltf.scene;const box=new this.T.Box3().setFromObject(rig),size=box.getSize(new this.T.Vector3());const scale=2.35/Math.max(size.y,0.001);rig.scale.setScalar(scale);const scaled=new this.T.Box3().setFromObject(rig),min=scaled.min.y;rig.position.y=-min;rig.traverse(o=>{o.castShadow=true;o.receiveShadow=true});rig.userData.noCameraCollision=true;this.player.model.clear();this.player.model.add(rig);this.player.rig=rig;this.player.bones={hips:rig.getObjectByName("Hips"),spine:rig.getObjectByName("Spine"),head:rig.getObjectByName("Head"),lUpper:rig.getObjectByName("LeftUpperLeg"),rUpper:rig.getObjectByName("RightUpperLeg"),lLower:rig.getObjectByName("LeftLowerLeg"),rLower:rig.getObjectByName("RightLowerLeg"),lArm:rig.getObjectByName("LeftUpperArm"),rArm:rig.getObjectByName("RightUpperArm")};this.show("CC0 RIGGED PLAYER READY");this.loadAnimationLibrary(rig)},undefined,()=>this.show("Rigged model unavailable — fallback active"))}
  async loadAnimationLibrary(rig){
    const urls=[
      "https://raw.githubusercontent.com/Barbatos6669/elderforge/main/assets/animations/universal_animation_library_1/UAL1_Standard.glb",
      "https://raw.githubusercontent.com/Barbatos6669/elderforge/main/assets/animations/universal_animation_library_2/UAL2_Standard.glb"
    ];
    try{
      const results=await Promise.allSettled(urls.map(url=>new Promise((resolve,reject)=>this.gltfLoader.load(url,resolve,undefined,reject))));
      const targetSkinned=(()=>{let found=null;rig.traverse(o=>{if(!found&&o.isSkinnedMesh)found=o});return found})();
      if(!targetSkinned){this.show("Animation fallback — no skinned target");return}
      const clips=[];
      const names=new Set();
      for(const result of results){
        if(result.status!=="fulfilled")continue;
        const gltf=result.value;
        const sourceSkinned=(()=>{let found=null;gltf.scene.traverse(o=>{if(!found&&o.isSkinnedMesh)found=o});return found})();
        if(!sourceSkinned)continue;
        for(const clip of gltf.animations||[]){
          try{
            const retargeted=SkeletonUtils.retargetClip(targetSkinned,sourceSkinned,clip,{
              useFirstFramePosition:false,
              preserveBoneMatrix:true,
              preserveBonePositions:true
            });
            retargeted.name=clip.name;
            retargeted.optimize();
            const key=retargeted.name.toLowerCase().replace(/[^a-z0-9]/g,"");
            if(retargeted.validate()&&!names.has(key)){names.add(key);clips.push(retargeted)}
          }catch{}
        }
      }
      if(!clips.length){
        this.player.mixer=null;
        this.player.animations=[];
        this.player.actions={};
        this.show("Procedural locomotion active");
        return
      }
      this.player.animationTarget=targetSkinned;
      this.player.mixer=new this.T.AnimationMixer(targetSkinned);
      this.player.animations=clips;
      this.player.actions={};
      for(const clip of clips)this.player.actions[clip.name]=this.player.mixer.clipAction(clip);
      this.player.animationNames=clips.map(a=>a.name);
      this.show("UAL1 + UAL2 gameplay animations ready");
      this.setPlayerAnimation("idle")
    }catch{
      this.player.mixer=null;
      this.player.animations=[];
      this.player.actions={};
      this.show("Animation libraries unavailable — procedural fallback")
    }
  }
  normalizeClipName(name){return String(name||"").toLowerCase().replace(/[^a-z0-9]/g,"")}
  findAnimation(...terms){
    const list=this.player?.animations||[];
    const wanted=terms.map(t=>this.normalizeClipName(t));
    return list.find(c=>{const n=this.normalizeClipName(c.name);return wanted.some(t=>n===t||n.startsWith(t))})
      ||list.find(c=>{const n=this.normalizeClipName(c.name);return wanted.some(t=>n.includes(t))})
  }
  resolveAnimation(state){
    if(state==="idle")return this.findAnimation("Idle_Loop","Idle","Breathing");
    if(state==="walk")return this.findAnimation("Walk_Loop","Walk_Forward","Walk","Jog_Fwd_Loop");
    if(state==="run")return this.findAnimation("Sprint_Loop","Sprint","Run_Loop","Run","Jog_Fwd_Loop");
    if(state==="jump")return this.findAnimation("Jump_Start","NinjaJump_Start","Jump");
    if(state==="fall")return this.findAnimation("Jump_Loop","NinjaJump_Idle_Loop","Fall","Falling");
    if(state==="land")return this.findAnimation("Jump_Land","NinjaJump_Land","Land");
    if(state==="crouch")return this.findAnimation("Crouch_Idle_Loop","Crouch_Fwd_Loop");
    return this.findAnimation("Idle_Loop","Idle")
  }
  setPlayerAnimation(state){
    const p=this.player;
    if(!p.mixer||!p.animations?.length)return;
    const clip=this.resolveAnimation(state)||this.resolveAnimation("idle");
    if(!clip)return;
    if(p.currentAnimation===clip.name)return;
    const next=p.actions[clip.name];
    if(!next)return;
    const oneShot=["jump","land"].includes(state);
    next.enabled=true;
    next.setLoop(oneShot?this.T.LoopOnce:this.T.LoopRepeat);
    next.clampWhenFinished=oneShot;
    if(p.currentAction)p.currentAction.fadeOut(oneShot?.06:.12);
    next.reset().fadeIn(oneShot?.06:.12).play();
    next.setEffectiveWeight(1);
    p.currentAction=next;
    p.currentAnimation=clip.name;
    p.animationState=state;
  }
  buildVehicle(){this.vehicle={pos:new this.T.Vector3(0,0,15),heading:0,speed:0,driver:false,group:new this.T.Group(),assetSource:null};const g=this.vehicle.group;g.userData.noCameraCollision=true;const base=this.box(2.2,.65,4,0xa51f2c),cabin=this.box(1.75,.65,1.9,0x28343e);base.position.y=.65;cabin.position.set(0,1.18,-.15);g.add(base,cabin);for(const x of [-.95,.95])for(const z of [-1.35,1.35]){const w=new this.T.Mesh(new this.T.CylinderGeometry(.34,.34,.2,16),this.mat(0x111318,.7));w.rotation.z=Math.PI/2;w.position.set(x,.35,z);g.add(w)}g.position.copy(this.vehicle.pos);this.scene.add(g);this.vehicle.body=this.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.45,15));this.vehicle.collider=this.world.createCollider(this.R.ColliderDesc.cuboid(1.1,.45,2),this.vehicle.body)}
  buildTraffic(){this.traffic=[];const colors=[0x3b82f6,0xeab308,0x22c55e,0xef4444,0xffffff];for(let i=0;i<18;i++){const axis=i%2?"x":"z",lane=(i%5-2)*3.2,p=i*23%360-180,car=this.box(1.5,.55,3,colors[i%colors.length]);car.position.y=.58;this.scene.add(car);this.traffic.push({mesh:car,axis,lane,p,speed:7+(i%5)*1.5})}}
  buildPolice(){this.police=[];for(let i=0;i<3;i++){const g=new this.T.Group(),body=this.box(1.65,.65,3.1,0x17202b),bar=this.box(.8,.12,.35,0x4b8cff);body.position.y=.58;bar.position.set(0,1.05,0);g.add(body,bar);g.visible=false;this.scene.add(g);this.police.push({mesh:g,heading:0,speed:0,assetSource:null})}}
  buildPedestrians(){this.peds=[];const colors=[0xd97752,0x6d5bd0,0x3a9d73,0xc7a43b];for(let i=0;i<24;i++){const g=new this.T.Group(),body=this.box(.5,1.15,.35,colors[i%4]),head=new this.T.Mesh(new this.T.SphereGeometry(.22,10,8),this.mat(0xb97c5c));body.position.y=.85;head.position.y=1.6;g.add(body,head);g.position.set((i*31%330)-165,0,(i*67%330)-165);this.scene.add(g);this.peds.push({mesh:g,angle:i*.8,radius:5+(i%4)*2,speed:.3+(i%3)*.12,center:g.position.clone()})}}
  buildMissions(){this.missions=[{title:"Downtown Run",kind:"MISSION",objective:"Reach the golden marker downtown.",target:new this.T.Vector3(75,0,75),reward:500,done:false},{title:"Take the Sedan",kind:"MISSION",objective:"Find your sedan and drive to the marker.",target:new this.T.Vector3(-75,0,-75),reward:750,done:false},{title:"Lose the Heat",kind:"MISSION",objective:"Reach the marker with the police looking for you.",target:new this.T.Vector3(0,0,-150),reward:1200,done:false}];this.active=0}
  updatePlayer(dt){
    const p=this.player,i=this.input;
    if(this.vehicle.driver)return;
    let x=(i.down("KeyD")?1:0)-(i.down("KeyA")?1:0)+i.move.x;
    let z=(i.down("KeyS")?1:0)-(i.down("KeyW")?1:0)-i.move.y;
    const rawLen=Math.hypot(x,z);
    if(rawLen>1){x/=rawLen;z/=rawLen}
    const inputLen=Math.min(1,rawLen);
    const forward=new this.T.Vector3(Math.sin(this.inputYaw),0,Math.cos(this.inputYaw));
    const right=new this.T.Vector3(forward.z,0,-forward.x);
    const dir=new this.T.Vector3().addScaledVector(right,x).addScaledVector(forward,z);
    if(dir.lengthSq()>1e-5)dir.normalize();
    const sprint=i.down("ShiftLeft")||i.down("ShiftRight");
    const target=inputLen>.08?(sprint?8.5:4.8):0;
    const accel=target?20:28;
    const wanted=dir.multiplyScalar(target);
    p.vel.x+=clamp(wanted.x-p.vel.x,-accel*dt,accel*dt);
    p.vel.z+=clamp(wanted.z-p.vel.z,-accel*dt,accel*dt);
    if(!target){p.vel.x*=Math.pow(.001,dt);p.vel.z*=Math.pow(.001,dt)}
    const wasGrounded=p.grounded;
    if(i.pressed("Space")&&p.grounded)p.vel.y=7.2;
    p.vel.y-=18*dt;
    this.player.controller.computeColliderMovement(p.collider,{x:p.vel.x*dt,y:p.vel.y*dt,z:p.vel.z*dt});
    const c=this.player.controller.computedMovement();
    p.pos.x+=c.x;p.pos.y+=c.y;p.pos.z+=c.z;
    p.grounded=this.player.controller.computedGrounded();
    if(p.grounded&&p.vel.y<0)p.vel.y=0;
    p.body.setNextKinematicTranslation({x:p.pos.x,y:p.pos.y+.7,z:p.pos.z});
    p.model.position.copy(p.pos);
    const speed=Math.hypot(p.vel.x,p.vel.z);
    if(speed>.12){
      const targetYaw=Math.atan2(p.vel.x,p.vel.z);
      let delta=targetYaw-p.yaw;
      delta=Math.atan2(Math.sin(delta),Math.cos(delta));
      p.yaw+=delta*(1-Math.exp(-14*dt));
    }
    p.model.rotation.y=p.yaw;
    const justLanded=!wasGrounded&&p.grounded;
    p.action=!p.grounded?(p.vel.y>0?"jump":"fall"):speed<.12?"idle":speed<6.2?"walk":"run";
    this.animatePlayer();
    this.setPlayerAnimation(justLanded?"land":p.action)
  }
  animatePlayer(){const p=this.player,t=performance.now()/1000,b=p.model.children[0];if(b&&!p.rig){b.scale.y=1+(p.action==="run"?.06:0)+(p.action==="jump"?.12:0);b.rotation.z=p.action==="run"?Math.sin(t*18)*.06:Math.sin(t*3)*.015}if(p.rig&&!p.mixer){const n=Math.hypot(p.vel.x,p.vel.z),phase=t*(p.action==="run"?12:7);const swing=Math.sin(phase)*Math.min(.65,n/8);const sway=Math.sin(phase+.8)*Math.min(.18,n/8);const q=p.bones;p.rig.rotation.y=0;if(q.lUpper)q.lUpper.rotation.x=swing;if(q.rUpper)q.rUpper.rotation.x=-swing;if(q.lLower)q.lLower.rotation.x=Math.max(0,-swing)*.55;if(q.rLower)q.rLower.rotation.x=Math.max(0,swing)*.55;if(q.lArm)q.lArm.rotation.x=-swing*.55;if(q.rArm)q.rArm.rotation.x=swing*.55;if(q.spine)q.spine.rotation.z=sway*.12;if(q.head)q.head.rotation.z=-sway*.2}}
  updateVehicle(dt){const v=this.vehicle,i=this.input;if(i.pressed("KeyE")){if(v.driver){v.driver=false;this.mode="foot";this.player.model.visible=true;const side=new this.T.Vector3(3,0,0).applyAxisAngle(new this.T.Vector3(0,1,0),v.heading);this.player.pos.set(v.pos.x+side.x,0,v.pos.z+side.z);this.player.body.setNextKinematicTranslation({x:this.player.pos.x,y:this.player.pos.y+.7,z:this.player.pos.z});v.speed*=.5;this.show("Exited vehicle")}else if(dist(this.player.pos,v.pos)<4){v.driver=true;this.mode="vehicle";this.player.model.visible=false;this.raiseWanted(.2);this.show("Vehicle acquired")}}if(!v.driver){v.speed*=Math.pow(.03,dt);return}const throttle=(i.down("KeyW")?1:0)-(i.down("KeyS")?1:0),steer=(i.down("KeyD")?1:0)-(i.down("KeyA")?1:0)+i.move.x*.8;v.speed=clamp(v.speed+throttle*18*dt,-9,28);v.speed*=Math.pow(.45,dt);v.heading+=steer*clamp(Math.abs(v.speed)/6,0,1)*1.65*dt;v.pos.x=clamp(v.pos.x+Math.sin(v.heading)*v.speed*dt,-248,248);v.pos.z=clamp(v.pos.z+Math.cos(v.heading)*v.speed*dt,-248,248);v.group.position.copy(v.pos);v.group.rotation.y=v.heading;v.body.setNextKinematicTranslation({x:v.pos.x,y:.45,z:v.pos.z})}
  updateTraffic(dt){for(const c of this.traffic){for(const o of this.traffic){if(o!==c&&o.axis===c.axis&&Math.abs(o.lane-c.lane)<1&&Math.abs(o.p-c.p)<14)c.speed=Math.min(c.speed,o.speed*.9)}c.p+=c.speed*dt;if(c.p>210)c.p=-210;if(c.axis==="x")c.mesh.position.set(c.p,.55,c.lane);else c.mesh.position.set(c.lane,.55,c.p);c.mesh.rotation.y=c.axis==="x"?Math.PI/2:0}}
  updatePolice(dt){const active=this.wanted>0.05,target=this.vehicle.driver?this.vehicle.pos:this.player.pos;for(let i=0;i<this.police.length;i++){const p=this.police[i];p.mesh.visible=active&&i<Math.ceil(this.wanted);if(!p.mesh.visible)continue;const dx=target.x-p.mesh.position.x,dz=target.z-p.mesh.position.z,heading=Math.atan2(dx,dz);p.heading+=Math.atan2(Math.sin(heading-p.heading),Math.cos(heading-p.heading))*Math.min(1,dt*4);p.speed=Math.min(20,p.speed+12*dt);p.mesh.position.x+=Math.sin(p.heading)*p.speed*dt;p.mesh.position.z+=Math.cos(p.heading)*p.speed*dt;p.mesh.rotation.y=p.heading;if(Math.hypot(dx,dz)<5)this.raiseWanted(.2)}}
  updatePeds(dt){const t=performance.now()/1000;for(const p of this.peds){p.angle+=p.speed*dt;p.mesh.position.x=p.center.x+Math.cos(p.angle+t*.05)*p.radius;p.mesh.position.z=p.center.z+Math.sin(p.angle+t*.05)*p.radius;p.mesh.rotation.y=-p.angle+Math.PI/2}}
  updateMission(){const m=this.missions[this.active];const target=m.target,d=dist(this.vehicle.driver?this.vehicle.pos:this.player.pos,target);document.querySelector("#mission").textContent=m.title;document.querySelector("#mission-kind").textContent=m.kind;document.querySelector("#objective").textContent=m.objective+" • "+Math.round(d)+"m";if(d<7&&!m.done){m.done=true;this.money+=m.reward;document.querySelector("#money").textContent="$ "+this.money.toLocaleString();this.show("MISSION COMPLETE  +$"+m.reward);this.raiseWanted(-.4);this.active=Math.min(this.active+1,this.missions.length-1);this.save()}}
  raiseWanted(v){this.wanted=clamp(this.wanted+v,0,5);this.wantedTimer=20}
  updateWanted(dt){if(this.wanted>0){this.wantedTimer-=dt;if(this.wantedTimer<=0)if(!this.police?.some(p=>p.mesh.visible))this.wanted=Math.max(0,this.wanted-.18*dt)}document.querySelector("#wanted").textContent=this.wanted<.01?"☆":"★".repeat(Math.ceil(this.wanted));document.querySelector("#speed").textContent=Math.round(Math.abs(this.vehicle.driver?this.vehicle.speed:Math.hypot(this.player.vel.x,this.player.vel.z))*3.6)+" KM/H"}
  updateLook(dt){const i=this.input;if(i.look.x||i.look.y){this.inputYaw-=i.look.x*2.8*dt;this.pitch=clamp(this.pitch-i.look.y*2.0*dt,-1.05,.38)}this.inputYaw=((this.inputYaw+Math.PI)%(Math.PI*2))-Math.PI}
  updateCamera(dt){const target=this.vehicle.driver?this.vehicle.pos:this.player.pos,d=this.vehicle.driver?10:7,h=this.vehicle.driver?3.2:2.7,cp=Math.cos(this.pitch),sp=Math.sin(this.pitch),anchor=new this.T.Vector3(target.x,target.y+(this.vehicle.driver?1.35:1.15),target.z),desired=new this.T.Vector3(anchor.x-Math.sin(this.inputYaw)*cp*d,anchor.y-sp*d,anchor.z-Math.cos(this.inputYaw)*cp*d);const smooth=1-Math.pow(.0008,dt);this.camera.position.lerp(desired,smooth);const rayDir=new this.T.Vector3().subVectors(this.camera.position,anchor);const distance=rayDir.length();if(distance>.001){rayDir.normalize();const raycaster=new this.T.Raycaster(anchor,rayDir,.35,distance);const hits=raycaster.intersectObjects(this.scene.children,true).filter(h=>{let o=h.object;while(o){if(o.userData?.noCameraCollision)return false;o=o.parent}return h.object.visible});if(hits.length){this.camera.position.copy(anchor).addScaledVector(rayDir,Math.max(.9,hits[0].distance-.35))}}this.camera.lookAt(anchor.x,anchor.y,anchor.z)}
  interaction(){const el=document.querySelector("#interaction");if(this.vehicle.driver){el.textContent="E  EXIT VEHICLE";el.classList.add("show")}else if(dist(this.player.pos,this.vehicle.pos)<4){el.textContent="E  ENTER SEDAN";el.classList.add("show")}else el.classList.remove("show")}
  show(text){const el=document.querySelector("#toast");el.textContent=text;el.classList.add("show");clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.remove("show"),2400)}
  save(){localStorage.setItem("gytt-dev-save",JSON.stringify({money:this.money,active:this.active,wanted:this.wanted}))}
  load(){try{const s=JSON.parse(localStorage.getItem("gytt-dev-save")||"null");if(s){this.money=s.money??2500;this.active=clamp(s.active??0,0,2);this.wanted=s.wanted??0}}catch{}document.querySelector("#money").textContent="$ "+this.money.toLocaleString()}
  reset(){localStorage.removeItem("gytt-dev-save");location.reload()}
  loop(now){const dt=Math.min(.033,Math.max(.001,(now-this.last)/1000));this.last=now;this.frames++;this.updateLook(dt);if(this.player.mixer)this.player.mixer.update(dt);if(this.input.pressed("KeyR"))this.reset();this.world.step();this.updateVehicle(dt);this.updatePlayer(dt);this.updateTraffic(dt);this.updatePeds(dt);this.updatePolice(dt);this.updateMission();this.updateWanted(dt);this.updateCamera(dt);this.interaction();if(now-this.fpsAt>1000){this.fpsAt=now;document.querySelector("#fps").textContent=this.frames+" FPS";this.frames=0;document.querySelector("#dev-state").textContent=this.mode.toUpperCase()}this.renderer.render(this.scene,this.camera);this.input.end();requestAnimationFrame(this.loop.bind(this))}
}