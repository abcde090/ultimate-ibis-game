// Procedural canvas drawing for every character, item and prop.
// All draw calls take world coordinates; the caller translates by camera.

export function drawShadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(20, 40, 20, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, w, w * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawIbis(ctx, ibis) {
  const { x, y, facing } = ibis;
  const step = Math.sin(ibis.walkPhase) * (ibis.moving ? 1 : 0);
  const bob = Math.abs(Math.sin(ibis.walkPhase)) * (ibis.moving ? 2.5 : 0);
  const honking = ibis.honkTimer > 0;

  drawShadow(ctx, x, y, 18);

  ctx.save();
  ctx.translate(x, y - bob);
  if (facing === 1) ctx.scale(-1, 1); // art is authored facing left

  // Legs — skinny, dark, stepping.
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, -16); ctx.lineTo(-4 + step * 5, 0);
  ctx.moveTo(5, -16); ctx.lineTo(5 - step * 5, 0);
  ctx.stroke();

  // Body — grubby white, tilted forward.
  ctx.fillStyle = '#f4f1e8';
  ctx.strokeStyle = '#c9c4b4';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(2, -25, 17, 11, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Black tail feathers.
  ctx.fillStyle = '#1f1f1f';
  ctx.beginPath();
  ctx.moveTo(13, -28);
  ctx.quadraticCurveTo(26, -28, 24, -18);
  ctx.quadraticCurveTo(17, -20, 11, -19);
  ctx.closePath();
  ctx.fill();

  // Neck — white S-curve up to the head.
  ctx.strokeStyle = '#f4f1e8';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-9, -28);
  ctx.quadraticCurveTo(-16, -38, -14, -46);
  ctx.stroke();

  // Bald black head.
  ctx.fillStyle = '#1f1f1f';
  ctx.beginPath();
  ctx.ellipse(-15, -49, 6.5, 6, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // The famous long, down-curved beak.
  ctx.strokeStyle = '#1f1f1f';
  ctx.lineCap = 'round';
  if (honking) {
    ctx.lineWidth = 3;
    ctx.beginPath(); // upper
    ctx.moveTo(-20, -50);
    ctx.quadraticCurveTo(-34, -48, -38, -38);
    ctx.stroke();
    ctx.beginPath(); // lower, swung open
    ctx.moveTo(-20, -47);
    ctx.quadraticCurveTo(-30, -40, -31, -28);
    ctx.stroke();
  } else {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-20, -49);
    ctx.quadraticCurveTo(-36, -46, -39, -33);
    ctx.stroke();
  }

  // Eye.
  ctx.fillStyle = '#e8e4d8';
  ctx.beginPath();
  ctx.arc(-15.5, -50.5, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (honking) drawBubble(ctx, x, y - 78, 'SQUAWK!', '#e0533d');
}

const HUMAN_STYLES = {
  picnicker: { shirt: '#d96aa0', skin: '#e8b48c', hair: '#5a3a22', hat: null },
  bbqdad: { shirt: '#5a7d9c', skin: '#dba072', hair: '#888', hat: null, apron: '#e8e0d0' },
  groundskeeper: { shirt: '#7d9c5a', skin: '#c98c5f', hair: '#444', hat: '#c9b370' },
  cafecustomer: { shirt: '#9c6ad9', skin: '#f0c8a0', hair: '#222', hat: '#333' },
};

export function drawHuman(ctx, npc) {
  const { x, y, facing } = npc;
  const style = HUMAN_STYLES[npc.def.variant] || HUMAN_STYLES.picnicker;
  const step = Math.sin(npc.walkPhase) * (npc.moving ? 1 : 0);
  const agitated = npc.mind.state === 'chase' || npc.mind.state === 'shoo';
  const startled = npc.mind.state === 'startled';
  const hop = startled ? Math.abs(Math.sin(npc.mind.timer * 18)) * 6 : 0;

  drawShadow(ctx, x, y, 15);

  ctx.save();
  ctx.translate(x, y - hop);
  if (facing === 1) ctx.scale(-1, 1);

  // Legs.
  ctx.strokeStyle = '#41454d';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, -22); ctx.lineTo(-5 + step * 6, 0);
  ctx.moveTo(5, -22); ctx.lineTo(5 - step * 6, 0);
  ctx.stroke();

  // Torso.
  ctx.fillStyle = style.shirt;
  ctx.beginPath();
  ctx.roundRect(-11, -52, 22, 32, 8);
  ctx.fill();
  if (style.apron) {
    ctx.fillStyle = style.apron;
    ctx.beginPath();
    ctx.roundRect(-8, -44, 16, 23, 4);
    ctx.fill();
  }

  // Arms — flailing overhead when agitated.
  ctx.strokeStyle = style.skin;
  ctx.lineWidth = 4.5;
  if (agitated || startled) {
    const wave = Math.sin((npc.walkPhase || 0) * 2 + (startled ? npc.mind.timer * 20 : 0)) * 6;
    ctx.beginPath();
    ctx.moveTo(-10, -48); ctx.lineTo(-17, -64 + wave);
    ctx.moveTo(10, -48); ctx.lineTo(17, -64 - wave);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-10, -48); ctx.lineTo(-13, -28 + step * 3);
    ctx.moveTo(10, -48); ctx.lineTo(13, -28 - step * 3);
    ctx.stroke();
  }

  // Head.
  ctx.fillStyle = style.skin;
  ctx.beginPath();
  ctx.arc(0, -61, 9, 0, Math.PI * 2);
  ctx.fill();

  // Hair or hat.
  if (style.hat) {
    ctx.fillStyle = style.hat;
    ctx.beginPath();
    ctx.ellipse(0, -66, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-7, -76, 14, 11, 4);
    ctx.fill();
  } else {
    ctx.fillStyle = style.hair;
    ctx.beginPath();
    ctx.arc(0, -64, 8.5, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (npc.alertTimer > 0) drawBubble(ctx, x, y - 92, '!', '#e0533d');
  else if (npc.grumbleTimer > 0) drawBubble(ctx, x, y - 92, 'hmph', '#666');
}

function drawBubble(ctx, x, y, text, color) {
  ctx.save();
  ctx.font = 'bold 15px Verdana, sans-serif';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = 'rgba(253, 246, 227, 0.95)';
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 12, w, 24, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

export function drawItem(ctx, item) {
  const { x, y } = item;
  const held = item.holder !== null;
  if (!held && !item.inPond) drawShadow(ctx, x, y + 3, 7);

  ctx.save();
  ctx.translate(x, y);

  if (item.inPond) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 4, 14, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  switch (item.kind) {
    case 'chip':
      ctx.fillStyle = '#f2c14e';
      ctx.strokeStyle = '#c79a30';
      ctx.lineWidth = 1;
      ctx.save();
      ctx.rotate(-0.4);
      ctx.beginPath(); ctx.roundRect(-9, -3, 18, 6, 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      break;
    case 'goldenchip': {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1.5;
      ctx.save();
      ctx.rotate(-0.4);
      ctx.beginPath(); ctx.roundRect(-11, -4, 22, 8, 3); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff8d0';
      ctx.beginPath(); ctx.arc(6, -6, 1.6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'sausage':
      ctx.fillStyle = '#a05a32';
      ctx.strokeStyle = '#7a4022';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(-10, -3.5, 20, 7, 4); ctx.fill(); ctx.stroke();
      break;
    case 'sandwich':
      ctx.fillStyle = '#e8d8a8';
      ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(9, 4); ctx.lineTo(0, -7); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b89858'; ctx.lineWidth = 1; ctx.stroke();
      break;
    case 'thong':
      ctx.fillStyle = '#e87a30';
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 10, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(-3, 2); ctx.moveTo(0, -7); ctx.lineTo(4, 2); ctx.stroke();
      break;
    case 'phone':
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.roundRect(-5, -9, 10, 18, 2); ctx.fill();
      ctx.fillStyle = item.inPond ? '#234' : '#6cf';
      ctx.fillRect(-3.5, -7, 7, 13);
      break;
    case 'trash':
      if (item.trashKind === 'can') {
        ctx.fillStyle = '#c0392b';
        ctx.beginPath(); ctx.roundRect(-4, -8, 8, 14, 2); ctx.fill();
        ctx.fillStyle = '#ddd'; ctx.fillRect(-4, -8, 8, 3);
      } else if (item.trashKind === 'peel') {
        ctx.strokeStyle = '#e8d44e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-6, 4); ctx.quadraticCurveTo(0, -8, 6, 3); ctx.stroke();
      } else {
        ctx.fillStyle = '#cfd8e0';
        ctx.beginPath();
        ctx.moveTo(-7, 0); ctx.lineTo(-2, -6); ctx.lineTo(3, -1); ctx.lineTo(7, -5);
        ctx.lineTo(6, 4); ctx.lineTo(-3, 5); ctx.closePath();
        ctx.fill();
      }
      break;
    default:
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawBin(ctx, bin) {
  const { x, y } = bin;
  ctx.save();
  ctx.translate(x, y);
  if (bin.upright) {
    drawShadow(ctx, 0, 0, 16);
    ctx.fillStyle = '#3d6b35';
    ctx.strokeStyle = '#2a4d24';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-12, -34, 24, 34, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a4d24';
    ctx.beginPath(); ctx.roundRect(-14, -38, 28, 6, 2); ctx.fill();
  } else {
    drawShadow(ctx, 6, 0, 20);
    ctx.save();
    ctx.rotate(1.45);
    ctx.fillStyle = '#3d6b35';
    ctx.strokeStyle = '#2a4d24';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-10, -30, 22, 32, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
    // lid on the ground nearby
    ctx.fillStyle = '#2a4d24';
    ctx.beginPath(); ctx.ellipse(-22, 4, 12, 5, 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawTree(ctx, tree) {
  const { x, y } = tree;
  drawShadow(ctx, x, y, 30);
  ctx.fillStyle = '#cfc4ad';
  ctx.strokeStyle = '#a89878';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.quadraticCurveTo(x - 4, y - 40, x - 10, y - 64);
  ctx.lineTo(x + 8, y - 64);
  ctx.quadraticCurveTo(x + 5, y - 40, x + 7, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const leaves = [
    [-18, -78, 22], [14, -84, 24], [-2, -96, 26], [24, -70, 16], [-28, -66, 15],
  ];
  for (const [lx, ly, lr] of leaves) {
    ctx.fillStyle = '#6a8f4f';
    ctx.beginPath(); ctx.arc(x + lx, y + ly, lr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(x + lx - 4, y + ly - 5, lr * 0.7, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawTable(ctx, rect) {
  const { x, y, w, h } = rect;
  drawShadow(ctx, x + w / 2, y + h - 4, w * 0.55);
  ctx.fillStyle = '#a87848';
  ctx.strokeStyle = '#7a5430';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y - 14, w, h, 6); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(122, 84, 48, 0.6)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + (w / 5) * i, y - 12);
    ctx.lineTo(x + (w / 5) * i, y + h - 16);
    ctx.stroke();
  }
  // Picnic blanket corner.
  ctx.fillStyle = '#d94f4f';
  ctx.beginPath(); ctx.roundRect(x + 8, y - 8, 52, 40, 3); ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 8, y + i * 13);
    ctx.lineTo(x + 60, y + i * 13);
    ctx.stroke();
  }
}

export function drawBBQ(ctx, rect) {
  const { x, y, w, h } = rect;
  drawShadow(ctx, x + w / 2, y + h - 2, w * 0.55);
  ctx.fillStyle = '#4a4a52';
  ctx.strokeStyle = '#2e2e34';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y - 10, w, h, 5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 10 + (h / 6) * i);
    ctx.lineTo(x + w - 8, y - 10 + (h / 6) * i);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(200,200,200,0.25)';
  ctx.beginPath(); ctx.arc(x + w * 0.3, y - 26, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + w * 0.5, y - 38, 10, 0, Math.PI * 2); ctx.fill();
}

export function drawCafe(ctx, rect) {
  const { x, y, w, h } = rect;
  drawShadow(ctx, x + w / 2, y + h, w * 0.55);
  ctx.fillStyle = '#e8e0d0';
  ctx.strokeStyle = '#b8a888';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y - 20, w, h + 10, 4); ctx.fill(); ctx.stroke();
  // Striped awning.
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i % 2 ? '#fff' : '#d94f4f';
    ctx.beginPath();
    ctx.roundRect(x - 8 + i * ((w + 16) / 7), y - 36, (w + 16) / 7, 20, 2);
    ctx.fill();
  }
  ctx.fillStyle = '#2b2b2b';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CAFE', x + w / 2, y + 14);
  // Counter window.
  ctx.fillStyle = '#5a4a38';
  ctx.beginPath(); ctx.roundRect(x + 24, y - 8, w - 48, 34, 3); ctx.fill();
}

export function drawNest(ctx, nest) {
  const { x, y, r } = nest;
  ctx.save();
  ctx.strokeStyle = '#8a6a3f';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  // A scruffy ring of sticks.
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const wobble = Math.sin(i * 7.3) * 5;
    const sx = x + Math.cos(a) * (r * 0.55 + wobble);
    const sy = y + Math.sin(a) * (r * 0.34 + wobble * 0.5);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a + Math.PI / 2 + Math.sin(i * 3.7) * 0.5);
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(138, 106, 63, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.6, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
