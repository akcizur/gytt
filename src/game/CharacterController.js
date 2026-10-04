export class CharacterController{
  constructor(game,spawn={x:0,y:0,z:10}){
    this.g=game;
    this.T=game.THREE;
    this.R=game.RAPIER;
    this.spawn=new this.T.Vector3(spawn.x,spawn.y,spawn.z);
    this.position=this.spawn.clone();
    this.velocity=new this.T.Vector3();
    this.grounded=false;
    this.maxWalkSpeed=5;
    this.maxRunSpeed=9;
    this.jumpSpeed=6.5;
    this.gravity=-18;
    this.acceleration=14;
    this.deceleration=18;
    this.deadZone=.08;
    this.body=null;
    this.collider=null;
    this.controller=null;
  }

  build(){
    const {R}=this;
    this.body=this.g.world.world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        this.spawn.x, this.spawn.y+1, this.spawn.z
      )
    );
    this.collider=this.g.world.world.createCollider(
      R.ColliderDesc.capsule(.55,.42),
      this.body
    );
    this.controller=this.g.world.world.createCharacterController(.03);
    this.controller.enableAutostep(.45,.3,true);
    this.controller.enableSnapToGround(.2);
    this.controller.setMaxSlopeClimbAngle(Math.PI*.72);
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.sync();
  }

  getAxes(input){
    let x=input.axisX();
    let y=input.axisY();
    if(Math.hypot(x,y)<this.deadZone){
      x=(input.down("KeyD")?1:0)-(input.down("KeyA")?1:0);
      y=(input.down("KeyW")?1:0)-(input.down("KeyS")?1:0);
    }
    const length=Math.hypot(x,y);
    if(length>1){x/=length;y/=length}
    return {x,y,magnitude:Math.min(1,length)};
  }

  update(input,cameraYaw,dt){
    const axes=this.getAxes(input);
    const moving=axes.magnitude>this.deadZone;
    const normalized=moving
      ?Math.min(1,(axes.magnitude-this.deadZone)/(1-this.deadZone))
      :0;
    const sprint=input.down("ShiftLeft")||input.down("ShiftRight");
    const speed=(sprint?this.maxRunSpeed:this.maxWalkSpeed)*normalized;

    let localX=axes.x;
    let localZ=-axes.y;
    const len=Math.hypot(localX,localZ);
    if(len>0){localX/=len;localZ/=len}

    const worldX=localX*Math.cos(cameraYaw)+localZ*Math.sin(cameraYaw);
    const worldZ=-localX*Math.sin(cameraYaw)+localZ*Math.cos(cameraYaw);

    const response=moving?this.acceleration:this.deceleration;
    const blend=Math.min(1,response*dt);
    this.velocity.x+=(worldX*speed-this.velocity.x)*blend;
    this.velocity.z+=(worldZ*speed-this.velocity.z)*blend;

    if(!moving){
      const drag=Math.exp(-this.deceleration*dt);
      this.velocity.x*=drag;
      this.velocity.z*=drag;
    }

    if(input.pressed("Space")&&this.grounded)this.velocity.y=this.jumpSpeed;
    this.velocity.y=Math.max(-40,this.velocity.y+this.gravity*dt);

    const desired={
      x:this.velocity.x*dt,
      y:this.velocity.y*dt,
      z:this.velocity.z*dt
    };
    this.controller.computeColliderMovement(this.collider,desired);
    const corrected=this.controller.computedMovement();

    // Rapier is authoritative for collision correction. Never bypass the
    // corrected translation: doing so would let the player tunnel through
    // buildings when a query reports a blocked movement.
    const movement={
      x:corrected.x,
      y:corrected.y,
      z:corrected.z
    };

    const current=this.body.translation();
    const next={
      x:current.x+movement.x,
      y:Math.max(1,current.y+movement.y),
      z:current.z+movement.z
    };

    this.body.setNextKinematicTranslation(next);
    this.position.set(next.x,next.y-1,next.z);
    this.grounded=this.controller.computedGrounded()||next.y<=1.001;

    if(this.grounded&&this.velocity.y<0)this.velocity.y=0;
    return {
      moving,
      sprint,
      magnitude:normalized,
      speed,
      velocity:this.velocity
    };
  }

  sync(){
    const t=this.body.translation();
    this.position.set(t.x,t.y-1,t.z);
    return this.position;
  }

  reset(){
    this.velocity.set(0,0,0);
    this.grounded=false;
    this.body.setNextKinematicTranslation({
      x:this.spawn.x,y:this.spawn.y+1,z:this.spawn.z
    });
    this.sync();
  }
}
