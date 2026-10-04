import "./style.css";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { Game } from "./game/Game.js";
const base=import.meta.env.BASE_URL;
document.querySelector("#app").innerHTML='<canvas id="game"></canvas><div id="hud"><div class="brand"><b>MAVON</b><span>DISTRICT</span></div><div class="stats"><span id="fps">60 FPS</span><span id="speed">0 km/h</span><span id="wanted">☆</span></div><div class="mission"><small>FREE ROAM</small><strong id="mission">Explore the district</strong></div></div><div id="touch"><button data-k="w">▲</button><div><button data-k="a">◀</button><button data-k="s">▼</button><button data-k="d">▶</button></div><button data-k="e">ENTER</button></div><div id="help">WASD move • E enter/exit • SHIFT sprint • SPACE jump • R reset</div>';
await RAPIER.init();
const game=new Game({canvas:document.querySelector("#game"),THREE,RAPIER,base}); game.start();