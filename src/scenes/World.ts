import Phaser from 'phaser';
import {
  WORLD, TILE_PX, BARRIERS, GATES, PROPS, PLAYER_START, DISTRICTS,
} from '../world/layoutData';
import type { DistrictId } from '../world/layoutData';
import { InputSystem } from '../systems/input';
import { Player } from '../actors/player';

export interface GateRuntime {
  id: string;
  open: boolean;
  sprite: Phaser.GameObjects.Sprite;
  collider: Phaser.GameObjects.Rectangle;
}

export class WorldScene extends Phaser.Scene {
  input2!: InputSystem;
  player!: Player;
  solids!: Phaser.Physics.Arcade.StaticGroup;       // walls, trees, furniture
  fenceSolids!: Phaser.Physics.Arcade.StaticGroup;  // hoppable with flap
  gateSolids!: Phaser.Physics.Arcade.StaticGroup;   // toggled by progression
  gates = new Map<string, GateRuntime>();
  propSprites = new Map<string, Phaser.GameObjects.Sprite>();
  propSolids = new Map<string, Phaser.GameObjects.Rectangle>();
  bushZones: Array<{ x: number; y: number; r: number; sprite: Phaser.GameObjects.Sprite }> = [];

  constructor() {
    super('World');
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h);

    const map = this.make.tilemap({ key: 'map' });
    const tileset = map.addTilesetImage('tiles', 'tiles');
    if (tileset) map.createLayer('ground', tileset, 0, 0)?.setDepth(-10000);

    this.solids = this.physics.add.staticGroup();
    this.fenceSolids = this.physics.add.staticGroup();
    this.gateSolids = this.physics.add.staticGroup();

    this.buildBarriers();
    this.buildProps();

    this.input2 = new InputSystem(this);
    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);

    this.physics.add.collider(this.player.sprite, this.solids);
    this.physics.add.collider(this.player.sprite, this.gateSolids);
    // Fences are hoppable: skip collision while airborne.
    this.physics.add.collider(
      this.player.sprite, this.fenceSolids,
      undefined, () => !this.player.airborne,
    );

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.w, WORLD.h);
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);

    this.scene.launch('UIOverlay');
    this.exposeDebugHook();
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);

    // Bush overlap (positional — bushes have no physics body).
    const p = this.player;
    p.inBush = this.bushZones.some(
      (b) => Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) < b.r,
    );

    if (this.input2.justPressed('flap')) p.tryFlap();
    if (this.input2.justPressed('squawk')) p.squawk();

    p.update(this.input2, dt);
    this.input2.endFrame();
  }

  districtAt(x: number, y: number): DistrictId {
    const tx = Math.floor(x / TILE_PX);
    const ty = Math.floor(y / TILE_PX);
    for (const [id, d] of Object.entries(DISTRICTS)) {
      if (tx >= d.x && tx < d.x + d.w && ty >= d.y && ty < d.y + d.h) return id as DistrictId;
    }
    return 'park';
  }

  setGateOpen(id: string, open: boolean): void {
    const gate = this.gates.get(id);
    if (!gate) return;
    gate.open = open;
    gate.sprite.setFrame(open ? 'prop/gate-open' : 'prop/gate-closed');
    const body = gate.collider.body as Phaser.Physics.Arcade.StaticBody | null;
    if (body) body.enable = !open;

    if (id === 'gate-cafe-market' && open) {
      // The truck drives off instead of a gate swinging open.
      const truck = this.propSprites.get('truck');
      const truckSolid = this.propSolids.get('truck');
      if (truck) {
        this.tweens.add({
          targets: truck, x: truck.x + 900, alpha: 0,
          duration: 2500, ease: 'Sine.easeIn',
        });
      }
      if (truckSolid?.body) {
        (truckSolid.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      }
    }
  }

  private buildBarriers(): void {
    for (const run of BARRIERS) {
      const gaps = new Set<number>(run.gapAt);
      if (run.axis === 'h') {
        const y = run.tileY * TILE_PX;
        let segStart: number | null = null;
        for (let x = run.fromX; x <= run.toX + 1; x++) {
          const isGap = gaps.has(x) || x > run.toX;
          if (!isGap && segStart === null) segStart = x;
          if (isGap && segStart !== null) {
            this.addBarrierSegment(run.kind, segStart * TILE_PX, y, (x - segStart) * TILE_PX, true);
            segStart = null;
          }
        }
      } else {
        const x = run.tileX * TILE_PX;
        this.addBarrierSegment(run.kind, x, run.fromY * TILE_PX, (run.toY - run.fromY + 1) * TILE_PX, false);
      }
    }

    for (const g of GATES) {
      const x = g.tileX * TILE_PX + TILE_PX; // centre of the 2-tile gap
      const y = g.tileY * TILE_PX;
      const isTruckGate = 'truck' in g && g.truck === true;
      const sprite = this.add
        .sprite(x, y + 12, 'atlas', 'prop/gate-closed')
        .setOrigin(0.5, 1)
        .setDepth(y + 12);
      if (isTruckGate) sprite.setVisible(false); // the parked truck IS this gate
      const collider = this.add.rectangle(x, y, TILE_PX * 2, 14);
      this.gateSolids.add(collider);
      collider.setVisible(false);
      this.gates.set(g.id, { id: g.id, open: false, sprite, collider });
    }
  }

  private addBarrierSegment(kind: string, x: number, y: number, length: number, horizontal: boolean): void {
    const sprite = kind === 'fence' ? 'prop/fence-h' : 'prop/hedge';
    if (horizontal) {
      for (let px = x; px < x + length; px += 64) {
        this.add.sprite(px + 32, y + 12, 'atlas', sprite).setOrigin(0.5, 1).setDepth(y + 12);
      }
      const rect = this.add.rectangle(x + length / 2, y, length, 14);
      (kind === 'fence' ? this.fenceSolids : this.solids).add(rect);
      rect.setVisible(false);
    } else {
      for (let py = y; py < y + length; py += 44) {
        this.add.sprite(x, py + 20, 'atlas', sprite).setOrigin(0.5, 1).setDepth(py + 20);
      }
      const rect = this.add.rectangle(x, y + length / 2, 14, length);
      (kind === 'fence' ? this.fenceSolids : this.solids).add(rect);
      rect.setVisible(false);
    }
  }

  private buildProps(): void {
    for (const def of PROPS) {
      const sprite = this.add.sprite(def.x, def.y, 'atlas', def.sprite).setOrigin(0.5, 1).setDepth(def.y);
      if (def.id) this.propSprites.set(def.id, sprite);
      if (def.sprite === 'prop/bush' && def.id) {
        this.bushZones.push({ x: def.x, y: def.y - 14, r: 46, sprite });
      }
      if (def.solid) {
        const rect = this.add.rectangle(def.x, def.y - def.solid.h / 2, def.solid.w, def.solid.h);
        this.solids.add(rect);
        rect.setVisible(false);
        if (def.id) this.propSolids.set(def.id, rect);
      }
    }
  }

  private exposeDebugHook(): void {
    const scene = this;
    (window as unknown as { __game?: unknown }).__game = {
      scene,
      get player() {
        const p = scene.player;
        return {
          x: p.x, y: p.y, hidden: p.hidden, swimming: p.swimming,
          airborne: p.airborne, carriedId: p.carriedId,
        };
      },
      openGate: (id: string) => scene.setGateOpen(id, true),
      fps: () => scene.game.loop.actualFps,
    };
  }
}
