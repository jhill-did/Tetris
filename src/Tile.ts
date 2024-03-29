import { Color } from './Color.js';

export class Tile {
  x: number;
  y: number;
  color: Color;

  constructor(x = 0, y = 0, color = new Color(0.5, 0.5, 0.5, 1.0)) {
    this.x = x;
    this.y = y;
    this.color = color;
  }

  clone() {
    return new Tile(
      this.x,
      this.y,
      this.color.clone(),
    );
  }
}