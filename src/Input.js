import nipplejs from "nipplejs";
export class Input{
  constructor(){
    this.keys=new Set();this.just=new Set();this.move={x:0,y:0};this.look={x:0,y:0};this.touch=false;this.activePointers=new Set();
    addEventListener("keydown",e=>{if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();if(!this.keys.has(e.code))this.just.add(e.code);this.keys.add(e.code)},{passive:false});
    addEventListener("keyup",e=>this.keys.delete(e.code));
    addEventListener("blur",()=>this.reset());addEventListener("visibilitychange",()=>document.hidden&&this.reset());
    document.querySelectorAll("[data-action]").forEach(b=>{const map={run:"ShiftLeft",jump:"Space",interact:"KeyE",reset:"KeyR"};const c=map[b.dataset.action];const down=e=>{e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);this.activePointers.add(e.pointerId);if(!this.keys.has(c))this.just.add(c);this.keys.add(c)};const up=e=>{e.preventDefault();this.activePointers.delete(e.pointerId);this.keys.delete(c)};b.addEventListener("pointerdown",down);["pointerup","pointercancel","lostpointercapture"].forEach(t=>b.addEventListener(t,up))});
    this.bindSticks();
  }
  bindSticks(){
    const create=(id,kind)=>{const z=document.querySelector(id);if(!z)return;const j=nipplejs.create({zone:z,mode:"static",size:118,threshold:.1,fadeTime:100,restJoystick:true,position:{left:"50%",top:"50%"},color:{front:"rgba(255,255,255,.8)",back:"rgba(255,255,255,.1)"}});j.on("move",(e,d)=>{const v=d?.vector;if(!v)return;const f=Math.min(1,d.force||0);this[kind].x=v.x*f;this[kind].y=-v.y*f;this.touch=true});j.on("end",()=>{this[kind].x=0;this[kind].y=0;this.touch=Object.values(this.move).some(Boolean)||Object.values(this.look).some(Boolean)});return j};
    this.left=create("#move-zone","move");this.right=create("#look-zone","look");
  }
  down(c){return this.keys.has(c)}
  pressed(c){const v=this.just.has(c);this.just.delete(c);return v}
  end(){this.just.clear()}
  reset(){this.keys.clear();this.just.clear();this.move.x=this.move.y=this.look.x=this.look.y=0;this.activePointers.clear();this.touch=false}
}
