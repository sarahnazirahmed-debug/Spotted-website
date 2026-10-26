// Small pictures drawn with code (no image files), used on the 3D signs and phone screens.
import * as THREE from "three";

function fontFamily() {
  return getComputedStyle(document.body).fontFamily;
}

function makeTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  fontSpec?: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Draw again once the Poppins font has finished loading.
  if (document.fonts) {
    const redraw = () => {
      draw(ctx, w, h);
      tex.needsUpdate = true;
    };
    if (fontSpec) document.fonts.load(fontSpec).then(redraw);
    else document.fonts.ready.then(redraw);
  }
  return tex;
}

// The "Café Luna" shop sign.
export function signTexture(text: string) {
  const spec = `800 54px ${fontFamily()}`;
  return makeTexture(
    512,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = "#3C096C";
      ctx.beginPath();
      ctx.roundRect(4, 4, w - 8, h - 8, 28);
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#FFD23F";
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 54px ${fontFamily()}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, w / 2, h / 2 + 4);
    },
    spec,
  );
}

// A pretend reel: a coffee cup, steam, caption bars and a save icon on the right.
export function reelTexture(accent: string) {
  const spec = `800 26px ${fontFamily()}`;
  return makeTexture(
    256,
    448,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#6A1FB0");
      g.addColorStop(1, "#3C096C");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 26px ${fontFamily()}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Reels", 18, 18);

      // cup, handle and saucer
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(w * 0.26, h * 0.42, w * 0.36, h * 0.2, 20);
      ctx.fill();
      ctx.lineWidth = 14;
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.arc(w * 0.63, h * 0.5, w * 0.08, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(w * 0.18, h * 0.63, w * 0.52, h * 0.03, 8);
      ctx.fill();

      // steam
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      [0.34, 0.44, 0.54].forEach((fx) => {
        const x = w * fx;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.38);
        ctx.quadraticCurveTo(x + 14, h * 0.33, x, h * 0.28);
        ctx.quadraticCurveTo(x - 14, h * 0.23, x, h * 0.18);
        ctx.stroke();
      });

      // caption bars
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.roundRect(18, h * 0.8, w * 0.62, 22, 11);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(18, h * 0.8 + 36, w * 0.4, 22, 11);
      ctx.fill();

      // save icon (an empty bookmark outline)
      const cx = w * 0.84;
      const cy = h * 0.55;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 6;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy - 24);
      ctx.lineTo(cx + 16, cy - 24);
      ctx.lineTo(cx + 16, cy + 24);
      ctx.lineTo(cx, cy + 10);
      ctx.lineTo(cx - 16, cy + 24);
      ctx.closePath();
      ctx.stroke();
    },
    spec,
  );
}

// A tall strip of three different reels (cup, cake, pizza). The phone scrolls through it.
export function reelStripTexture() {
  const spec = `800 26px ${fontFamily()}`;
  const tex = makeTexture(
    256,
    448 * 3,
    (ctx, w, hAll) => {
      const h = hAll / 3;
      const icons = ["cup", "cake", "pizza"];
      icons.forEach((icon, n) => {
        ctx.save();
        ctx.translate(0, n * h);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, n === 1 ? "#E5383B" : "#6A1FB0");
        g.addColorStop(1, "#3C096C");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `800 26px ${fontFamily()}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Reels", 18, 18);
        ctx.fillStyle = n === 0 ? "#FFD23F" : "#C9A2FF";
        if (icon === "cup") {
          ctx.beginPath();
          ctx.roundRect(w * 0.26, h * 0.42, w * 0.36, h * 0.2, 20);
          ctx.fill();
          ctx.lineWidth = 14;
          ctx.strokeStyle = "#FFD23F";
          ctx.beginPath();
          ctx.arc(w * 0.63, h * 0.5, w * 0.08, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();
        } else if (icon === "cake") {
          ctx.beginPath();
          ctx.roundRect(w * 0.22, h * 0.5, w * 0.56, h * 0.14, 14);
          ctx.fill();
          ctx.fillStyle = "#FFD23F";
          ctx.beginPath();
          ctx.roundRect(w * 0.28, h * 0.4, w * 0.44, h * 0.1, 12);
          ctx.fill();
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.36, 14, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(w * 0.2, h * 0.4);
          ctx.lineTo(w * 0.8, h * 0.4);
          ctx.lineTo(w * 0.5, h * 0.68);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#E5383B";
          ctx.beginPath();
          ctx.arc(w * 0.4, h * 0.46, 12, 0, Math.PI * 2);
          ctx.arc(w * 0.58, h * 0.47, 12, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.roundRect(18, h * 0.8, w * 0.62, 22, 11);
        ctx.fill();
        ctx.restore();
      });
    },
    spec,
  );
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1 / 3);
  return tex;
}

// A speech bubble with a big question mark (the cafe does not know who sent the customer).
export function questionTexture() {
  const spec = `800 120px ${fontFamily()}`;
  return makeTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#C9A2FF";
      ctx.beginPath();
      ctx.roundRect(16, 16, w - 32, h - 72, 48);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w * 0.4, h - 58);
      ctx.lineTo(w * 0.5, h - 12);
      ctx.lineTo(w * 0.6, h - 58);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3C096C";
      ctx.font = `800 120px ${fontFamily()}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", w / 2, (h - 40) / 2 + 6);
    },
    spec,
  );
}
