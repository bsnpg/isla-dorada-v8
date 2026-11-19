
export class Input {
  constructor(canvas) {
    this.canvas = canvas || null;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { dx: 0, dy: 0, x: 0, y: 0, buttons: new Set(), locked: false };
    this.actions = [];

    this._onKeyDown = (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.pressed.add(event.code);
      this.actions.push(event.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
    };
    this._onKeyUp = (event) => {
      this.keys.delete(event.code);
    };
    this._onBlur = () => {
      this.keys.clear();
      this.mouse.buttons.clear();
    };
    this._onMouseMove = (event) => {
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
      this.mouse.dx += event.movementX || 0;
      this.mouse.dy += event.movementY || 0;
    };
    this._onMouseDown = (event) => {
      this.mouse.buttons.add(event.button);
      this.pressed.add(`Mouse${event.button}`);
      if (this.canvas && document.pointerLockElement !== this.canvas) {
        try {
          const p = this.canvas.requestPointerLock();
          if (p && p.catch) p.catch(() => { /* pointer lock unavailable */ });
        } catch { /* pointer lock unavailable */ }
      }
    };
    this._onMouseUp = (event) => {
      this.mouse.buttons.delete(event.button);
    };
    this._onLockChange = () => {
      this.mouse.locked = document.pointerLockElement === this.canvas;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('pointerlockchange', this._onLockChange);
    if (this.canvas) {
      this.canvas.addEventListener('mousedown', this._onMouseDown);
    }
  }

  isDown(code) {
    return this.keys.has(code);
  }

  anyDown(codes) {
    for (const code of codes) if (this.keys.has(code)) return true;
    return false;
  }

  justPressed(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  takeActions() {
    const taken = this.actions;
    this.actions = [];
    return taken;
  }

  consumeMouse() {
    const out = { dx: this.mouse.dx, dy: this.mouse.dy };
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return out;
  }

  mouseDown(button) {
    return this.mouse.buttons.has(button);
  }

  clearPressed() {
    this.pressed.clear();
    this.actions = [];
  }
}
