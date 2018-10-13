
import { Tile } from './Tile.js';
import { Tetromino } from './Tetromino.js';
import { Board } from './Board.js';

let gameState = {};
window.gameState = gameState;

initialize();
startGame();

function setState(input) {
  let modification;
  if (typeof input === 'function') {
    modification = input(gameState);
  } else {
    modification = input;
  }

  gameState = { ...gameState, ...modification };
  window.gameState = gameState;
}

function pushInput(event) {
  setState(prevState => ({ inputQueue: [...prevState.inputQueue, event] }));
}

function initialize() {
  const tetrominoQueue = [
    Tetromino.getRandomShape(),
    Tetromino.getRandomShape(),
    Tetromino.getRandomShape(),
  ];

  const board = new Board(10, 24);

  let initialState = {
    elapsedTime: 0,
    prevTime: getTime(),
    fallTimer: 0,
    inputQueue: [],
    gameStarted: false,
    tetrominoQueue,
    board,
    tiles: [],
    savedTetromino: null,
    swapBlock: false,
    score: 0,
    level: 1,
    totalLinesCleared: 0,
  };

  // Build our first tetromino and starting position from this state then
  // we're all set up.
  const tetrominoState = getNextTetrominoState(initialState);
  initialState = { ...initialState, ...tetrominoState };
  setState(initialState);

  window.addEventListener('keydown', pushInput, false);
}

function getLineClearState(prevState) {
  const { tiles, board } = prevState;

  // Determine which lines need to be cleared.
  const lineCounts = tiles.reduce((counts, tile) => {
    return {
      ...counts,
      [tile.y]: !!counts[tile.y] ? counts[tile.y] + 1 : 1,
    };
  }, {});

  // Filter out the tiles which exist on cleared lines.
  const filteredTiles = tiles.reduce((acc, tile) => {
    if (lineCounts[tile.y] === board.width) {
      return acc;
    }

    const lowerClearedLineCount = Object.keys(lineCounts).filter((key) => {
      const countIndex = parseInt(key);
      return lineCounts[countIndex] === board.width && countIndex < tile.y;
    }).length;

    // Adjusted this valid tile as we add it to the list.
    const tileCopy = tile.clone();
    tileCopy.y = tile.y - lowerClearedLineCount;
    return [...acc, tileCopy];
  }, []);

  const linesCleared = Object.keys(lineCounts)
    .filter(key => lineCounts[key] === board.width)
    .length;

  const moveStats = {
    ...prevState.moveStats,
    linesCleared,
  };

  return { ...prevState, tiles: filteredTiles, moveStats };
}

function getScoreState(state) {
  const {
    linesCleared = 0,
    hardDropDistance = 0,
    softDropDistance = 0,
  } = state.moveStats;

  const totalLinesCleared = state.totalLinesCleared + linesCleared;

  const level = totalLinesCleared > state.level * 5 ?
    state.level + 1 :
    state.level;

  let lineMultiplier = 0;
  switch (linesCleared) {
    case 1: lineMultiplier = 100; break;
    case 2: lineMultiplier = 300; break;
    case 3: lineMultiplier = 500; break;
    case 4: lineMultiplier = 800; break;
    default: break;
  }

  const score = state.score
    + (lineMultiplier * linesCleared)
    + (softDropDistance * 1)
    + (hardDropDistance * 2);

  return {
    ...state,
    level,
    score,
    totalLinesCleared,
  }
}

// Sounds like ending your turn:
// Get a new tetromino from the queue, submit your current tetromino if any to
// the tiles list, and clear lines if we can.
function getNextTetrominoState(prevState) {
  // I promise this would look better with the pipeline operator :(
  const tileState = getDecomposedTetrominoState(prevState);
  const nextLineClearState = getLineClearState(tileState);
  const nextQueueState = getNextTetrominoQueueState(nextLineClearState);
  const nextScoreState = getScoreState(nextQueueState);

  /*
  const nextState = prevState
    |> getDecomposedTetrominoState
    |> getLineClearState
    |> getNextTetrominoState
    |> getScoreState
  */

  return { ...nextScoreState, blockSwap: false, moveStats: {} };
}

function getDefaultTetrominoOffset(tetromino, board) {
  const offset = {
    x: board.width / 2 - tetromino.snapOffset.x,
    y: board.height - tetromino.snapOffset.y,
  };

  return offset;
}

function getNextTetrominoQueueState(prevState) {
  const {
    currentTetromino,
    tetrominoQueue,
    board,
  } = prevState;

  const [nextTetromino] = tetrominoQueue.slice(0, 1);
  const nextQueue = [
    ...tetrominoQueue.slice(1),
    Tetromino.getRandomShape(),
  ];

  const nextOffset = getDefaultTetrominoOffset(nextTetromino, board);

  return {
    ...prevState,
    currentTetromino: nextTetromino,
    tetrominoQueue: nextQueue,
    currentOffset: nextOffset,
  };
}

