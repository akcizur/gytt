export class LODSystem{
  constructor(game){
    this.game=game;
    this.entries=new Map();
    this.timer=0;
  }

  register(object,{near=180,far=360,hide=520}={}){
    const entry={object,near,far,hide};
    this.entries.set(object,entry);
    return entry;
  }

  remove(object){
    this.entries.delete(object);
  }

  update(dt=.016){
    this.timer+=dt;
    if(this.timer<.12)return;
    this.timer=0;
    const player=this.game?.player?.pos;
    if(!player)return;

    for(const entry of this.entries.values()){
      const object=entry.object;
      if(!object?.parent)continue;
      const d=object.position.distanceTo(player);
      object.visible=d<=entry.hide;
      if(!object.visible)continue;

      const fade=(d-entry.near)/Math.max(.001,entry.far-entry.near);
      const detail=1-Math.min(1,Math.max(0,fade));
      object.traverse(child=>{
        if(child.isMesh){
          child.castShadow=detail>.35;
          child.receiveShadow=detail>.2;
        }
      });
    }
  }
}
