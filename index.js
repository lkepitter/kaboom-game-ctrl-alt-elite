// import kaboom lib
import kaboom from "https://unpkg.com/kaboom/dist/kaboom.mjs";
//import kaboom from "kaboom"; //This import will only work after rebuilding
import levels from "./levels/level1.js";

export function patrol(distance = 100, speed = 50, dir = 1) {
  return {
    id: "patrol",
    require: ["pos", "area", "sprite"],
    startingPos: vec2(0, 0),
    turn: true,
    add() {
      this.startingPos = this.pos;
      this.on("collide", (obj, side) => {
        if (side === "left" || side === "right") {
          dir = -dir;
        }
      });
    },
    update() {
      if (Math.abs(this.pos.x - this.startingPos.x) >= distance) {
        dir = -dir;
        if (this.turn === true) {
          this.flipX(false);
          this.turn = false;
        } else {
          console.log(this.turn);
          this.turn = true;
          this.flipX(true);
        }
      }
      this.move(speed * dir, 0);
    },
  };
}

function enemy() {
  return {
    id: "enemy",
    require: ["pos", "area", "sprite", "patrol"],
    isAlive: true,
    update() {},
    squash() {
      this.isAlive = false;
      this.unuse("patrol");
      this.stop();
      this.frame = 5;
      this.area.width = 16;
      this.area.height = 8;
      this.use(lifespan(0.5, { fade: 0.1 }));
    },
  };
}

function guy() {
  return {
    id: "guy",
    require: ["body", "area", "sprite", "bump", "scale"],
    smallAnimation: "walking",
    bigAnimation: "walking",
    smallStopFrame: 0,
    bigStopFrame: 0,
    smallJumpFrame: 5,
    bigJumpFrame: 5,
    smallIdleAnimation: "idle",
    bigIdleAnimation: "idle",
    smallJumpAnimation: "jumping",
    bigJumpAnimation: "jumping",
    smallAttackAnimation: "attacking",
    bigAttackAnimation: "attacking",
    isBig: false,
    isFrozen: false,
    isAlive: true,
    isAttacking: false,
    direction: 1, //vec2(1, 0),
    update() {
      if (this.isFrozen) {
        this.standing();
        return;
      }

      if (this.isAlive && !this.isGrounded()) {
        this.jumping();
      } else {
        if (isKeyDown("left") || isKeyDown("right")) {
          this.running();
        } else {
          this.standing();
        }
      }
    },
    bigger() {
      this.isBig = true;
      this.area.width = 24;
      this.area.height = 32;
      console.log(this.sprite);
      this.scale = 1.5;
    },
    smaller() {
      this.isBig = false;
      this.area.width = 16;
      this.area.height = 16;
      this.scale = 1;
    },
    standing() {
      // this.stop();
      // this.frame = this.isBig ? this.bigStopFrame : this.smallStopFrame;
      const animation = this.isBig
        ? this.bigIdleAnimation
        : this.smallIdleAnimation;
      if (this.curAnim() !== animation) {
        this.play(animation);
      }
    },
    jumping() {
      // this.stop();
      // this.frame = this.isBig ? this.bigJumpFrame : this.smallJumpFrame;
      const animation = this.isBig
        ? this.bigJumpAnimation
        : this.smallJumpAnimation;
      if (this.curAnim() !== animation) {
        this.play(animation);
      }
    },
    running() {
      const animation = this.isBig ? this.bigAnimation : this.smallAnimation;
      if (this.curAnim() !== animation) {
        this.play(animation);
      }
    },
    freeze() {
      this.isFrozen = true;
    },
    die() {
      this.unuse("body");
      this.bump();
      this.isAlive = false;
      this.freeze();
      this.use(lifespan(1, { fade: 1 }));
    },
    fall() {
      this.unuse("body");
      this.isAlive = false;
      this.freeze();
      this.use(lifespan(1, { fade: 1 }));
    },
    //add custom component for attacking
    attack() {
      this.isAttacking = true;
      //set animation
      //   const animation = this.isBig
      //     ? this.bigAttackAnimation
      //     : this.smallAttackAnimation;
      //   if (this.curAnim() !== animation) {
      //     console.log("animation is ", animation);
      //     this.play(animation);
      //   }
    },
  };
}

function bump(offset = 8, speed = 2, stopAtOrigin = true) {
  return {
    id: "bump",
    require: ["pos"],
    bumpOffset: offset,
    speed: speed,
    bumped: false,
    origPos: 0,
    direction: -1,
    update() {
      if (this.bumped) {
        this.pos.y = this.pos.y + this.direction * this.speed;
        if (this.pos.y < this.origPos - this.bumpOffset) {
          this.direction = 1;
        }
        if (stopAtOrigin && this.pos.y >= this.origPos) {
          this.bumped = false;
          this.pos.y = this.origPos;
          this.direction = -1;
        }
      }
    },
    bump() {
      this.bumped = true;
      this.origPos = this.pos.y;
    },
  };
}

