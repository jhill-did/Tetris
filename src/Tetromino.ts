import { Color } from './Color.js';
import { Tile } from './Tile.js';

function makeTetromino(matrix, color) {
  const height = matrix.length;
  const width = matrix[0].length;
  const center = {
    x: width / 2.0,
    y: height / 2.0,
  };

  const rows = matrix.map((row, rowIndex) => {
    const temp = row.reduce((acc, cell, columnIndex) => {
      if (cell === 1) {
        const xOffset = columnIndex + 0.5 - center.x;
        const yOffset = rowIndex + 0.5 - center.y;
        const tile = new Tile(xOffset, yOffset, color);
        return [...acc, tile];
      }

      return acc;
    }, []);

    return temp;
  });

  const tiles = rows.reduce((acc, rowTiles) => {
    return [...acc, ...rowTiles];
  }, []);

  const [firstTile] = tiles;
  const snapOffset = {
    x: Math.round(firstTile.x) - firstTile.x,
    y: Math.round(firstTile.y) - firstTile.y,
  };

  return new Tetromino(
    tiles,
    { width, height },
    snapOffset,
  );
}

class Tetromino {
  constructor(tiles = [], dimensions = null, snapOffset = null) {
    this.tiles = tiles;
    this.dimensions = dimensions;
    this.snapOffset = snapOffset;
  }

  rotated(direction) {
    const transform = direction === 'clockwise' ?
      (tile) => new Tile(-tile.y, tile.x, tile.color) :
      (tile) => new Tile(tile.y, -tile.x, tile.color);

    const transformedTiles = this.tiles.map(transform);

    return new Tetromino(transformedTiles, this.dimensions, this.snapOffset);
  }

  clone() {
    return new Tetromino(
      [...this.tiles],
      { ...this.dimensions },
      {...this.snapOffset}
    );
  }

  toString() {
    const { width, height } = this.dimensions;
    const center = {
      x: width / 2.0,
      y: height / 2.0,
    };

    const mat = new Array(height);
    for (let row = 0; row < height; row += 1) {
      const data = new Array(width);
      data.fill('⬛');
      mat[row] = data;
    }

    this.tiles.forEach((tile) => {
      const row = Math.floor(tile.y - 0.5 + center.y);
      const column = Math.floor(tile.x - 0.5 + center.x);
      mat[row][column] = '⬜';
    });

    let output = '\n';
    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width; column += 1) {
        output = `${output}${mat[row][column]}`;
      }
      output = `${output}\n`;
    }

    return output;
  }
}

Tetromino.shapes = {};

Tetromino.shapes.I = makeTetromino([
  [0, 0, 0, 0],
  [1, 1, 1, 1],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
], new Color(6, 182, 239));

Tetromino.shapes.O = makeTetromino([
  [1, 1],
  [1, 1],
], new Color(246, 230, 13));

Tetromino.shapes.T = makeTetromino([
  [0, 0, 0],
  [1, 1, 1],
  [0, 1, 0],
], new Color(129, 91, 164));

Tetromino.shapes.J = makeTetromino([
  [0, 0, 0],
  [1, 1, 1],
  [0, 0, 1],
], new Color(72, 182, 133));

Tetromino.shapes.L = makeTetromino([
  [0, 0, 0],
  [1, 1, 1],
  [1, 0, 0],
], new Color(249, 155, 21));

Tetromino.shapes.S = makeTetromino([
  [0, 1, 1],
  [1, 1, 0],
  [0, 0, 0],
], new Color(158, 201, 49));

Tetromino.shapes.Z = makeTetromino([
  [1, 1, 0],
  [0, 1, 1],
  [0, 0, 0],
], new Color(239, 97, 85));

Tetromino.getRandomShape = () => {
  const shapeKeys = Object.keys(Tetromino.shapes);
  const randomIndex = Math.floor(Math.random() * shapeKeys.length);
  const randomKey = shapeKeys[randomIndex];
  const copy = Tetromino.shapes[randomKey].clone();
  return copy;
}

export { Tetromino };
