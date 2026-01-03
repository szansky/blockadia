import Phaser from "phaser";
import { translations, Language } from "../i18n";

type VillagerState = "idle" | "walking" | "gathering" | "returning";

interface VillagerData {
  sprite: Phaser.GameObjects.Sprite;
  state: VillagerState;
  targetResource: Phaser.GameObjects.Sprite | null;
  gatheringTimer?: Phaser.Time.TimerEvent;
  carrying: { type: string; amount: number } | null;
  textLabel?: Phaser.GameObjects.Text;
}

interface ResourceCounts {
  wood: number;
  stone: number;
  gold: number;
  metal: number;
}

interface PopulationStats {
  current: number;
  max: number;
}

interface Building {
  id: string; // Unique ID
  sprite: Phaser.GameObjects.Sprite;
  type: string;
  level: number;
  isUpgrading: boolean;
  upgradeProgress: number;
  isRecruiting: boolean;
  recruitProgress: number;
  upgradeTimer?: Phaser.Time.TimerEvent;
  recruitTimer?: Phaser.Time.TimerEvent;
  tileX: number;
  tileY: number;
}

interface DroppedResource {
  sprite: Phaser.GameObjects.Sprite;
  type: string;
  amount: number;
}

class WorldScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private highlightGraphics!: Phaser.GameObjects.Graphics;
  private readonly tileSize = 64;
  private readonly gridWidth = 40; // Smaller map
  private readonly gridHeight = 30;


  // Village position
  private villageCenterX!: number;
  private villageCenterY!: number;

  // Villagers
  private villagers: VillagerData[] = [];

  // Selection
  private selectedUnit: VillagerData | null = null;
  private selectionIndicator!: Phaser.GameObjects.Graphics;
  private gatheringText!: Phaser.GameObjects.Text;

  // Store resource positions for click detection
  // Pop cap
  private maxPopulation = 4;

  private resourceSprites: Phaser.GameObjects.Sprite[] = [];
  private droppedResources: DroppedResource[] = [];

  // Resource counts
  private resources: ResourceCounts = { wood: 0, stone: 0, gold: 0, metal: 0 };

  private villageSprite!: Phaser.GameObjects.Sprite;
  private buildings: Building[] = [];
  private selectedBuildingId: string | null = null;

  // Building System
  private isBuildingMode = false;
  private buildingType: string | null = null;
  private ghostBuilding!: Phaser.GameObjects.Sprite;
  private constructionSites: { sprite: Phaser.GameObjects.Sprite; timer: Phaser.Time.TimerEvent; finishedBuildingType: string }[] = [];

  private language: Language = "en";

  // Event handler references
  private handleSpawnVillager = () => this.spawnVillager();

  private handleLanguageChange = ((e: CustomEvent<Language>) => {
    this.language = e.detail;
    if (this.gatheringText) this.updateGatheringText();
  }) as EventListener;

  private handleRequestUpgrade = ((e: CustomEvent<{ id: string }>) => {
    const building = this.buildings.find(b => b.id === e.detail.id);
    if (building && !building.isUpgrading && building.level < 2) {
      this.startUpgrade(building);
    }
  }) as EventListener;

  private handleRequestRecruit = ((e: CustomEvent<{ id: string }>) => {
    const building = this.buildings.find(b => b.id === e.detail.id);
    if (building && !building.isRecruiting && this.villagers.length < 20) {
      this.startRecruit(building);
    }
  }) as EventListener;

  private handleSpendResources = ((e: CustomEvent<ResourceCounts>) => {
    const cost = e.detail;
    this.resources.wood -= cost.wood;
    this.resources.stone -= cost.stone;
    this.resources.gold -= cost.gold;
    this.resources.metal -= cost.metal;
    this.emitResourceUpdate();
  }) as EventListener;

  private handleEnterBuildMode = ((e: CustomEvent<string>) => {
    this.isBuildingMode = true;
    this.buildingType = e.detail;

    // Create ghost building
    if (!this.ghostBuilding) {
      this.ghostBuilding = this.add.sprite(0, 0, "construction_site"); // Use construction layout as ghost
      this.ghostBuilding.setAlpha(0.6);
      this.ghostBuilding.setVisible(false);
    }
    this.ghostBuilding.setTexture("construction_site");
    this.ghostBuilding.setVisible(true);
    this.ghostBuilding.setDisplaySize(this.tileSize * 3, this.tileSize * 3);

    // Deselect unit
    if (this.selectedUnit) {
      this.selectedUnit.sprite.clearTint();
      this.selectedUnit = null;
      this.selectionIndicator.setVisible(false);
    }
  }) as EventListener;

  private startUpgrade(building: Building) {
    building.isUpgrading = true;
    building.upgradeProgress = 0;

    // Timer logic handled by Phaser Event
    building.upgradeTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        building.upgradeProgress += (100 / (10000 / 100)); // 10s
        if (building.upgradeProgress >= 100) {
          this.finalizeUpgrade(building);
        }
        this.emitBuildingUpdate(building);
      }
    });
  }

  private finalizeUpgrade(building: Building) {
    building.isUpgrading = false;
    building.upgradeProgress = 0;
    building.level = 2;
    if (building.upgradeTimer) building.upgradeTimer.remove();
    building.sprite.setTexture("village_v2");

    // Particles
    const particles = this.add.particles(0, 0, "particle", {
      x: building.sprite.x,
      y: building.sprite.y,
      speed: { min: 50, max: 150 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      quantity: 50,
      blendMode: 'ADD'
    });
    this.time.delayedCall(1000, () => particles.destroy());

    this.emitBuildingUpdate(building);
  }

  private startRecruit(building: Building) {
    building.isRecruiting = true;
    building.recruitProgress = 0;

    building.recruitTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        building.recruitProgress += (100 / (2000 / 100)); // 2s
        if (building.recruitProgress >= 100) {
          this.finalizeRecruit(building);
        }
        this.emitBuildingUpdate(building);
      }
    });
  }

  private finalizeRecruit(building: Building) {
    building.isRecruiting = false;
    building.recruitProgress = 0;
    if (building.recruitTimer) building.recruitTimer.remove();
    this.spawnVillager(building.sprite.x, building.sprite.y); // Spawn at building
    this.emitBuildingUpdate(building);
  }

  private emitBuildingUpdate(building: Building) {
    window.dispatchEvent(new CustomEvent("buildingUpdate", {
      detail: {
        id: building.id,
        level: building.level,
        isUpgrading: building.isUpgrading,
        upgradeProgress: building.upgradeProgress,
        isRecruiting: building.isRecruiting,
        recruitProgress: building.recruitProgress
      }
    }));
  }

  constructor() {
    super("world");
  }

  preload() {
    this.load.image("grass", "/assets/grass.png");
    this.load.image("fog", "/assets/fog.png");
    this.load.image("particle", "/assets/particle.png"); // Magic particle
    this.load.image("tree", "/assets/tree.png");
    this.load.image("stone", "/assets/stone.png");
    this.load.image("gold", "/assets/gold.png");
    this.load.image("metal", "/assets/metal.png");
    this.load.image("village", "/assets/village.png");
    this.load.image("villager", "/assets/villager.png");
    this.load.image("village_v2", "/assets/village_v2.png");
    this.load.image("hammer", "/assets/hammer.png");
    this.load.image("hammer", "/assets/hammer.png");
    this.load.image("construction_site", "/assets/construction_site.png");
    this.load.image("farm", "/assets/farm.png"); // Farm Asset
  }

  create() {
    this.cameras.main.setZoom(1);
    this.cameras.main.setBackgroundColor("#2d5a27"); // Infinite green background


    this.graphics = this.add.graphics();
    this.highlightGraphics = this.add.graphics();
    this.selectionIndicator = this.add.graphics();



    // Magic particles (delicate/ambient)
    const particles = this.add.particles(0, 0, "particle", {
      x: { min: -this.gridWidth * this.tileSize, max: this.gridWidth * this.tileSize * 2 },
      y: { min: -this.gridHeight * this.tileSize, max: this.gridHeight * this.tileSize * 2 },
      lifespan: { min: 10000, max: 20000 }, // Slower float
      alpha: { start: 0.3, end: 0 }, // More transparent/subtle
      scale: { start: 0.05, end: 0.15 }, // Smaller
      speed: { min: 2, max: 10 }, // Slower movement
      angle: { min: 0, max: 360 },
      blendMode: "ADD",
      frequency: 150,
      quantity: 1
    });

    // Adjust particle depth to be visible in fog but behind map
    particles.setDepth(-1.5);

    // Fill map area with solid green color (Performance + Style request)
    const mapWidth = this.gridWidth * this.tileSize;
    const mapHeight = this.gridHeight * this.tileSize;

    // Create the background render texture
    const backgroundTexture = this.add.renderTexture(0, 0, mapWidth, mapHeight);
    backgroundTexture.setDepth(-1);

    // Simple solid fill is fastest and matches user request
    backgroundTexture.fill(0x2d5a27); // A pleasant grass green

    this.drawGrid();

    // Place Village
    this.villageCenterX = Math.floor(this.gridWidth / 2);
    this.villageCenterY = Math.floor(this.gridHeight / 2);
    this.villageSprite = this.add.sprite(
      this.villageCenterX * this.tileSize + this.tileSize * 1.5,
      this.villageCenterY * this.tileSize + this.tileSize * 1.5,
      "village"
    );
    this.villageSprite.setDisplaySize(this.tileSize * 3, this.tileSize * 3);

    // Make village interactive
    this.villageSprite.setInteractive({ useHandCursor: true });
    // Register Initial Village
    const initialId = crypto.randomUUID();
    this.buildings.push({
      id: initialId,
      sprite: this.villageSprite,
      type: "village",
      level: 1,
      isUpgrading: false,
      upgradeProgress: 0,
      isRecruiting: false,
      recruitProgress: 0,
      tileX: this.villageCenterX,
      tileY: this.villageCenterY
    });

    this.villageSprite.on("pointerdown", () => {
      const b = this.buildings.find(b => b.id === initialId);
      if (b) this.openBuildingModal(b);
    });

    // Center camera
    this.cameras.main.centerOn(this.villageCenterX * this.tileSize, this.villageCenterY * this.tileSize);

    // Generate resources
    this.generateForests(6, 12);
    this.generateMines("stone", 2, 3);
    this.generateMines("gold", 2, 2);
    this.generateMines("metal", 2, 2);

    // Create initial villager
    this.spawnVillager();

    // Gathering text
    this.gatheringText = this.add.text(0, 0, "", {
      fontSize: "12px",
      color: "#ffff00",
      backgroundColor: "#000000aa",
      padding: { x: 4, y: 2 }
    });
    this.gatheringText.setVisible(false);
    this.gatheringText.setDepth(100);

    // Listen for spawn events
    window.addEventListener("spawnVillager", this.handleSpawnVillager);

    // Input handling (Drag to pan vs Click to interact)
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      isDragging = false;
      startX = pointer.x;
      startY = pointer.y;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        const dist = Phaser.Math.Distance.Between(startX, startY, pointer.x, pointer.y);
        if (dist > 10) {
          isDragging = true;
          this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
          this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
        }
      }

      // Ghost Building Preview
      if (this.isBuildingMode && this.ghostBuilding && this.buildingType) {
        const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const tileX = Math.floor(worldPoint.x / this.tileSize);
        const tileY = Math.floor(worldPoint.y / this.tileSize);

        const size = this.getBuildingSize(this.buildingType);
        const totalPixelSize = size * this.tileSize;

        // Center logic matching placeBuilding
        const offset = totalPixelSize / 2 - (this.tileSize / 2);
        const snapX = tileX * this.tileSize + this.tileSize / 2 + offset;
        const snapY = tileY * this.tileSize + this.tileSize / 2 + offset;

        this.ghostBuilding.setPosition(snapX, snapY);
        this.ghostBuilding.setDisplaySize(totalPixelSize, totalPixelSize);

        // Validate area
        const isValid = this.canBuildAt(tileX, tileY, size);
        this.ghostBuilding.setTint(isValid ? 0x55ff55 : 0xff5555); // Green/Red
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (isDragging) {
        isDragging = false;
        return;
      }

      const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const tileX = Math.floor(worldPoint.x / this.tileSize);
      const tileY = Math.floor(worldPoint.y / this.tileSize);

      // Building Mode Logic
      // Building Mode Logic
      if (this.isBuildingMode && this.buildingType) {
        // Validation check is now in canBuildAt
        const size = this.getBuildingSize(this.buildingType);
        if (this.canBuildAt(tileX, tileY, size)) {
          this.placeBuilding(tileX, tileY);
        }
        return;
      }

      // Check click on resources
      const clickedVillager = this.villagers.find(v => {
        const vx = Math.floor(v.sprite.x / this.tileSize);
        const vy = Math.floor(v.sprite.y / this.tileSize);
        return vx === tileX && vy === tileY;
      });

      if (clickedVillager) {
        if (this.selectedUnit === clickedVillager) {
          this.deselectUnit();
        } else {
          this.selectUnit(clickedVillager);
        }
        return;
      }

      // If unit selected, move or gather
      if (this.selectedUnit) {
        // Check resource click
        const clickedResource = this.resourceSprites.find(sprite => {
          const spriteTileX = Math.floor(sprite.x / this.tileSize);
          const spriteTileY = Math.floor(sprite.y / this.tileSize);
          return spriteTileX === tileX && spriteTileY === tileY;
        });

        // Check dropped resource click
        const clickedDropped = this.droppedResources.find(dr => {
          const drX = Math.floor(dr.sprite.x / this.tileSize);
          const drY = Math.floor(dr.sprite.y / this.tileSize);
          return drX === tileX && drY === tileY;
        });

        if (clickedResource) {
          this.startGatheringResource(this.selectedUnit, clickedResource);
        } else if (clickedDropped) {
          this.startPickingUpDropped(this.selectedUnit, clickedDropped);
        } else {
          this.moveVillagerToTile(this.selectedUnit, tileX, tileY);
        }
        return;
      }

      this.highlightTile(tileX, tileY);
    });

    // Zoom on scroll
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const zoomAmount = 0.1;
      let newZoom = this.cameras.main.zoom;
      newZoom += deltaY > 0 ? -zoomAmount : zoomAmount;
      newZoom = Phaser.Math.Clamp(newZoom, 0.2, 2.0);
      this.cameras.main.zoomTo(newZoom, 100, "Linear", true);
    });

    // Set camera bounds (optional, but good to keep even if small map, ensuring logic is same)
    // this.cameras.main.setBounds(0, 0, this.gridWidth * this.tileSize, this.gridHeight * this.tileSize);

    // Update loop
    this.events.on("update", () => {
      if (this.selectedUnit) {
        this.drawSelectionIndicator();
      }

      // Update text pos for gathering units
      this.villagers.forEach(v => {
        // Existing logic for single gathering text
        if (v.state === "gathering" && this.gatheringText.visible) {
          // simplified logic maintained
        }

        // Update carrying text position
        if (v.textLabel) {
          v.textLabel.setPosition(v.sprite.x, v.sprite.y - 30);
        }
      });
    });

    this.emitResourceUpdate();

    // Listen for language changes
    window.addEventListener("languageChange", this.handleLanguageChange);

    // Listen for resource spending from UI
    window.addEventListener("spendResources", this.handleSpendResources);

    // Listen for upgrade finalization
    // Listen for upgrade steps
    window.addEventListener("requestUpgrade", this.handleRequestUpgrade);
    window.addEventListener("requestRecruit", this.handleRequestRecruit);
    window.addEventListener("enterBuildMode", this.handleEnterBuildMode);

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("spawnVillager", this.handleSpawnVillager);
      window.removeEventListener("languageChange", this.handleLanguageChange);
      window.removeEventListener("spendResources", this.handleSpendResources);
      window.removeEventListener("requestUpgrade", this.handleRequestUpgrade);
      window.removeEventListener("requestRecruit", this.handleRequestRecruit);
      window.removeEventListener("enterBuildMode", this.handleEnterBuildMode);
    });
  }

  private spawnVillager(startX?: number, startY?: number) {
    // Population Cap Check
    if (this.villagers.length >= this.maxPopulation) {
      console.log(`Population limit reached (${this.maxPopulation})`);
      return;
    }

    // Default to main village center if no specific start pos
    const sX = startX ? Math.floor(startX / this.tileSize) : this.villageCenterX;
    const sY = startY ? Math.floor(startY / this.tileSize) : this.villageCenterY;

    // Find free spot around spawn point (radius search)
    let spawnX = 0;
    let spawnY = 0;
    let found = false;

    // Search outwards
    for (let r = 2; r < 6; r++) { // ring radius
      for (let x = sX - r; x <= sX + r; x++) {
        for (let y = sY - r; y <= sY + r; y++) {
          if (!this.isTileOccupied(x, y)) {
            spawnX = x;
            spawnY = y;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }

    if (!found) {
      console.log("No space for new villager!");
      return;
    }

    const sprite = this.add.sprite(
      spawnX * this.tileSize + this.tileSize / 2,
      spawnY * this.tileSize + this.tileSize / 2,
      "villager"
    );
    sprite.setDisplaySize(this.tileSize, this.tileSize);
    sprite.setInteractive({ useHandCursor: true });

    this.villagers.push({
      sprite,
      state: "idle",
      targetResource: null,
      carrying: null,
      textLabel: undefined
    });// Emit population update
    this.emitPopulationUpdate();
  }

  private emitPopulationUpdate() {
    window.dispatchEvent(new CustomEvent("populationUpdate", {
      detail: { current: this.villagers.length, max: this.maxPopulation }
    }));
  }

  private addResourceSprite(tileX: number, tileY: number, key: string): Phaser.GameObjects.Sprite {
    const sprite = this.add.sprite(
      tileX * this.tileSize + this.tileSize / 2,
      tileY * this.tileSize + this.tileSize / 2,
      key
    );
    sprite.setDisplaySize(this.tileSize, this.tileSize);
    sprite.setData("resourceType", key);
    sprite.setData("tileX", tileX);
    sprite.setData("tileY", tileY);
    return sprite;
  }

  private isTileOccupied(x: number, y: number): boolean {
    // Check all buildings
    if (this.buildings.some(b => {
      const size = this.getBuildingSize(b.type);
      // Check if (x,y) is within this building's footprint [tileX, tileX+size)
      return x >= b.tileX && x < b.tileX + size &&
        y >= b.tileY && y < b.tileY + size;
    })) return true;

    // Check resources
    if (this.resourceSprites.some(s => s.getData("tileX") === x && s.getData("tileY") === y)) return true;

    // Check dropped resources
    if (this.droppedResources.some(d => Math.floor(d.sprite.x / this.tileSize) === x && Math.floor(d.sprite.y / this.tileSize) === y)) return true;

    // Check other villagers (optional, but good for avoiding stacking)
    if (this.villagers.some(v => Math.floor(v.sprite.x / this.tileSize) === x && Math.floor(v.sprite.y / this.tileSize) === y)) return true;

    return false;
  }

  private canBuildAt(tileX: number, tileY: number, size: number): boolean {
    // Check footprint
    for (let x = tileX; x < tileX + size; x++) {
      for (let y = tileY; y < tileY + size; y++) {
        if (this.isTileOccupied(x, y)) return false;
      }
    }
    return true;
  }

  private generateForests(forestCount: number, treesPerForest: number) {
    for (let i = 0; i < forestCount; i++) {
      let centerX = Math.floor(Math.random() * (this.gridWidth - 10)) + 5;
      let centerY = Math.floor(Math.random() * (this.gridHeight - 10)) + 5;

      for (let t = 0; t < treesPerForest; t++) {
        const offsetX = Math.floor(Math.random() * 7) - 3;
        const offsetY = Math.floor(Math.random() * 7) - 3;
        const tileX = centerX + offsetX;
        const tileY = centerY + offsetY;

        if (tileX < 0 || tileX >= this.gridWidth || tileY < 0 || tileY >= this.gridHeight) continue;
        if (this.isTileOccupied(tileX, tileY)) continue;

        const sprite = this.addResourceSprite(tileX, tileY, "tree");
        this.resourceSprites.push(sprite);
      }
    }
  }

  private generateMines(resourceKey: string, mineCount: number, resourcesPerMine: number) {
    for (let i = 0; i < mineCount; i++) {
      let centerX = Math.floor(Math.random() * (this.gridWidth - 10)) + 5;
      let centerY = Math.floor(Math.random() * (this.gridHeight - 10)) + 5;

      for (let r = 0; r < resourcesPerMine; r++) {
        const offsetX = Math.floor(Math.random() * 3) - 1;
        const offsetY = Math.floor(Math.random() * 3) - 1;
        const tileX = centerX + offsetX;
        const tileY = centerY + offsetY;

        if (tileX < 0 || tileX >= this.gridWidth || tileY < 0 || tileY >= this.gridHeight) continue;
        if (this.isTileOccupied(tileX, tileY)) continue;

        const sprite = this.addResourceSprite(tileX, tileY, resourceKey);
        this.resourceSprites.push(sprite);
      }
    }
  }

  private selectUnit(unit: VillagerData) {
    this.selectedUnit = unit;
    this.drawSelectionIndicator();
  }

  private deselectUnit() {
    this.selectedUnit = null;
    this.selectionIndicator.clear();
  }

  private hideGatheringText() {
    this.gatheringText.setVisible(false);
  }

  private drawSelectionIndicator() {
    if (!this.selectedUnit) return;
    this.selectionIndicator.clear();
    this.selectionIndicator.lineStyle(2, 0xffff00, 1);
    const x = this.selectedUnit.sprite.x - this.tileSize / 2;
    const y = this.selectedUnit.sprite.y - this.tileSize / 2;
    this.selectionIndicator.strokeRect(x, y, this.tileSize, this.tileSize);
  }

  private startGatheringResource(villager: VillagerData, resource: Phaser.GameObjects.Sprite) {
    // If already carrying, drop it
    if (villager.carrying) {
      this.dropResource(villager);
    }

    // Cleanup previous action visualization
    this.hideGatheringText();

    this.tweens.killTweensOf(villager.sprite);
    villager.state = "walking";
    villager.targetResource = resource;

    const resTileX = resource.getData("tileX");
    const resTileY = resource.getData("tileY");
    const adjacentTile = this.findAdjacentTile(resTileX, resTileY);

    if (!adjacentTile) {
      villager.state = "idle";
      return;
    }

    this.moveVillagerToTile(villager, adjacentTile.x, adjacentTile.y, () => {
      this.startGathering(villager);
    });
  }

  private dropResource(villager: VillagerData) {
    if (!villager.carrying) return;

    const { type, amount } = villager.carrying;

    // Find a free tile near the villager
    const startX = Math.floor(villager.sprite.x / this.tileSize);
    const startY = Math.floor(villager.sprite.y / this.tileSize);

    let dropX = startX;
    let dropY = startY;
    let found = false;

    // Spiral search for free space
    // Check radius 0 to 2
    for (let r = 0; r <= 2; r++) {
      for (let x = startX - r; x <= startX + r; x++) {
        for (let y = startY - r; y <= startY + r; y++) {
          if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) continue;

          // Custom check: Don't drop on buildings or other resources, but ignore units
          // Re-using isTileOccupied but we need to be careful.
          // IsTileOccupied includes units. We want to allow dropping UNDER a unit if needed, 
          // but absolutely NOT on a building.

          const occupiedByBuildingOrResource = this.buildings.some(b => {
            const size = this.getBuildingSize(b.type);
            return x >= b.tileX && x < b.tileX + size && y >= b.tileY && y < b.tileY + size;
          }) || this.resourceSprites.some(s => s.getData("tileX") === x && s.getData("tileY") === y)
            || this.droppedResources.some(d => Math.floor(d.sprite.x / this.tileSize) === x && Math.floor(d.sprite.y / this.tileSize) === y);

          if (!occupiedByBuildingOrResource) {
            dropX = x;
            dropY = y;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }

    if (!found) {
      console.log("No space to drop resource!");
      // Fallback to current location even if messy
      dropX = startX;
      dropY = startY;
    }

    const worldX = dropX * this.tileSize + this.tileSize / 2;
    const worldY = dropY * this.tileSize + this.tileSize / 2;

    // Create a smaller version of the resource sprite
    const droppedSprite = this.add.sprite(worldX, worldY, type);
    droppedSprite.setDisplaySize(this.tileSize * 0.5, this.tileSize * 0.5); // Smaller
    droppedSprite.setDepth(5); // Below units, above ground

    this.droppedResources.push({
      sprite: droppedSprite,
      type: type,
      amount: amount
    });

    // Clear villager data
    villager.carrying = null;
    if (villager.textLabel) {
      villager.textLabel.destroy();
      villager.textLabel = undefined;
    }
  }

  private startPickingUpDropped(villager: VillagerData, dropped: DroppedResource) {
    // If currently carrying something else, drop it first
    if (villager.carrying) {
      this.dropResource(villager);
    }

    // Cleanup previous action visualization
    this.hideGatheringText();

    this.tweens.killTweensOf(villager.sprite);
    villager.state = "walking";

    // Move to the dropped item's tile
    const tileX = Math.floor(dropped.sprite.x / this.tileSize);
    const tileY = Math.floor(dropped.sprite.y / this.tileSize);

    this.moveVillagerToTile(villager, tileX, tileY, () => {
      // Pick up
      villager.carrying = { type: dropped.type, amount: dropped.amount };

      // Remove dropped resource
      dropped.sprite.destroy();
      this.droppedResources = this.droppedResources.filter(d => d !== dropped);

      // Show carrying label
      villager.textLabel = this.add.text(villager.sprite.x, villager.sprite.y - 30, `${dropped.type}`, {
        fontSize: "10px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 2, y: 2 }
      });
      villager.textLabel.setOrigin(0.5);
      villager.textLabel.setDepth(150);

      // Now return to village
      villager.state = "returning";
      const targetX = this.villageCenterX + 1;
      const targetY = this.villageCenterY + 1;

      this.moveVillagerToTile(villager, targetX, targetY, () => {
        this.finishDelivery(villager);
      });
    });
  }

  private findAdjacentTile(tileX: number, tileY: number): { x: number; y: number } | null {
    const directions = [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }];
    for (const dir of directions) {
      const adjX = tileX + dir.x;
      const adjY = tileY + dir.y;
      if (adjX < 0 || adjX >= this.gridWidth || adjY < 0 || adjY >= this.gridHeight) continue;
      // Basic check, ideally checking if walkable
      if (!this.resourceSprites.some(s => s.getData("tileX") === adjX && s.getData("tileY") === adjY)) {
        return { x: adjX, y: adjY };
      }
    }
    return null;
  }

  private moveVillagerToTile(villager: VillagerData, tileX: number, tileY: number, onComplete?: () => void) {
    const targetX = tileX * this.tileSize + this.tileSize / 2;
    const targetY = tileY * this.tileSize + this.tileSize / 2;
    const distance = Phaser.Math.Distance.Between(villager.sprite.x, villager.sprite.y, targetX, targetY);
    const speed = 200;
    const duration = (distance / speed) * 1000;

    this.tweens.add({
      targets: villager.sprite,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: "Linear",
      onComplete: () => {
        if (onComplete) {
          onComplete();
        } else {
          villager.state = "idle";
        }
      }
    });
  }

  private startGathering(villager: VillagerData) {
    if (!villager.targetResource) return;
    villager.state = "gathering";

    const resourceType = villager.targetResource.getData("resourceType");
    const t = translations[this.language];

    let actionLabel = t.actionWorking;
    if (resourceType === "tree") actionLabel = t.actionChopping;
    else if (resourceType === "stone" || resourceType === "gold" || resourceType === "metal") actionLabel = t.actionMining;

    this.gatheringText.setText(actionLabel);
    this.gatheringText.setVisible(true);
    this.gatheringText.setPosition(villager.sprite.x - 20, villager.sprite.y - 40);

    villager.gatheringTimer = this.time.delayedCall(1000, () => {
      // gathering complete, now carry back
      if (!villager.targetResource) return;
      this.gatheringText.setVisible(false);

      const resourceType = villager.targetResource.getData("resourceType");
      villager.state = "returning";
      villager.carrying = { type: resourceType, amount: 10 };

      // Show carrying text
      villager.textLabel = this.add.text(villager.sprite.x, villager.sprite.y - 30, `${resourceType}`, {
        fontSize: "10px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 2, y: 2 }
      });
      villager.textLabel.setOrigin(0.5);
      villager.textLabel.setDepth(150);

      // Move to village
      const villageTileX = this.villageCenterX;
      const villageTileY = this.villageCenterY;

      // Calculate a spot next to village
      // Simple logic: move to center for now, visual override might be needed to stop at edge
      // or reused "findAdjacent" logic but for village?
      const targetX = this.villageCenterX + 1;
      const targetY = this.villageCenterY + 1;

      this.moveVillagerToTile(villager, targetX, targetY, () => {
        this.finishDelivery(villager);
      });
    });
  }

  private finishDelivery(villager: VillagerData) {
    if (!villager.carrying) return;

    // Add resources
    const { type, amount } = villager.carrying;
    if (type === "tree") this.resources.wood += amount;
    else if (type === "stone") this.resources.stone += amount;
    else if (type === "gold") this.resources.gold += amount;
    else if (type === "metal") this.resources.metal += amount;

    this.emitResourceUpdate();

    // Show floating text
    this.showFloatingText(
      this.villageSprite.x,
      this.villageSprite.y - 40,
      `+${amount} ${type}`,
      "#ffffff"
    );

    villager.carrying = null;
    if (villager.textLabel) {
      villager.textLabel.destroy();
      villager.textLabel = undefined;
    }

    // Return to resource
    if (villager.targetResource && villager.targetResource.active) {
      this.startGatheringResource(villager, villager.targetResource);
    } else {
      villager.state = "idle";
    }
  }

  private showFloatingText(x: number, y: number, message: string, color: string) {
    const text = this.add.text(x, y, message, {
      fontSize: "14px",
      fontStyle: "bold",
      color: color,
      stroke: "#000000",
      strokeThickness: 3
    });
    text.setOrigin(0.5);
    text.setDepth(200);

    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      ease: "Power1",
      onComplete: () => text.destroy()
    });
  }



  private emitResourceUpdate() {
    window.dispatchEvent(new CustomEvent("resourceUpdate", { detail: { ...this.resources } }));
  }

  private updateGatheringText() {
    if (!this.gatheringText) return;
    this.gatheringText.setText(this.language === "en" ? "Gathering..." : (this.language === "pl" ? "Zbieranie..." : "Sammeln..."));
  }

  private getBuildingSize(type: string | null): number {
    return type === "farm" ? 2 : 3;
  }

  private placeBuilding(tileX: number, tileY: number) {
    const currentBuildingType = this.buildingType || "village"; // Capture before clearing
    const sizeInTiles = this.getBuildingSize(currentBuildingType);

    this.isBuildingMode = false;
    this.ghostBuilding.setVisible(false);
    this.buildingType = null;

    const x = tileX * this.tileSize + this.tileSize / 2;
    const y = tileY * this.tileSize + this.tileSize / 2;

    // Place construction site (centered on grid based on size)
    // Offset calculation:
    // 3x3 (size=3): Center is 1.5 tiles offset.
    // 2x2 (size=2): Center is 1.0 tiles offset (since x/y is top-left of tile 0,0)
    // Actually x,y passed here are center of the clicked tile.
    // Let's rely on standard positioning logic used in ghost building.

    // Position for the sprite center
    const totalPixelSize = sizeInTiles * this.tileSize;
    const offset = totalPixelSize / 2 - (this.tileSize / 2); // Shift from center of first tile to center of block

    const centerX = x + offset;
    const centerY = y + offset;

    const site = this.add.sprite(centerX, centerY, "construction_site");
    site.setDisplaySize(totalPixelSize, totalPixelSize);

    // Progress bar for this site
    const barBg = this.add.rectangle(centerX, centerY - 40, 60, 8, 0x000000);
    const bar = this.add.rectangle(centerX - 30, centerY - 40, 0, 8, 0x00ff00);
    bar.setOrigin(0, 0.5);

    // Timer
    let progress = 0;
    const timer = this.time.addEvent({
      delay: 100,
      repeat: 100, // 100 * 100ms = 10s
      callback: () => {
        progress += 1;
        bar.width = (progress / 100) * 60;

        if (progress >= 100) {
          site.destroy();
          barBg.destroy();
          bar.destroy();

          const siteEntry = this.constructionSites.find(s => s.sprite === site);
          if (!siteEntry) return; // Prevent double-execution if timer overshoots

          timer.remove(); // Stop timer to be sure

          const type = siteEntry.finishedBuildingType;

          // Remove from array
          this.constructionSites = this.constructionSites.filter(s => s !== siteEntry);

          const built = this.add.sprite(centerX, centerY, type);
          built.setDisplaySize(totalPixelSize, totalPixelSize);
          built.setDepth(10); // Ensure it renders on top of everything
          built.setInteractive({ useHandCursor: true });

          // Register new building
          const newId = crypto.randomUUID();
          const newBuilding: Building = {
            id: newId,
            sprite: built,
            type: type,
            level: 1,
            isUpgrading: false,
            upgradeProgress: 0,
            isRecruiting: false,
            recruitProgress: 0,
            tileX: tileX,
            tileY: tileY
          };
          this.buildings.push(newBuilding);

          // Farm Effect: Increase Pop Cap
          if (type === "farm") {
            this.maxPopulation += 5;
            this.emitPopulationUpdate();

            // Show floating text
            this.showFloatingText(
              built.x,
              built.y - 40,
              "Pop Cap +5!",
              "#00ff00"
            );
          }

          built.on("pointerdown", () => {
            this.openBuildingModal(newBuilding);
          });
        }
      }
    });

    // Add to tracking array
    this.constructionSites.push({
      sprite: site,
      timer: timer,
      finishedBuildingType: currentBuildingType
    });
  }

  private openBuildingModal(building: Building) {
    this.selectedBuildingId = building.id;
    window.dispatchEvent(new CustomEvent("openVillageModal", {
      detail: {
        id: building.id,
        level: building.level,
        type: building.type,
        isUpgrading: building.isUpgrading,
        upgradeProgress: building.upgradeProgress,
        isRecruiting: building.isRecruiting,
        recruitProgress: building.recruitProgress
      }
    }));
  }

  private drawGrid() {
    this.graphics.clear();
    this.graphics.lineStyle(1, 0x1f2a44, 1);
    for (let x = 0; x <= this.gridWidth; x += 1) {
      this.graphics.lineBetween(x * this.tileSize, 0, x * this.tileSize, this.gridHeight * this.tileSize);
    }
    for (let y = 0; y <= this.gridHeight; y += 1) {
      this.graphics.lineBetween(0, y * this.tileSize, this.gridWidth * this.tileSize, y * this.tileSize);
    }
  }

  private highlightTile(tileX: number, tileY: number) {
    this.highlightGraphics.clear();
    this.highlightGraphics.fillStyle(0x2dd4bf, 0.25);
    this.highlightGraphics.fillRect(tileX * this.tileSize, tileY * this.tileSize, this.tileSize, this.tileSize);
  }
}

export const createGame = (parent: string) => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parent,
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: "100%", height: "100%" },
    render: {
      pixelArt: true,
      powerPreference: "high-performance",
      antialias: false,
      roundPixels: true,
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scene: WorldScene,
  };
  return new Phaser.Game(config);
};
