import { World } from "./World.js";
import { Input } from "./Input.js";
import { Player } from "./Player.js";
import { Vehicle } from "./Vehicle.js";
import { Traffic } from "./Traffic.js";
import { Mission } from "./Mission.js";
import { Pedestrians } from "./Pedestrians.js";

export class Game{
  constructor({canvas,THREE,RAPIER,base}){
    this.canvas=canvas;this.THREE=THREE;this.RAPIER=RAPIER;this.base=base;this.input=new Input();
    this.fpsEl=document.querySelector("#fps");this.speedEl=document.querySelector("#speed");
    this.world=new World(THREE,RAPIER);this.world.g=this;
    this.player=new Player(this);this.world.player=this.player;
    this.vehicle=new Vehicle(this);this.traffic=new Traffic(this);this.mission=new Mission(this);this.pedestrians=new Pedestrians(this);
    this.elapsed=0;this.frames=0;this.fps=60;this.lastTime=performance.now();
  }
  async start(){
    this.mission.build();
    this.mission.el.textContent="Streaming district…";
    await this.world.build();
    this.player.build();this.vehicle.build();this.traffic.build();this.pedestrians.build();
    this.lastTime=performance.now();requestAnimationFrame(this.loop.bind(this));
  }
  loop(now){
    const dt=Math.min(Math.max((now-this.lastTime)/1000,0.001),.033);this.lastTime=now;
    this.elapsed+=dt;this.frames++;
    if(this.elapsed>1){this.fps=this.frames/this.elapsed;this.frames=0;this.elapsed=0}
    this.vehicle.update(dt);this.player.update(dt);this.traffic.update(dt);this.pedestrians.update(dt);this.world.update(dt);this.mission.update();
    if(this.speedEl)this.speedEl.textContent=Math.round(this.vehicle.speedKmh)+" km/h";
    if(this.fpsEl)this.fpsEl.textContent=Math.round(this.fps)+" FPS";
    this.world.render();this.input.endFrame();requestAnimationFrame(this.loop.bind(this));
  }
}
