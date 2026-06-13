import Phaser from 'phaser';
import {
  WORLD, TILE_PX, BARRIERS, GATES, PROPS, NPCS, DOGS, PLAYER_START, DISTRICTS,
} from '../world/layoutData';
import type { DistrictId } from '../world/layoutData';
import { InputSystem } from '../systems/input';
import { Player } from '../actors/player';
import { HumanNpc } from '../actors/humanRuntime';
import { Dog } from '../actors/dog';
import { Magpie } from '../actors/magpie';
import { SeagullFlock } from '../actors/seagull';
import { ItemManager, type BinState, type DragTarget } from '../items/itemManager';
import { Mischief } from '../systems/mischief';
import { SaveSystem, makeSave } from '../systems/save';
import { SettingsSystem } from '../systems/settings';
import { AudioSystem } from '../systems/audio';
import { DISTRICT_ORDER, GATE_FOR_DISTRICT } from '../systems/tasks';

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
  itemsMgr!: ItemManager;
  mischief!: Mischief;
  npcs: HumanNpc[] = [];
  dogs: Dog[] = [];
  magpie!: Magpie;
  seagulls!: SeagullFlock;
  bins = new Map<string, BinState>();
  dragTargets: DragTarget[] = [];
  private currentDistrict: DistrictId = 'park';
  private squawkHeldFor = 0;
  private longHonkFired = false;
  private magpieScaredThisFrame = false;
  saves = new SaveSystem();
  settings = new SettingsSystem();
  audio = new AudioSystem(this.settings);
  private continueGame = false;
  private playSeconds = 0;
  private autosaveIn = 15;

  constructor() {
    super('World');
  }

  init(data: { continue?: boolean } = {}): void {
    this.continueGame = data.continue === true;
  }

  create(): void {
    // Phaser reuses the scene instance on restart: class fields initialise
    // once, so every per-run collection must be reset here or stale actors
    // with destroyed sprites survive into the next playthrough.
    this.npcs = [];
    this.dogs = [];
    this.bins = new Map();
    this.dragTargets = [];
    this.bushZones = [];
    this.gates = new Map();
    this.propSprites = new Map();
    this.propSolids = new Map();
    this.currentDistrict = 'park';
    this.playSeconds = 0;
    this.autosaveIn = 15;
    this.squawkHeldFor = 0;
    this.longHonkFired = false;
    this.magpieScaredThisFrame = false;

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

    this.itemsMgr = new ItemManager(this);
    this.mischief = new Mischief(this, this.itemsMgr);

    for (const def of NPCS) {
      const npc = new HumanNpc(this, def);
      this.npcs.push(npc);
      this.physics.add.collider(npc.sprite, this.solids);
      this.physics.add.collider(npc.sprite, this.fenceSolids);
      this.physics.add.collider(npc.sprite, this.gateSolids);
    }
    for (const def of DOGS) {
      const dog = new Dog(this, def);
      this.dogs.push(dog);
      this.physics.add.collider(dog.sprite, this.solids);
      this.physics.add.collider(dog.sprite, this.fenceSolids);
      this.physics.add.collider(dog.sprite, this.gateSolids);
    }
    this.magpie = new Magpie(this);
    this.seagulls = new SeagullFlock(this);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.w, WORLD.h);
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);

    this.input2.setBindings(this.settings.current.bindings);
    if (this.continueGame) this.restoreSave();

    this.scene.launch('UIOverlay');
    // UIOverlay subscribes a beat after launch; push initial state to it.
    this.time.delayedCall(60, () => {
      this.events.emit('tasks-changed', this.mischief.taskState);
      this.events.emit('district-changed', this.districtAt(this.player.x, this.player.y));
    });
    if (import.meta.env.DEV) this.exposeDebugHook();
  }

  private restoreSave(): void {
    const data = this.saves.load();
    if (!data) return;
    this.mischief.flags = data.flags;
    this.mischief.taskState = this.saves.toTaskState(data);
    this.playSeconds = data.playSeconds;
    if (data.position) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).reset(data.position.x, data.position.y);
    }
    // Reopen gates for every district already unlocked.
    for (let i = 0; i < DISTRICT_ORDER.length - 1; i++) {
      const district = DISTRICT_ORDER[i]!;
      const next = DISTRICT_ORDER[i + 1]!;
      if (data.unlockedDistricts.includes(next)) {
        const gateId = GATE_FOR_DISTRICT[district];
        if (gateId) this.setGateOpen(gateId, true, true);
      }
    }
  }

  private persist(): void {
    this.saves.save(makeSave(
      this.mischief.taskState,
      this.mischief.flags,
      { x: this.player.x, y: this.player.y },
      Math.round(this.playSeconds),
    ));
  }

  // Which bins each tidy-minded npc is responsible for.
  private fixableBinIds(npcId: string): string[] {
    const map: Record<string, string> = {
      groundskeeper: 'bin-park',
      waiter: 'bin-cafe',
      fruitvendor: 'bin-market',
      lifeguard: 'bin-beach',
      clubpresident: 'bin-oval',
    };
    const prefix = map[npcId];
    if (!prefix) return [];
    return [...this.bins.keys()].filter((id) => id.startsWith(prefix));
  }

  override update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const p = this.player;
    this.playSeconds += dt;

    if (this.input2.justPressed('pause')) {
      this.persist();
      this.scene.pause();
      this.scene.launch('Pause', { settings: this.settings });
      return;
    }
    this.autosaveIn -= dt;
    if (this.autosaveIn <= 0) {
      this.autosaveIn = 15;
      this.persist();
    }

    // Bush overlap (positional — bushes have no physics body).
    p.inBush = this.bushZones.some(
      (b) => Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) < b.r,
    );

    // Browsers unlock audio on the first real gesture — keyboard, gamepad, or
    // any touch-control interaction.
    const t = this.input2.touch;
    const touchEngaged = t.active && (t.axisX !== 0 || t.axisY !== 0 || t.sprint || t.squawkDown || t.pressed.size > 0);
    if (touchEngaged || this.input2.isDown('up') || this.input2.isDown('down') ||
        this.input2.isDown('left') || this.input2.isDown('right') ||
        this.input2.isDown('squawk') || this.input2.isDown('grab')) {
      this.audio.resume();
    }

    if (this.input2.justPressed('flap')) {
      const hadItem = this.itemsMgr.heldBy('player');
      if (p.tryFlap() && hadItem) {
        // Flapping needs both wings: the cargo gets jettisoned.
        const beak = p.beakTip();
        const result = this.itemsMgr.dropHeld('player', beak.x, beak.y);
        if (result) this.mischief.onDropped(result.item, beak.x, beak.y);
        p.carriedId = null;
      }
    }
    this.handleSquawk(dt);
    if (this.input2.justPressed('grab')) this.handleGrabKey();

    p.update(this.input2, dt);
    this.updateDrag();

    const ctxBase = {
      playerX: p.x,
      playerY: p.y,
      playerHidden: p.hidden,
      playerInWater: p.swimming,
      playerHoldsAnything: this.itemsMgr.heldBy('player') !== null,
      playerHeldItemOwner: (this.itemsMgr.heldBy('player')?.owner ?? 'none') as string | 'none',
      items: this.itemsMgr,
      bins: this.bins,
      time: time / 1000,
      dt,
      forceDropFromPlayer: (npcX: number, npcY: number) => this.forceDropFromPlayer(npcX, npcY),
    };
    for (const npc of this.npcs) {
      const events = npc.update({ ...ctxBase, fixableBinIds: this.fixableBinIds(npc.def.id) });
      if (events.includes('slipped')) this.audio.slipWhistle();
      this.mischief.onNpcEvents(npc, events);
    }

    for (const dog of this.dogs) {
      const wasChasing = dog.mind.state === 'chase';
      dog.update({
        playerX: p.x, playerY: p.y, playerHidden: p.hidden, dt,
        forceDropFromPlayer: (x, y) => this.forceDropFromPlayer(x, y),
      });
      if (!wasChasing && dog.mind.state === 'chase') this.audio.bark();
      if (dog.escapedEvent) {
        dog.escapedEvent = false;
        this.mischief.flags.dogEscapedBySwimming = true;
      }
    }

    this.magpie.update({
      playerX: p.x, playerY: p.y,
      playerCarriedId: this.itemsMgr.heldBy('player')?.id ?? null,
      items: this.itemsMgr, dt,
      scaredOff: this.magpieScaredThisFrame,
    });
    this.magpieScaredThisFrame = false;
    if (this.magpie.robbedEvent) {
      this.magpie.robbedEvent = false;
      this.mischief.flags.magpieRobbedYou = true;
      this.audio.warble();
      p.squawk(); // outrage
      this.events.emit('toast', 'The magpie robbed you. The audacity.');
    }
    p.carriedId = this.itemsMgr.heldBy('player')?.id ?? null;

    this.seagulls.update(dt);

    this.itemsMgr.update(p.x, p.y, p.facing, p.y, (id) => {
      const npc = this.npcs.find((n) => n.def.id === id);
      return npc ? { x: npc.x, y: npc.y, facing: npc.facing } : null;
    });

    this.checkZones();
    this.progress();
    this.input2.endFrame();
  }

  private handleSquawk(dt: number): void {
    const p = this.player;
    if (this.input2.justPressed('squawk')) {
      p.squawk();
      this.audio.honk(false);
      this.squawkHeldFor = 0;
      this.longHonkFired = false;
      this.mischief.onHonk(p.x, p.y, false, this.npcs);
      this.events.emit('squawk', false);
    } else if (this.input2.isDown('squawk')) {
      this.squawkHeldFor += dt;
      if (this.squawkHeldFor > 0.6 && !this.longHonkFired) {
        this.longHonkFired = true;
        p.squawk();
        this.audio.honk(true);
        this.mischief.onHonk(p.x, p.y, true, this.npcs);
        if (this.seagulls.tryScatter(p.x, p.y)) {
          this.mischief.flags.seagullsScattered = true;
        }
        if (Phaser.Math.Distance.Between(p.x, p.y, this.magpie.x, this.magpie.y) < 320) {
          this.magpieScaredThisFrame = true;
        }
        this.events.emit('squawk', true);
      }
    }
  }

  private handleGrabKey(): void {
    const p = this.player;
    const beak = p.beakTip();

    if (p.draggingId) {
      this.stopDrag();
      return;
    }

    const held = this.itemsMgr.heldBy('player');
    if (held) {
      const result = this.itemsMgr.dropHeld('player', beak.x, beak.y);
      if (result) {
        this.mischief.onDropped(result.item, beak.x, beak.y);
        if (result.splashed) this.audio.splash();
      }
      p.carriedId = null;
      return;
    }

    const grabbed = this.itemsMgr.tryGrab(beak.x, beak.y, this.mischief.flags);
    if (grabbed) {
      p.carriedId = grabbed.id;
      this.mischief.onGrabbed(grabbed);
      return;
    }

    const bin = this.itemsMgr.peckableBin(beak.x, beak.y, this.bins.values());
    if (bin) {
      bin.upright = false;
      bin.sprite.setFrame('prop/bin-knocked');
      if (bin.solid?.body) (bin.solid.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      this.itemsMgr.spawnTrash(bin.x, bin.y);
      this.audio.clang();
      this.mischief.onBinKnocked();
      this.cameras.main.shake(80, 0.004);
      return;
    }

    // Unleash a nearby tied-up dog.
    const leashed = this.dogs.find(
      (d) => d.leashed && Phaser.Math.Distance.Between(p.x, p.y, d.x, d.y) < 64,
    );
    if (leashed) {
      leashed.unleash();
      this.mischief.flags.dogUnleashed = true;
      return;
    }

    // Pop a balloon off the stand.
    const stand = this.propSprites.get('balloon-stand');
    if (stand && Phaser.Math.Distance.Between(beak.x, beak.y, stand.x, stand.y - 90) < 80) {
      this.popBalloon(stand);
      return;
    }

    const drag = this.itemsMgr.draggableNear(p.x, p.y, this.dragTargets);
    if (drag) {
      p.draggingId = drag.id;
      const solid = this.propSolids.get(drag.id);
      if (solid?.body) (solid.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    }
  }

  private popBalloon(stand: Phaser.GameObjects.Sprite): void {
    this.audio.pop();
    this.mischief.flags.balloonPopped = true;
    if (!this.settings.current.reducedMotion) this.cameras.main.shake(70, 0.004);
    // One balloon makes a break for it.
    const balloon = this.add
      .sprite(stand.x + 10, stand.y - 100, 'atlas', 'item/balloon-loose')
      .setDepth(stand.y + 300);
    if (this.settings.current.reducedMotion) {
      this.time.delayedCall(400, () => balloon.destroy());
    } else {
      this.tweens.add({
        targets: balloon,
        y: balloon.y - 320,
        x: balloon.x + 60,
        alpha: 0,
        duration: 1800,
        ease: 'Sine.easeOut',
        onComplete: () => balloon.destroy(),
      });
    }
  }

  private updateDrag(): void {
    const p = this.player;
    if (!p.draggingId) return;
    const target = this.dragTargets.find((t) => t.id === p.draggingId);
    if (!target) {
      p.draggingId = null;
      return;
    }
    target.sprite.setPosition(p.x - p.facing * 30, p.y + 4).setDepth(p.y - 1);

    if (p.draggingId === 'sign-open' &&
        Phaser.Math.Distance.Between(target.sprite.x, target.sprite.y, target.homeX, target.homeY) > 180) {
      this.mischief.flags.signDragged = true;
    }
    if (p.draggingId.startsWith('price-sign') &&
        Phaser.Math.Distance.Between(target.sprite.x, target.sprite.y, target.homeX, target.homeY) > 130) {
      this.mischief.flags.signsSwapped = true;
    }
    if (p.draggingId.startsWith('towel') && p.swimming) {
      this.mischief.flags.towelDragged = true;
    }
  }

  private stopDrag(): void {
    const p = this.player;
    if (!p.draggingId) return;
    const solid = this.propSolids.get(p.draggingId);
    const target = this.dragTargets.find((t) => t.id === p.draggingId);
    if (solid?.body && target) {
      const body = solid.body as Phaser.Physics.Arcade.StaticBody;
      body.enable = true;
      // Move the static body to where the prop now rests.
      body.position.set(target.sprite.x - body.halfWidth, target.sprite.y - body.height);
      body.updateFromGameObject();
    }
    p.draggingId = null;
  }

  private forceDropFromPlayer(npcX: number, npcY: number): string | null {
    const held = this.itemsMgr.heldBy('player');
    if (!held) return null;
    this.itemsMgr.forcedDrop(held, npcX, npcY, this.player.x, this.player.y);
    this.player.carriedId = null;
    this.player.squawk(); // indignant protest
    this.events.emit('squawk', false);
    return held.id;
  }

  private checkZones(): void {
    const p = this.player;
    const flags = this.mischief.flags;

    // Shed sneak: stand at the shed door.
    const shed = PROPS.find((d) => d.sprite === 'prop/shed');
    if (shed && Phaser.Math.Distance.Between(p.x, p.y, shed.x, shed.y + 14) < 44) {
      flags.shedSneaked = true;
    }

    // Sandcastle trampling.
    for (const [id, sprite] of this.propSprites) {
      if (!id.startsWith('sandcastle') || sprite.frame.name === 'prop/sandcastle-flat') continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, sprite.x, sprite.y) < 30) {
        sprite.setFrame('prop/sandcastle-flat');
        flags.sandcastleTrampled = true;
        if (!this.settings.current.reducedMotion) this.cameras.main.shake(60, 0.003);
      }
    }

    // The trophy case unlocks when the key is brought to it.
    if (!flags.trophyCaseOpen && this.itemsMgr.heldBy('player')?.kind === 'key') {
      const trophyCase = this.propSprites.get('trophy-case');
      if (trophyCase && Phaser.Math.Distance.Between(p.x, p.y, trophyCase.x, trophyCase.y) < 80) {
        flags.trophyCaseOpen = true;
        this.events.emit('toast', 'The trophy case clicks open…');
      }
    }
  }

  private progress(): void {
    const p = this.player;
    const result = this.mischief.sync(p.x, p.y);
    for (const gate of result.gatesToOpen) this.setGateOpen(gate, true);
    for (const toast of result.toasts) {
      this.events.emit('toast', toast);
      if (toast.startsWith('\u2713')) this.audio.ding();
      else this.audio.unlock();
    }
    if (result.toasts.length > 0) this.persist();
    if (result.won) {
      this.persist();
      this.audio.fanfare();
      this.events.emit('won');
    }

    const district = this.districtAt(p.x, p.y);
    if (district !== this.currentDistrict) {
      this.currentDistrict = district;
      this.audio.setDistrict(district);
      this.events.emit('district-changed', district);
    }
  }

  districtAt(x: number, y: number): DistrictId {
    const tx = Math.floor(x / TILE_PX);
    const ty = Math.floor(y / TILE_PX);
    for (const [id, d] of Object.entries(DISTRICTS)) {
      if (tx >= d.x && tx < d.x + d.w && ty >= d.y && ty < d.y + d.h) return id as DistrictId;
    }
    return 'park';
  }

  setGateOpen(id: string, open: boolean, instant = false): void {
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
        if (instant || this.settings.current.reducedMotion) {
          truck.setVisible(false);
        } else {
          this.tweens.add({
            targets: truck, x: truck.x + 900, alpha: 0,
            duration: 2500, ease: 'Sine.easeIn',
          });
        }
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
    const DRAGGABLE = /^(towel-|sign-open$|esky-|price-sign)/;
    for (const def of PROPS) {
      const sprite = this.add.sprite(def.x, def.y, 'atlas', def.sprite).setOrigin(0.5, 1).setDepth(def.y);
      if (def.id) this.propSprites.set(def.id, sprite);
      if (def.sprite === 'prop/bush' && def.id) {
        this.bushZones.push({ x: def.x, y: def.y - 14, r: 46, sprite });
      }
      let solidRect: Phaser.GameObjects.Rectangle | null = null;
      if (def.solid) {
        solidRect = this.add.rectangle(def.x, def.y - def.solid.h / 2, def.solid.w, def.solid.h);
        this.solids.add(solidRect);
        solidRect.setVisible(false);
        if (def.id) this.propSolids.set(def.id, solidRect);
      }
      if (def.id && def.sprite === 'prop/bin-upright') {
        this.bins.set(def.id, {
          id: def.id, x: def.x, y: def.y, upright: true, sprite, solid: solidRect,
        });
      }
      if (def.id && DRAGGABLE.test(def.id)) {
        this.dragTargets.push({ id: def.id, sprite, homeX: def.x, homeY: def.y });
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
          airborne: p.airborne, carriedId: scene.itemsMgr.heldBy('player')?.id ?? null,
          draggingId: p.draggingId,
        };
      },
      get flags() { return scene.mischief.flags; },
      get tasks() { return scene.mischief.taskState; },
      get npcs() {
        return scene.npcs.map((n) => ({
          id: n.def.id, x: Math.round(n.x), y: Math.round(n.y),
          state: n.mind.state, held: n.heldItemId,
        }));
      },
      openGate: (id: string) => scene.setGateOpen(id, true),
      fps: () => scene.game.loop.actualFps,
    };
  }
}
