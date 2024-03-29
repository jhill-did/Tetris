
class Color {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(red: number, green: number, blue: number, alpha = 1.0) {
    this.r = red;
    this.g = green;
    this.b = blue;
    this.a = alpha;
  }

  toRgb() {
    return `rgb(${this.r}, ${this.g}, ${this.b})`;
  }

  toRgba() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }

  clone() {
    return new Color(this.r, this.g, this.b, this.a);
  }
}

export { Color };
