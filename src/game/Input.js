import nipplejs from "nipplejs";

export class Input{
  constructor(){
    this.keys=new Set();this.just=new Set();
    this.move={x:0,y:0};this.look={x:0,y:0};this.touch=new Map();
    addEventListener("keydown",e=>{
      if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
      if(!this.keys.has(e.code))this.just.add(e.code);this.keys.add(e.code);
    },{passive:false});
    addEventListener("keyup",e=>this.keys.delete(e.code));
    addEventListener("blur",()=>{this.keys.clear();this.just.clear();this.move.x=0;this.move.y=0;this.look.x=0;this.look.y=0});
    this.bindTouchButtons();
    this.bindJoysticks();
  }
  bindTouchButtons(){
    const map={e:"KeyE",shift:"ShiftLeft",space:"Space",r:"KeyR"};
    document.querySelectorAll("[data-k]").forEach(b=>{
      const code=map[b.dataset.k];if(!code)return;
      const press=e=>{e.preventDefault();if(!this.keys.has(code))this.just.add(code);this.keys.add(code)};
      const release=e=>{e.preventDefault();this.keys.delete(code)};
      b.addEventListener("pointerdown",press,{passive:false});
      b.addEventListener("pointerup",release,{passive:false});
      b.addEventListener("pointercancel",release,{passive:false});
      b.addEventListener("pointerleave",release,{passive:false});
      b.addEventListener("contextmenu",e=>e.preventDefault());
    });
  }
  bindJoysticks(){
    const left=document.querySelector("#joy-left"),right=document.querySelector("#joy-right");
    if(!left||!right)return;
    const common={mode:"static",size:118,threshold:.08,fadeTime:140,restJoystick:true,restOpacity:.38,multitouch:true,maxNumberOfJoysticks:1};
    this.leftJoy=nipplejs.create({...common,zone:left,position:{left:"50%",top:"50%"},color:{front:"rgba(255,255,255,.82)",back:"rgba(255,255,255,.10)"}});
    this.rightJoy=nipplejs.create({...common,zone:right,position:{left:"50%",top:"50%"},color:{front:"rgba(255,255,255,.82)",back:"rgba(255,255,255,.10)"}});
    this.leftJoy.on("move",(e,d)=>{if(d?.vector)this.move.set(d.vector.x,-d.vector.y)});
    this.leftJoy.on("end",()=>this.move.set(0,0));
    this.rightJoy.on("move",(e,d)=>{if(d?.vector)this.look.set(d.vector.x,-d.vector.y)});
    this.rightJoy.on("end",()=>this.look.set(0,0));
  }
  down(c){
    if(c==="KeyW")return this.keys.has(c)||this.move.y>.18;
    if(c==="KeyS")return this.keys.has(c)||this.move.y<-.18;
    if(c==="KeyA")return this.keys.has(c)||this.move.x<-.18;
    if(c==="KeyD")return this.keys.has(c)||this.move.x>.18;
    return this.keys.has(c);
  }
  axisX(){return this.move.x}
  axisY(){return this.move.y}
  lookX(){return this.look.x}
  lookY(){return this.look.y}
  pressed(c){const hit=this.just.has(c);if(hit)this.just.delete(c);return hit}
  endFrame(){this.just.clear()}
}