function getTime() {
  return new Date().getTime();
}

function startGame() {
  const shapeKeys = Object.keys(Tetromino.shapes);
  const shapes = shapeKeys.reduce((acc, key) => {
    return [...acc, Tetromino.shapes[key]];
  }, []);

  shapes.forEach((shape) => {
    console.log(shape.rotated('clockwise').rotated('clockwise').rotated('clockwise').toString());
  });

  setState({ gameStarted: true });

  tick();
}

function tick() {
  const now = new Date().getTime();
  const { prevTime } = gameState;
  const deltaTime = (now - prevTime) / 1000;

  const fallScalar = 1.0;

  setState((prevState) => {
    return {
      fallTimer: prevState.fallTimer + (deltaTime * fallScalar),
      elapsedTime: prevState.elapsedTime + deltaTime,
      prevTime: now,
    };
  });

  // Handle any inputs stored up from last frame.
  const popInput = () => {
    const [inputEvent] = gameState.inputQueue.slice(0, 1);
    setState({ inputQueue: gameState.inputQueue.slice(1) });
    return inputEvent;
  };

  while (gameState.inputQueue.length > 0) {
    const inputEvent = popInput();
    handleInput(inputEvent);
  }

  // Every second move the current tetromino's offset down.
  if (gameState.fallTimer > 1.0) {
    setState({ fallTimer: 0 });
    const {
      currentTetromino: tetromino,
      currentOffset: offset,
      board,
      tiles,
    } = gameState;

    const nextOffset = { x: offset.x, y: offset.y - 1 };
    const willCollide = checkCollision(tetromino, nextOffset, board, tiles);

    // If we'll collide by moving, let's stop here.
    if (willCollide) {
      const nextState = getNextTetrominoState(gameState);
      setState({ ...nextState });
    } else {
      setState({ currentOffset: nextOffset });
    }
  }

  // Render
  const { board } = gameState;
  const canvas = document.getElementById('game-board');
  const context = canvas.getContext('2d');

  const tileSize = 20;

  context.fillStyle = 'rgb(100, 100, 100)';

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(5, -10);
  context.strokeRect(
    0,
    canvas.height,
    tileSize * board.width,
    -tileSize * board.height,
  );

  const { currentTetromino, tiles } = gameState;
  if (tiles) {
    tiles.forEach((tile) => {
      const position = {
        x: tile.x * tileSize,
        y: canvas.height - (tile.y * tileSize),
      };

      context.fillStyle = tile.color.toRgb();
      context.fillRect(position.x, position.y, tileSize, tileSize);
    });
  }

  if (currentTetromino) {
    // Render ghost piece.
    const { currentOffset } = gameState;
    const ghostOffset = getSlideOffset(currentTetromino, currentOffset, { x: 0, y: -1 });
    currentTetromino.tiles.forEach((tile) => {
      const position = {
        x: (tile.x + ghostOffset.x) * tileSize,
        y: canvas.height - (tile.y + ghostOffset.y) * tileSize
      };
      context.fillStyle = 'rgba(150, 150, 150, 0.5)';
      context.fillRect(position.x, position.y, tileSize, tileSize);
    });

    // Render current tetromino on top of ghost.
    currentTetromino.tiles.forEach((tile) => {
      const position = {
        x: (tile.x + currentOffset.x) * tileSize,
        y: canvas.height - (tile.y + currentOffset.y) * tileSize,
      };

      context.fillStyle = tile.color.toRgb();
      context.fillRect(position.x, position.y, tileSize, tileSize);
    });
  }

  context.restore();

  // Render queue
  context.save();
  const previewTileSize = tileSize / 2;

  const queueOffset = { x: board.width * tileSize, y: -board.height * tileSize };
  // context.translate(queueOffset.x, queueOffset.y);
  context.translate(250, 50);

  const { tetrominoQueue } = gameState;
  tetrominoQueue.forEach((tetromino) => {
    tetromino.tiles.forEach((tile) => {
      context.fillStyle = tile.color.toRgb();
      context.fillRect(
        tile.x * previewTileSize, -tile.y * previewTileSize,
        previewTileSize, previewTileSize);
    })

    context.translate(0, previewTileSize * 5);
  });

  context.restore();

  context.save();
  context.translate(225, 400);
  context.fillStyle = 'rgb(100, 100, 100)';
  context.fillText(`Level: ${gameState.level}`, 0, 0);
  context.fillText(`Score: ${gameState.score}`, 0, 20);
  context.fillText(`Lines: ${gameState.totalLinesCleared}`, 0, 40);
  context.restore();

  requestAnimationFrame(tick);
}

