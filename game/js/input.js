// Keyboard + mouse input for Old Town.
export const Input = {
  keys: {},
  mouse: { x: 0, y: 0, down: false, clicked: false },
  pressed: {}, // keys pressed this frame (cleared each frame)

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!this.keys[e.key]) this.pressed[e.key] = true;
      this.keys[e.key] = true;
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      this.mouse.clicked = true;
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
  },

  down(key) { return !!this.keys[key]; },
  wasPressed(key) { return !!this.pressed[key]; },
  axis() {
    // Returns {x, y} movement intent from WASD/arrows.
    let x = 0, y = 0;
    if (this.keys['a'] || this.keys['A'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['d'] || this.keys['D'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['w'] || this.keys['W'] || this.keys['ArrowUp']) y -= 1;
    if (this.keys['s'] || this.keys['S'] || this.keys['ArrowDown']) y += 1;
    return { x, y };
  },
  endFrame() {
    this.pressed = {};
    this.mouse.clicked = false;
  },
};
