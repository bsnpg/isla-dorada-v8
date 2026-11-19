// Keyboard + mouse input. Held keys live in `keys` (a Set of event.code);
// one-shot presses are queued in `pressed` and taken once by justPressed(),
// so a press between two frames is never lost and never counted twice.
// Mouse deltas accumulate in mouse.dx / mouse.dy and are consumed by
// consumeMouse(). Pointer lock is requested on canvas click while playing.

export class Input {
  constructor(canvas) {
    this.canvas = canvas || null;
    /** Set of event.code strings currently held down. */
    this.keys = new Set();
    /** One-shot presses since the last justPressed() call. */
    this.pressed = new Set();
    /** Mouse state: accumulated deltas, last position, held buttons. */
    this.mouse = { dx: 0, dy: 0, x: 0, y: 0, buttons: new Set(), locked: false };
    /** Named action edge queue, filled by keydown for action keys. */
    this.actions = [];

    this._onKeyDown = (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.pressed.add(event.code);
      this.actions.push(event.code);
      // Stop the page scrolling on game keys (arrows, space).
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
    };
    this._onKeyUp = (event) => {
      this.keys.delete(event.code);
    };
    this._onBlur = () => {
      // A key released while the tab is hidden never sends keyup.
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
        // Pointer lock gives clean mouse deltas for aiming; failure is fine.
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

  /** True while the key (event.code, e.g. 'KeyW') is held. */
  isDown(code) {
    return this.keys.has(code);
  }

  /** True if any of the given codes is held. */
  anyDown(codes) {
    for (const code of codes) if (this.keys.has(code)) return true;
    return false;
  }

  /** True once for a key press since the last call for that code. */
  justPressed(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  /** Take and clear all queued one-shot action codes. */
  takeActions() {
    const taken = this.actions;
    this.actions = [];
    return taken;
  }

  /** Take the accumulated mouse deltas and reset them to zero. */
  consumeMouse() {
    const out = { dx: this.mouse.dx, dy: this.mouse.dy };
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return out;
  }

  /** True while the mouse button (0 = left) is held. */
  mouseDown(button) {
    return this.mouse.buttons.has(button);
  }

  /** Drop every queued press (used when switching modes so a stale Enter leaks nowhere). */
  clearPressed() {
    this.pressed.clear();
    this.actions = [];
  }
}