function killed(player, death) {
  //had to edit this to add taking the player in as an argument as "player" is defined in the game loop
  // Player is dead
  if (player.isAlive == false) return; // Don't run it if player is already dead
  if (death === "pit") {
    player.fall();
  } else {
    player.die();
  }
  add([
    text("Game Over", { size: 24 }),
    pos(toWorld(vec2(160, 120))),
    color(255, 255, 255),
    origin("center"),
    layer("ui"),
  ]);
  wait(2, () => {
    go("start");
  });
}

// initialize kaboom context
kaboom({
  background: [134, 135, 247],
  width: 320,
  height: 240,
  scale: 2,
});
//LoadRoot sets the folder
loadRoot("sprites/");
//then we set a sprite with its name and image. Aseprite includes a json for animation from an app called Aseprite (https://www.aseprite.org/)
loadAseprite("enemies", "enemies.png", "enemies.json");
loadSprite("guy", "guy_sprite.png", {
  sliceX: 5,
  sliceY: 5,
  anims: {
    idle: { from: 0, to: 2, speed: 6 },
    walking: { from: 5, to: 7 },
    attacking: { from: 10, to: 14 },
    jumping: { from: 8, to: 9, speed: 2 },
    damage: { from: 4, to: 4 },
    kicking: { from: 15, to: 17 },
    pushing: { from: 18, to: 20 },
    projectile1: { from: 21, to: 21 },
    projectile2: { from: 22, to: 22 },
  },
});
loadSprite("badGuy", "badguy_sprite.png", {
  sliceX: 6,
  sliceY: 5,
  anims: {
    b1idle: { from: 0, to: 1 },
    b1damage: { from: 2, to: 2 },
    b1attack: { from: 3, to: 3 },
    b1walk: { from: 6, to: 10, loop: true },
    b2idle: { from: 18, to: 20 },
    b2damage: { from: 21, to: 21 },
    b2attack: { from: 20, to: 20 },
    b2walk: { from: 24, to: 29 },
  },
});
loadSprite("ground", "ground.png");
loadSprite("questionBox", "questionBox.png");
loadSprite("emptyBox", "emptyBox.png");
loadSprite("brick", "brick.png");
loadSprite("coin", "coin.png");
loadSprite("bigMushy", "bigMushy.png");
loadSprite("pipeTop", "pipeTop.png");
loadSprite("pipeBottom", "pipeBottom.png");
loadSprite("shrubbery", "shrubbery.png");
loadSprite("hill", "hill.png");
loadSprite("cloud", "cloud.png");
loadSprite("castle", "castle.png");

//LEVEL CONFIG - Objects, characters, background
const levelConf = {
  // grid size
  width: 16,
  height: 16,
  pos: vec2(0, 0), //where the map is positioned in the canvas
  // define each object as a list of components
  //Some components are built-in. Sprite gives a character an avatar.
  //Body makes a character respond to gravity. Solid makes the character solid so other characters can't move through it.
  "=": () => [sprite("ground"), area(), solid(), origin("bot"), "ground"],
  "-": () => [sprite("brick"), area(), solid(), origin("bot"), "brick"],
  H: () => [
    sprite("castle"),
    area({ width: 1, height: 240 }),
    origin("bot"),
    "castle",
  ],
  "?": () => [
    sprite("questionBox"),
    area(),
    solid(),
    origin("bot"),
    "questionBox",
    "coinBox",
  ],
  b: () => [
    sprite("questionBox"),
    area(),
    solid(),
    origin("bot"),
    "questionBox",
    "mushyBox",
  ],
  //The bump component is a custom component
  "!": () => [
    sprite("emptyBox"),
    area(),
    solid(),
    bump(),
    origin("bot"),
    "emptyBox",
  ],
  c: () => [
    sprite("coin"),
    area(),
    //solid(),
    bump(64, 8),
    cleanup(),
    lifespan(0.4, { fade: 0.01 }),
    origin("bot"),
    "coin",
  ],
  //patrol is also a custom component
  M: () => [
    sprite("bigMushy"),
    area(),
    //solid(),
    patrol(10000),
    body(),
    cleanup(),
    origin("bot"),
    "bigMushy",
  ],
  "|": () => [sprite("pipeBottom"), area(), solid(), origin("bot"), "pipe"],
  _: () => [sprite("pipeTop"), area(), solid(), origin("bot"), "pipe"],
  // enemy is a custom component too
  E: () => [
    //because we specify the sprite should use the walking animation, it will spawn using this
    sprite("badGuy", {
      anim: "b1walk",
      animSpeed: 1,
      width: 25,
      height: 25,
      flipX: "true",
    }),
    area({ width: 16, height: 16 }),
    solid(),
    body(),
    patrol(50),
    enemy(),
    origin("bot"),
    "badGuy",
  ],
  p: () => [
    sprite("guy", { frame: 0, width: 25, height: 25 }),
    area({ width: 16, height: 16 }),
    body(),
    scale(),
    guy(),
    bump(150, 20, false),
    origin("bot"),
    "player",
  ],
};

