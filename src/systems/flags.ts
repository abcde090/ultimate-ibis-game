// Every mischief flag in the game. The runtime sets them; tasks read them.

export interface Flags {
  // park
  honked: boolean;
  chipStolen: boolean;
  binKnocked: boolean;
  trashGrabbed: boolean;
  sausageStolen: boolean;
  phoneInPond: boolean;
  groundskeeperChased: boolean;
  shedSneaked: boolean;
  // cafe
  croissantStolen: boolean;
  coffeeSpilled: boolean;
  signDragged: boolean;
  coinStolen: boolean;
  waiterSlipped: boolean;
  dogUnleashed: boolean;
  influencerPhotobombed: boolean;
  cafeSquawkedAt: string[]; // npc ids
  // market
  mangoStolen: boolean;
  fishStolen: boolean;
  scarfWorn: boolean;
  balloonPopped: boolean;
  signsSwapped: boolean;
  vendorChasedLong: boolean;
  fishInGuitarCase: boolean;
  magpieRobbedYou: boolean;
  // beach
  sandcastleTrampled: boolean;
  whistleStolen: boolean;
  towelDragged: boolean;
  sunscreenStolen: boolean;
  bucketStolen: boolean;
  dogEscapedBySwimming: boolean;
  seagullsScattered: boolean;
  beachSquawkedAt: string[];
  // oval finale
  ovalInfiltrated: boolean;
  keyStolen: boolean;
  trophyCaseOpen: boolean;
  goldenChipAtNest: boolean;
  [key: string]: boolean | string[];
}

export function makeFlags(): Flags {
  return {
    honked: false,
    chipStolen: false,
    binKnocked: false,
    trashGrabbed: false,
    sausageStolen: false,
    phoneInPond: false,
    groundskeeperChased: false,
    shedSneaked: false,
    croissantStolen: false,
    coffeeSpilled: false,
    signDragged: false,
    coinStolen: false,
    waiterSlipped: false,
    dogUnleashed: false,
    influencerPhotobombed: false,
    cafeSquawkedAt: [],
    mangoStolen: false,
    fishStolen: false,
    scarfWorn: false,
    balloonPopped: false,
    signsSwapped: false,
    vendorChasedLong: false,
    fishInGuitarCase: false,
    magpieRobbedYou: false,
    sandcastleTrampled: false,
    whistleStolen: false,
    towelDragged: false,
    sunscreenStolen: false,
    bucketStolen: false,
    dogEscapedBySwimming: false,
    seagullsScattered: false,
    beachSquawkedAt: [],
    ovalInfiltrated: false,
    keyStolen: false,
    trophyCaseOpen: false,
    goldenChipAtNest: false,
  };
}