function getDecomposedTetrominoState(prevState) {
  const { currentTetromino, currentOffset: offset } = prevState;

  if (!currentTetromino) {
    return prevState;
  }

  // Decompose our current tetromino into the tiles list.
  const decomposedTiles = currentTetromino.tiles.map((tile) => {
    return new Tile(tile.x + offset.x, tile.y + offset.y, tile.color);
  });

  return {
    ...prevState,
    tiles: [...prevState.tiles, ...decomposedTiles]
  };
}

function moveTetromino(prevState, direction) {
  const { currentTetromino, currentOffset, board, tiles } = gameState;
  const testOffset = {
    x: currentOffset.x + direction.x,
    y: currentOffset.y + direction.y,
  }

  const willCollide = checkCollision(currentTetromino, testOffset, board, tiles);
  if (!willCollide) {
    return { ...prevState, currentOffset: testOffset, fallTimer: 0 };
  }

  // TODO: Otherwise, idk play a sound or something.

  return prevState;
}

function rotateTetromino(prevState) {
  const { currentTetromino, currentOffset, board, tiles } = gameState;
  const rotatedTetromino = currentTetromino.rotated('counter-clockwise');

  const willCollide = checkCollision(rotatedTetromino, currentOffset, board, tiles);
  if (!willCollide) {
    return { ...prevState, currentTetromino: rotatedTetromino, fallTimer: 0 };
  }

  return prevState;
}

function getSlideOffset(tetromino, offset, direction) {
  const { board, tiles } = gameState;
  const addVectors = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  let prevOffset = offset;
  let nextOffset = addVectors(prevOffset, direction);
  while (!checkCollision(tetromino, nextOffset, board, tiles)) {
    // While we're not colliding, advance nextOffset towards direction.
    prevOffset = { ...nextOffset };
    nextOffset = addVectors(nextOffset, direction);
  }

  return prevOffset;
}

function dropTetromino(prevState) {
  const nextOffset = getSlideOffset(
    gameState.currentTetromino,
    gameState.currentOffset,
    { x: 0, y: -1 },
  );

  const state = {
    ...prevState,
    moveStats: {
      ...prevState.moveStats,
      hardDropDistance: Math.abs(prevState.currentOffset.y - nextOffset.y),
    }
  }

  let nextState = getNextTetrominoState({
    ...state,
    currentOffset: nextOffset,
  });

  nextState = getScoreState(nextState);

  return nextState;
}

function swapTetromino(state) {
  if (state.blockSwap) {
    return state;
  }

  let nextState = { ...state };
  const { currentTetromino, savedTetromino, board } = state;
  if (!state.savedTetromino) {
    const nextTetromino = state.tetrominoQueue[0];
    nextState = {
      ...state,
      savedTetromino: currentTetromino,
      currentTetromino: nextTetromino,
      currentOffset: getDefaultTetrominoOffset(nextTetromino, board),
      tetrominoQueue: [
        ...state.tetrominoQueue.slice(1),
        Tetromino.getRandomShape(),
      ],
    };
  } else {
    nextState = {
      ...state,
      savedTetromino: currentTetromino,
      currentTetromino: savedTetromino,
      currentOffset: getDefaultTetrominoOffset(savedTetromino, board),
    };
  }

  // blockSwap becomes false after landing currentTetromino.
  return { ...nextState, blockSwap: false };
}

function handleInput(event) {
  let nextState;
  switch (event.key) {
    case 'ArrowLeft':
      nextState = moveTetromino(gameState, { x: -1, y: 0 });
      break;
    case 'ArrowRight':
      nextState = moveTetromino(gameState, { x: 1, y: 0 });
      break;
    case 'ArrowDown':
      nextState = moveTetromino(gameState, { x: 0, y: -1 });
      break;
    case 'ArrowUp':
      nextState = rotateTetromino(gameState);
      break;
    case ' ':
      nextState = dropTetromino(gameState);
      break;
    case 'Shift':
      nextState = swapTetromino(gameState);
      break;
    default: break;
  }

  if (nextState) {
    setState(nextState);
  }
}

function checkCollision(tetromino, offset, board, tiles) {
  const transformedTiles = tetromino.tiles.map((tile) => {
    return { x: tile.x + offset.x, y: tile.y + offset.y };
  });

  const colliding = transformedTiles.reduce((acc, tile) => {
    if (acc === true) {
      return true;
    }

    const inBoard = tile.y > 0 && tile.x >= 0 && tile.x < board.width;
    const overlappingOtherTile = tiles.reduce((overlapping, otherTile) => {
      if (overlapping === true) {
        return true;
      }

      return otherTile.x === tile.x && otherTile.y === tile.y;
    }, false);

    return !inBoard || overlappingOtherTile;
  }, false);

  return colliding;
}

function getTile(x, y) {
  return gameState.tiles.find((tile) => {
    return tile.x === x && tile.y === y;
  });
}
