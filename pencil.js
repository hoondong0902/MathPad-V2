
(() => {
"use strict";

class MathPadPencil {
  constructor(canvas, opts={}) {
    this.canvas = canvas;
    this.wrap = canvas.parentElement;
    this.ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    this.mode = "pen";
    this.penOnly = true;
    this.activePointerId = null;
    this.last = null;
    this.dpr = 1;
    this.history = [];
    this.redoStack = [];
    this.maxHistory = 30;
    this.writing = false;
    this._resizeTimer = null;

    this._blockNative = this._blockNative.bind(this);
    this._down = this._down.bind(this);
    this._move = this._move.bind(this);
    this._up = this._up.bind(this);

    this._applyGuards();
    this.resize();
    this._bind();
  }

  _applyGuards() {
    const c = this.canvas;
    c.style.touchAction = "none";
    c.style.webkitUserSelect = "none";
    c.style.userSelect = "none";
    c.style.webkitTouchCallout = "none";
    c.style.webkitTapHighlightColor = "transparent";
    c.setAttribute("draggable","false");
    c.setAttribute("tabindex","-1");
    c.setAttribute("aria-label","Apple Pencil 수학 풀이 캔버스");
  }

  _bind() {
    const c = this.canvas;

    ["contextmenu","selectstart","dragstart","beforeinput"].forEach(type => {
      c.addEventListener(type, this._blockNative, { passive:false, capture:true });
    });

    // Safari legacy gesture events
    ["gesturestart","gesturechange","gestureend"].forEach(type => {
      c.addEventListener(type, this._blockNative, { passive:false, capture:true });
    });

    c.addEventListener("pointerdown", this._down, { passive:false, capture:true });
    c.addEventListener("pointermove", this._move, { passive:false, capture:true });
    c.addEventListener("pointerup", this._up, { passive:false, capture:true });
    c.addEventListener("pointercancel", this._up, { passive:false, capture:true });
    c.addEventListener("lostpointercapture", this._up, { passive:false, capture:true });

    // Block long-press touch fallback on iOS Safari.
    c.addEventListener("touchstart", e => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }, { passive:false, capture:true });

    c.addEventListener("touchmove", e => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }, { passive:false, capture:true });

    window.addEventListener("resize", () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.resize(true), 120);
    });
  }

  _blockNative(e) {
    if (e.cancelable) e.preventDefault();
    e.stopImmediatePropagation?.();
    e.stopPropagation();
    return false;
  }

  _allowPointer(e) {
    if (e.pointerType === "mouse") return e.button === 0;
    if (this.penOnly) return e.pointerType === "pen";
    return e.pointerType === "pen" || e.pointerType === "touch";
  }

  _point(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x:e.clientX-r.left, y:e.clientY-r.top };
  }

  _snapshot() {
    try {
      this.history.push(this.canvas.toDataURL("image/png"));
      if (this.history.length > this.maxHistory) this.history.shift();
      this.redoStack = [];
    } catch {}
  }

  _down(e) {
    if (!this._allowPointer(e)) {
      // In pen-only mode, ignore finger contacts completely.
      if (e.pointerType === "touch") {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    this.activePointerId = e.pointerId;
    this._snapshot();
    this.writing = true;
    this.last = this._point(e);
    this.wrap.closest(".workspace-card")?.classList.add("is-writing");

    try { this.canvas.setPointerCapture(e.pointerId); } catch {}
  }

  _move(e) {
    if (!this.writing || e.pointerId !== this.activePointerId) return;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const p = this._point(e);
    const pressure = (e.pointerType === "pen" && e.pressure > 0) ? e.pressure : 0.5;

    this.ctx.save();
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    if (this.mode === "eraser") {
      this.ctx.globalCompositeOperation = "destination-out";
      this.ctx.lineWidth = 26;
    } else {
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.strokeStyle = "#111827";
      this.ctx.lineWidth = Math.max(1.6, pressure * 4.8);
    }

    this.ctx.beginPath();
    this.ctx.moveTo(this.last.x, this.last.y);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.ctx.restore();
    this.last = p;
  }

  _up(e) {
    if (!this.writing) return;
    if (this.activePointerId !== null && e.pointerId !== undefined && e.pointerId !== this.activePointerId) return;

    if (e?.cancelable) e.preventDefault();
    e?.stopPropagation?.();

    try {
      if (e && this.canvas.hasPointerCapture?.(e.pointerId)) {
        this.canvas.releasePointerCapture(e.pointerId);
      }
    } catch {}

    this.writing = false;
    this.last = null;
    this.activePointerId = null;
    this.wrap.closest(".workspace-card")?.classList.remove("is-writing");
  }

  resize(preserve=true) {
    const rect = this.wrap.getBoundingClientRect();
    const old = preserve && this.canvas.width ? this.canvas.toDataURL("image/png") : null;
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);

    if (old) {
      const img = new Image();
      img.onload = () => {
        this.ctx.save();
        this.ctx.setTransform(1,0,0,1,0,0);
        this.ctx.drawImage(img,0,0,this.canvas.width,this.canvas.height);
        this.ctx.restore();
        this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      };
      img.src = old;
    }
  }

  setMode(mode) {
    this.mode = mode === "eraser" ? "eraser" : "pen";
  }

  setPenOnly(on) {
    this.penOnly = !!on;
  }

  clear(record=true) {
    if (record) this._snapshot();
    this.ctx.save();
    this.ctx.setTransform(1,0,0,1,0,0);
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.ctx.restore();
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
  }

  _restore(src) {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      this.ctx.save();
      this.ctx.setTransform(1,0,0,1,0,0);
      this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      this.ctx.drawImage(img,0,0,this.canvas.width,this.canvas.height);
      this.ctx.restore();
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    };
    img.src = src;
  }

  undo() {
    const src = this.history.pop();
    if (!src) return;
    try { this.redoStack.push(this.canvas.toDataURL("image/png")); } catch {}
    this._restore(src);
  }

  redo() {
    const src = this.redoStack.pop();
    if (!src) return;
    try { this.history.push(this.canvas.toDataURL("image/png")); } catch {}
    this._restore(src);
  }
}

window.MathPadPencil = MathPadPencil;
})();