//START SCREEN
//String is the name of the scene
//Function specifies the scene
scene("start", () => {
  //add is adding things to the scene
  add([
    //text, specifying what to show and then defining the size. Then other components are further defining the text. I dunno how it knows it's part of text
    text("Press enter to start", { size: 24 }),
    //The position of this text
    pos(vec2(160, 120)),
    //The origin of the text
    origin("center"),
    //The colour of the text
    color(255, 255, 255),
  ]);

  //Then call the built-in function onKeyRelease which listens for the enter key being released to GO to the "game" scene
  onKeyRelease("enter", () => {
    go("game");
  });
});

//When the game starts, we go to the "start" scene
go("start");

//GAME BEGINS
//Here we define the game scene. It takes the parameter of the current level (the position in our levels array)
//You can specify any parameters you like or need when creating a scene, and you can pass values from one scene to another.
//This is very useful, for example if you want to pass the player score to an end game scene, or pass in player options from the start scene.
scene("game", (levelNumber = 0) => {
  //layers let us have backgrounds, game objects and ui on separate layers. We then specify the default layer, "game", so that if we don't
  //specifiy a layer component in a game object, by default it's added to the game layer.
  layers(["bg", "game", "ui"], "game");

  //call the built-in addLevel function to create the current level, using the levelConf as our config for the level
  const level = addLevel(levels[levelNumber], levelConf);

  //CREATE LEVEL
  //spawn some sprites to the background layer. i assume "origin("bot")" means it starts at the bottom
  add([sprite("cloud"), pos(20, 50), layer("bg")]);

  add([sprite("hill"), pos(32, 208), layer("bg"), origin("bot")]);

  add([sprite("shrubbery"), pos(200, 208), layer("bg"), origin("bot")]);

  //display some text to let the player know what level they're on. it's created on the UI layer and has a lifespan to represent how long it shows on the screen
  add([
    text("Level " + (levelNumber + 1), { size: 24 }),
    pos(vec2(160, 120)),
    color(255, 255, 255),
    origin("center"),
    layer("ui"),
    lifespan(1, { fade: 0.5 }),
  ]);

  //spawn the player ("p" in the config) on the level at position 1, 10. This could be done in the levels map, but if we do it here
  // we can set the player as a variable for later use. after choosing the object to spawn, set the X axis, then Y (remember Y increases from 0 further down the screen)
  const player = level.spawn("p", 1, 10);

  const goal = level.spawn("H", 84, 0);
  const startCam = 160;
  const playerStart = 16;

  let SPEED = 120;

  //ENEMY COLLISION
  let canSquash = false;

  player.onCollide("badGuy", (baddy) => {
    if (baddy.isAlive == false) return;
    if (canSquash) {
      // Player has jumped on the bad guy:
      baddy.squash();
    } else {
      //Player takes damage.
      if (player.isBig) {
        player.smaller();
      } else {
        //Player is dead
        killed(player);
      }
    }
  });

  //OBJECT COLLISION
  player.on("headbutt", (obj) => {
    if (obj.is("questionBox")) {
      if (obj.is("coinBox")) {
        let coin = level.spawn("c", obj.gridPos.sub(0, 1));
        coin.bump();
      } else if (obj.is("mushyBox")) {
        level.spawn("M", obj.gridPos.sub(0, 1));
      }
      //to replace the questionBox with an empty box, we first record its position,
      var pos = obj.gridPos;
      //then destroy it,
      destroy(obj);
      //and spawn a new empty box (! in the levelConf) to take its place.
      var box = level.spawn("!", pos);
      //Finally, we bump this new box to give it the motion we want.
      box.bump();
    }
  });

  player.onCollide("bigMushy", (mushy) => {
    destroy(mushy);
    player.bigger();
  });

  //GOAL
  player.onCollide("castle", (castle, side) => {
    player.freeze();
    add([
      text("Well Done!", { size: 24 }),
      pos(toWorld(vec2(160, 120))),
      color(255, 255, 255),
      origin("center"),
      layer("ui"),
    ]);
    wait(1, () => {
      let nextLevel = levelNumber + 1;

      if (nextLevel >= levels.length) {
        go("start");
      } else {
        go("game", nextLevel);
      }
    });
  });

  //PLAYER CONTROLS/MOVEMENT
  //while the right key is held, don't change the sprite direction, but move the player at speed on the X axis and 0 on the Y axid
  onKeyDown("right", () => {
    //If statement to handle if frozen
    if (player.isFrozen) return;
    //If statement added to prevent player moving off the end of the level
    if (player.pos.x < goal.pos.x) {
      player.flipX(false);
      player.direction = 1;
      player.move(SPEED, 0);
    }
  });

  //while the left key is held, flip the sprite (mirror it) to face the other way and move the player at negative speed on the X axis
  //The if statement only lets the player move if they're not at the edge of the screen.
  //To help us figure out if Player is near the edge of the screen, and not just at the beginning of the level, we can use the toScreen function,
  //which converts "game world" or level co-ordinates to actual screen co-ordinates.
  onKeyDown("left", () => {
    //If statement to handle if frozen
    if (player.isFrozen) return;
    player.flipX(true);
    player.direction = -1;
    //if (toScreen(player.pos).x > 20) {
    if (player.pos.x > playerStart) {
      player.move(-SPEED, 0);
    }
  });
  let isJumping = false;
  //when the space key is pressed, if the player is on a solid object, use the jump method to make them jump
  onKeyPress("space", () => {
    if (player.isAlive && player.isGrounded()) {
      player.jump();
      isJumping = true;
      //originally set so player can only squash an enemy if they jump. Changed this so it's just if the player isn't grounded.
      //canSquash = true;
    }
  });

  function spawnSwing(p, dir) {
    let x = p.x - dir;
    console.log("Swing: " + p.add(dir) + "x: " + x);
    console.log("playerdir" + dir);
    //had to change pos(p) to move the y position higher up
    if (dir > 0) {
      const obj = add([
        sprite("enemies", { anim: "Hammer", height: 50, width: 50 }),
        pos(p.x + dir, p.y - 50),
        area(),
        "slash",
      ]);
      wait(0.12, () => {
        destroy(obj);
      });
    } else {
      const obj = add([
        sprite("enemies", {
          anim: "Hammer",
          flipX: "true",
          height: 50,
          width: 50,
        }),
        pos(p.x + dir * 50, p.y - 50),
        area(),
        "slash",
      ]);
      wait(0.12, () => {
        destroy(obj);
      });
    }
  }

  collides("slash", "badGuy", (k, bg) => {
    wait(0.5, () => {
      destroy(k);
    });
    bg.squash();
    //scoreLabel.value++
    //scoreLabel.text = scoreLabel.value
  });

  //I added a run key. This is reset in .onUpdate if the player is not holding down the run key
  onKeyPress("e", () => {
    console.log(SPEED);
    if (player.isAlive && player.isGrounded() && isKeyDown("e")) {
      SPEED = 200;
    }
  });
  let canSlash = true;
  //Try to add an attack button
  onKeyPress("f", () => {
    console.log("Attacking");
    spawnSwing(player.pos, player.direction);
    // console.log(
    //   "player pos:" +
    //     player.pos +
    //     " cloud pos: " +
    //     player.pos.add(player.direction)
    // );
    if (player.isAlive && isKeyDown("f")) {
      player.attack();
      canSlash = false;
    }
  });

  //PLAYER
  //handle the camera movement. use onUpdate to call a function each frame that is rendered.
  player.onUpdate(() => {
    //ABLE TO ATTACK
    if (player.isAlive && player.isGrounded()) {
      canSquash = false;
      isJumping = false;
    }
    if (player.isAlive && !player.isGrounded()) {
      canSquash = true;
    }
    if (player.isAlive && !canSlash) {
      canSlash = true;
    }
    if (player.isAlive && !player.isGrounded() && isJumping) {
      //player.angle += 420 * dt();
      //console.log(player.angle);
    }

    //FALL IN PIT
    // Check if Player has fallen off the screen. check if Player's y co-ordinate is greater than the height of the Kaboom window, PLUS the size of one platform block, which is 16 pixels
    if (player.pos.y > height() + 16) {
      killed(player, "pit");
    }

    if (!isKeyDown("e")) {
      SPEED = 120;
    }

    if (!player.isAttacking) {
      canSlash = false;
    }

    //CAMERA
    // center camera to player by using camPos function
    var currCam = camPos();
    //the original if statement makes sure the player isn't going back to the left
    //if (currCam.x < player.pos.x) {
    //This one only has the camera follow the player if they're past the mid-point of the first screen
    if (player.pos.x > startCam - 1 && player.pos.x < goal.pos.x) {
      camPos(player.pos.x, currCam.y);
    } else if (player.pos.x > goal.pos.x) {
      camPos(goal.pos.x, currCam.y);
    } else {
      camPos(startCam, currCam.y);
    }
    console.log(player.pos.x, currCam.x, goal.pos.x);
    //console.log(canSlash);
  });
});
