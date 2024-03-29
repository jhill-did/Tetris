
class Color {
  constructor(red, green, blue, alpha = 1.0) {
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
