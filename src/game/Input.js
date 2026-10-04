import nipplejs from "nipplejs";

const DEAD_ZONE = 0.12;

export class Input{
  constructor(){
    this.keys=new Set();
    this.just=new Set();
    this.move={x:0,y:0,strength:0};
    this.look={x:0,y:0,strength:0};
    this.touchActive=false;

    addEventListener("keydown",e=>{
      if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
      if(!this.keys.has(e.code))this.just.add(e.code);
      this.keys.add(e.code);
    },{passive:false});

    addEventListener("keyup",e=>this.keys.delete(e.code));
    addEventListener("blur",()=>this.reset());
    addEventListener("pagehide",()=>this.reset());
    document.addEventListener("visibilitychange",()=>{if(document.hidden)this.reset()});

    this.bindTouchButtons();
    this.bindJoysticks();
  }

  bindTouchButtons(){
    const map={e:"KeyE",shift:"ShiftLeft",space:"Space",r:"KeyR"};
    document.querySelectorAll("[data-k]").forEach(button=>{
      const code=map[button.dataset.k];
      if(!code)return;
      const press=e=>{
        e.preventDefault();
        if(!this.keys.has(code))this.just.add(code);
        this.keys.add(code);
        this.haptic(8);
      };
      const release=e=>{
        e.preventDefault();
        this.keys.delete(code);
      };
      button.addEventListener("pointerdown",press,{passive:false});
      button.addEventListener("pointerup",release,{passive:false});
      button.addEventListener("pointercancel",release,{passive:false});
      button.addEventListener("pointerleave",release,{passive:false});
      button.addEventListener("contextmenu",e=>e.preventDefault());
    });
  }

  bindJoysticks(){
    const left=document.querySelector("#joy-left");
    const right=document.querySelector("#joy-right");
    if(!left||!right)return;

    const makeOptions=zone=>({
      zone,
      mode:"static",
      size:124,
      threshold:DEAD_ZONE,
      fadeTime:120,
      restJoystick:true,
      restOpacity:.34,
      shape:"circle",
      dynamicPage:false,
      position:{left:"50%",top:"50%"},
      color:{
        front:"rgba(255,255,255,.86)",
        back:"rgba(255,255,255,.11)"
      }
    });

    this.leftJoy=nipplejs.create(makeOptions(left));
    this.rightJoy=nipplejs.create(makeOptions(right));

    this.leftJoy.on("move",(event,data)=>{
      const force=Math.min(1,Math.max(0,data?.force||0));
      const v=data?.vector;
      if(!v||force<DEAD_ZONE){
        this.move.x=0;this.move.y=0;this.move.strength=0;
        return;
      }
      this.move.x=v.x*force;
      this.move.y=-v.y*force;
      this.move.strength=force;
      this.touchActive=true;
    });

    this.leftJoy.on("end",()=>{
      this.move.x=0;this.move.y=0;this.move.strength=0;
      this.touchActive=!!(this.look.strength>0);
    });

    this.rightJoy.on("move",(event,data)=>{
      const force=Math.min(1,Math.max(0,data?.force||0));
      const v=data?.vector;
      if(!v||force<DEAD_ZONE){
        this.look.x=0;this.look.y=0;this.look.strength=0;
        return;
      }
      this.look.x=v.x*force;
      this.look.y=-v.y*force;
      this.look.strength=force;
      this.touchActive=true;
    });

    this.rightJoy.on("end",()=>{
      this.look.x=0;this.look.y=0;this.look.strength=0;
      this.touchActive=!!(this.move.strength>0);
    });
  }

  reset(){
    this.keys.clear();
    this.just.clear();
    this.move.x=0;this.move.y=0;this.move.strength=0;
    this.look.x=0;this.look.y=0;this.look.strength=0;
    this.touchActive=false;
  }

  down(code){
    if(code==="KeyW")return this.keys.has(code)||this.move.y>.18;
    if(code==="KeyS")return this.keys.has(code)||this.move.y<-.18;
    if(code==="KeyA")return this.keys.has(code)||this.move.x<-.18;
    if(code==="KeyD")return this.keys.has(code)||this.move.x>.18;
    return this.keys.has(code);
  }

  axisX(){return this.move.x}
  axisY(){return this.move.y}
  lookX(){return this.look.x}
  lookY(){return this.look.y}

  haptic(duration=8){
    if("vibrate" in navigator)navigator.vibrate(duration);
  }

  pressed(code){
    const hit=this.just.has(code);
    if(hit)this.just.delete(code);
    return hit;
  }

  endFrame(){this.just.clear()}
}