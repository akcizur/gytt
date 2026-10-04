export class Player{
  constructor(g){this.g=g;this.T=g.THREE;this.R=g.RAPIER;this.pos=new this.T.Vector3(0,0,10);this.vel=new this.T.Vector3();this.grounded=false;this.jumpSpeed=6.5}
  build(){
    const T=this.T;this.mesh=new T.Group();
    const body=new T.Mesh(new T.CapsuleGeometry(.42,.9,6,10),new T.MeshStandardMaterial({color:0xdddddd}));body.position.y=1.05;body.castShadow=true;this.mesh.add(body);
    const head=new T.Mesh(new T.SphereGeometry(.28,12,8),new T.MeshStandardMaterial({color:0xb87955}));head.position.y=1.8;head.castShadow=true;this.mesh.add(head);
    this.g.world.scene.add(this.mesh);
    this.body=this.g.world.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,1,10));
    this.collider=this.g.world.world.createCollider(this.R.ColliderDesc.capsule(.55,.42),this.body);
    this.controller=this.g.world.world.createCharacterController(.03);
    this.controller.enableAutostep(.45,.3,true);this.controller.enableSnapToGround(.15);this.controller.setApplyImpulsesToDynamicBodies(true);
    this.syncMesh();
  }
  update(dt){
    const i=this.g.input,T=this.T;let x=(i.down("KeyD")?1:0)-(i.down("KeyA")?1:0),z=(i.down("KeyS")?1:0)-(i.down("KeyW")?1:0);
    const moving=Math.hypot(x,z)>0;if(moving){const len=Math.hypot(x,z);x/=len;z/=len}
    const speed=i.down("ShiftLeft")?9:5;this.vel.x+=(x*speed-this.vel.x)*Math.min(1,dt*12);this.vel.z+=(z*speed-this.vel.z)*Math.min(1,dt*12);
    if(!moving){const drag=Math.pow(.02,dt);this.vel.x*=drag;this.vel.z*=drag}
    if(i.pressed("Space")&&this.grounded)this.vel.y=this.jumpSpeed;
    this.vel.y-=18*dt;
    const desired={x:this.vel.x*dt,y:this.vel.y*dt,z:this.vel.z*dt};
    this.controller.computeColliderMovement(this.collider,desired);const corrected=this.controller.computedMovement();const current=this.body.translation();
    this.body.setNextKinematicTranslation({x:current.x+corrected.x,y:current.y+corrected.y,z:current.z+corrected.z});
    this.grounded=this.controller.computedGrounded();if(this.grounded&&this.vel.y<0)this.vel.y=0;this.syncMesh();
    if(moving)this.mesh.rotation.y=Math.atan2(this.vel.x,this.vel.z);
    const c=this.g.world.camera,target=this.pos.clone().add(new T.Vector3(0,1.2,0)),back=new T.Vector3(0,2.8,7).applyAxisAngle(new T.Vector3(0,1,0),this.mesh.rotation.y);
    c.position.lerp(target.clone().add(back),1-Math.pow(.001,dt));c.lookAt(target);
  }
  syncMesh(){const t=this.body.translation();this.pos.set(t.x,t.y-1,t.z);this.mesh.position.copy(this.pos)}
  reset(){this.body.setNextKinematicTranslation({x:0,y:1,z:10});this.vel.set(0,0,0);this.grounded=false;this.syncMesh()}
}