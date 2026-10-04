export class Input{
  constructor(){
    this.keys=new Set();this.just=new Set();
    addEventListener("keydown",e=>{
      if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
      if(!this.keys.has(e.code))this.just.add(e.code);this.keys.add(e.code);
    },{passive:false});
    addEventListener("keyup",e=>this.keys.delete(e.code));
    addEventListener("blur",()=>{this.keys.clear();this.just.clear()});
    const map={w:"KeyW",a:"KeyA",s:"KeyS",d:"KeyD",e:"KeyE",shift:"ShiftLeft",space:"Space",r:"KeyR"};
    document.querySelectorAll("[data-k]").forEach(b=>{
      const code=map[b.dataset.k];if(!code)return;
      const press=e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);if(!this.keys.has(code))this.just.add(code);this.keys.add(code)};
      const release=e=>{e.preventDefault();this.keys.delete(code);if(b.hasPointerCapture?.(e.pointerId))b.releasePointerCapture(e.pointerId)};
      b.addEventListener("pointerdown",press,{passive:false});b.addEventListener("pointerup",release,{passive:false});
      b.addEventListener("pointercancel",release,{passive:false});b.addEventListener("lostpointercapture",()=>this.keys.delete(code),{passive:false});
      b.addEventListener("contextmenu",e=>e.preventDefault());
    });
  }
  down(c){return this.keys.has(c)}
  pressed(c){const hit=this.just.has(c);if(hit)this.just.delete(c);return hit}
  endFrame(){this.just.clear()}
}