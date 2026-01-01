import Phaser from "phaser";

class WorldScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private readonly tileSize = 32;
  private readonly gridWidth = 80;
  private readonly gridHeight = 60;

  constructor() {
    super("world");
  }

  create() {
    this.cameras.main.setZoom(1);
    this.cameras.main.setBackgroundColor("#0b1220");

    this.graphics = this.add.graphics();
    this.drawGrid();

    const cursors = this.input.keyboard?.createCursorKeys();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const tileX = Math.floor(worldPoint.x / this.tileSize);
      const tileY = Math.floor(worldPoint.y / this.tileSize);
      this.highlightTile(tileX, tileY);
    });

    this.events.on("update", () => {
      if (!cursors) return;
      const speed = 6;
      if (cursors.left?.isDown) this.cameras.main.scrollX -= speed;
      if (cursors.right?.isDown) this.cameras.main.scrollX += speed;
      if (cursors.up?.isDown) this.cameras.main.scrollY -= speed;
      if (cursors.down?.isDown) this.cameras.main.scrollY += speed;
    });
  }

  private drawGrid() {
    this.graphics.clear();
    this.graphics.lineStyle(1, 0x1f2a44, 1);

    for (let x = 0; x <= this.gridWidth; x += 1) {
      this.graphics.lineBetween(
        x * this.tileSize,
        0,
        x * this.tileSize,
        this.gridHeight * this.tileSize
      );
    }

    for (let y = 0; y <= this.gridHeight; y += 1) {
      this.graphics.lineBetween(
        0,
        y * this.tileSize,
        this.gridWidth * this.tileSize,
        y * this.tileSize
      );
    }
  }

  private highlightTile(tileX: number, tileY: number) {
    this.drawGrid();
    this.graphics.fillStyle(0x2dd4bf, 0.25);
    this.graphics.fillRect(
      tileX * this.tileSize,
      tileY * this.tileSize,
      this.tileSize,
      this.tileSize
    );
  }
}

export const createGame = (parent: string) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 600,
    backgroundColor: "#0b1220",
    scene: [WorldScene],
    physics: {
      default: "arcade"
    }
  });
};
