export class Streaming{
  constructor(world,{chunkSize=120,activeRadius=1,unloadRadius=2}={}){this.world=world;this.chunkSize=chunkSize;this.activeRadius=activeRadius;this.unloadRadius=unloadRadius;this.loaded=new Map();this.pending=new Map();this.lastX=Infinity;this.lastZ=Infinity}
  key(x,z){return x+":"+z}
  coords(position){return{x:Math.floor(position.x/this.chunkSize),z:Math.floor(position.z/this.chunkSize)}}
  async update(position,{force=false}={}){const c=this.coords(position);if(!force&&c.x===this.lastX&&c.z===this.lastZ)return;this.lastX=c.x;this.lastZ=c.z;const jobs=[];for(let z=c.z-this.activeRadius;z<=c.z+this.activeRadius;z++)for(let x=c.x-this.activeRadius;x<=c.x+this.activeRadius;x++)jobs.push(this.ensure(x,z));await Promise.all(jobs);for(const [key,chunk] of this.loaded){if(Math.max(Math.abs(chunk.x-c.x),Math.abs(chunk.z-c.z))>this.unloadRadius)this.unload(key)}}
  async ensure(x,z){const key=this.key(x,z);if(this.loaded.has(key))return this.loaded.get(key);if(this.pending.has(key))return this.pending.get(key);const job=this.world.createChunk(x,z).then(chunk=>{this.loaded.set(key,chunk);this.pending.delete(key);return chunk}).catch(error=>{this.pending.delete(key);console.warn("Chunk "+key+" failed",error);return null});this.pending.set(key,job);return job}
  unload(key){const chunk=this.loaded.get(key);if(!chunk)return;this.world.disposeChunk(chunk);this.loaded.delete(key)}
  dispose(){for(const key of this.loaded.keys())this.unload(key);this.loaded.clear();this.pending.clear()}
}
