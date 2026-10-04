export class Input{
  constructor(){
    this.keys=new Set();this.just=new Set();this.move={x:0,y:0};this.look={x:0,y:0};this.touch=false;this.activePointers=new Set();this.sticks=new Map();
    addEventListener("keydown",e=>{if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();if(!this.keys.has(e.code))this.just.add(e.code);this.keys.add(e.code)},{passive:false});
    addEventListener("keyup",e=>this.keys.delete(e.code));
    addEventListener("blur",()=>this.reset());addEventListener("visibilitychange",()=>document.hidden&&this.reset());
    document.querySelectorAll("[data-action]").forEach(b=>{const map={run:"ShiftLeft",jump:"Space",interact:"KeyE",reset:"KeyR"};const c=map[b.dataset.action];const down=e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);this.activePointers.add(e.pointerId);if(!this.keys.has(c))this.just.add(c);this.keys.add(c)};const up=e=>{e.preventDefault();this.activePointers.delete(e.pointerId);this.keys.delete(c)};b.addEventListener("pointerdown",down);["pointerup","pointercancel","lostpointercapture"].forEach(t=>b.addEventListener(t,up))});
    this.bindSticks();
  }
  bindSticks(){
    const bind=(selector,kind)=>{
      const zone=document.querySelector(selector);if(!zone)return;
      zone.style.touchAction="none";
      const radius=59;
      const state={pointer:null,center:{x:0,y:0}};
      const update=e=>{if(state.pointer!==e.pointerId)return;const dx=e.clientX-state.center.x,dy=e.clientY-state.center.y;const len=Math.hypot(dx,dy),f=Math.min(1,len/radius);this[kind].x=clamp(dx/radius,-1,1);this[kind].y=clamp(dy/radius,-1,1);if(Math.abs(this[kind].x)<.08)this[kind].x=0;if(Math.abs(this[kind].y)<.08)this[kind].y=0;this.touch=true};
      const end=e=>{if(state.pointer!==e.pointerId)return;state.pointer=null;this[kind].x=0;this[kind].y=0;this.touch=Math.hypot(this.move.x,this.move.y)>.02||Math.hypot(this.look.x,this.look.y)>.02};
      zone.addEventListener("pointerdown",e=>{e.preventDefault();if(state.pointer!==null)return;state.pointer=e.pointerId;state.center={x:e.clientX,y:e.clientY};zone.setPointerCapture?.(e.pointerId);this.activePointers.add(e.pointerId);this.touch=true;update(e)});
      zone.addEventListener("pointermove",e=>{e.preventDefault();update(e)},{passive:false});
      ["pointerup","pointercancel","lostpointercapture"].forEach(t=>zone.addEventListener(t,end));
      this.sticks.set(kind,state);
    };
    bind("#move-zone","move");bind("#look-zone","look");
  }
  down(c){return this.keys.has(c)}
  pressed(c){const v=this.just.has(c);this.just.delete(c);return v}
  end(){this.just.clear()}
  reset(){this.keys.clear();this.just.clear();this.move.x=this.move.y=this.look.x=this.look.y=0;this.activePointers.clear();for(const s of this.sticks.values())s.pointer=null;this.touch=false}
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
