import { World } from "./World.js";
import { Input } from "./Input.js";
import { Player } from "./Player.js";
import { Vehicle } from "./Vehicle.js";
import { Traffic } from "./Traffic.js";
import { Mission } from "./Mission.js";
export class Game{
constructor({canvas,THREE,RAPIER,base}){this.canvas=canvas;this.THREE=THREE;this.RAPIER=RAPIER;this.base=base;this.input=new Input();this.clock=new THREE.Clock();this.fpsEl=document.querySelector("#fps");this.speedEl=document.querySelector("#speed");this.world=new World(THREE,RAPIER);this.player=new Player(this);this.vehicle=new Vehicle(this);this.traffic=new Traffic(this);this.mission=new Mission(this);this.elapsed=0;this.frames=0;this.fps=60;}
start(){this.world.build();this.player.build();this.vehicle.build();this.traffic.build();this.mission.build();requestAnimationFrame(this.loop.bind(this));}
loop(now){const dt=Math.min(this.clock.getDelta(),.033);this.elapsed+=dt;this.frames++;if(this.elapsed>1){this.fps=this.frames/this.elapsed;this.frames=0;this.elapsed=0;}this.input.update();this.player.update(dt);this.vehicle.update(dt);this.traffic.update(dt);this.mission.update(dt);this.world.update(dt);this.world.render();this.speedEl.textContent=Math.round(this.vehicle.speedKmh)+" km/h";this.fpsEl.textContent=Math.round(this.fps)+" FPS";requestAnimationFrame(this.loop.bind(this));}}