/**
 * Chinese Calligraphy Ink Gesture Recognizer & Brush Trail Engine
 * Accurately classifies martial arts stroke gestures:
 * 刺 (Tap), 横 (Horizontal), 劈 (Vertical), 挑 (Rising Diagonal), 圆 (Circle Taichi), 闪 (Zigzag Flash)
 */

import { GestureResult, GestureType } from '../types/game';

export interface StrokePoint {
  x: number;
  y: number;
  t: number;
}

export class GestureRecognizer {
  /**
   * Classify user-drawn stroke points into calligraphy martial arts moves
   */
  public static recognize(points: StrokePoint[]): GestureResult | null {
    if (!points || points.length === 0) return null;

    if (points.length < 3) {
      return {
        type: 'TAP',
        name: '墨刺突刺',
        hanzi: '刺',
        desc: '疾速突刺，破招连击',
        confidence: 0.95,
        points,
      };
    }

    // Calculate total path length
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalLength += Math.hypot(dx, dy);
    }

    const duration = points[points.length - 1].t - points[0].t;
    const pStart = points[0];
    const pEnd = points[points.length - 1];
    const dx = pEnd.x - pStart.x;
    const dy = pEnd.y - pStart.y;
    const endToEndDist = Math.hypot(dx, dy);

    // Tap recognition: very short length or brief click
    if (totalLength < 32 || (duration < 180 && endToEndDist < 35)) {
      return {
        type: 'TAP',
        name: '墨刺突刺',
        hanzi: '刺',
        desc: '疾速突刺，破招连击',
        confidence: 0.98,
        points,
      };
    }

    // Compute bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const aspectRatio = width / height;

    // Resample points for consistent geometric feature analysis (16 points)
    const sampled = this.resample(points, 16);

    // Calculate cumulative angular rotation (winding angle)
    let totalAngleChange = 0;
    let inflectionCount = 0;
    for (let i = 1; i < sampled.length - 1; i++) {
      const v1x = sampled[i].x - sampled[i - 1].x;
      const v1y = sampled[i].y - sampled[i - 1].y;
      const v2x = sampled[i + 1].x - sampled[i].x;
      const v2y = sampled[i + 1].y - sampled[i].y;

      const angle1 = Math.atan2(v1y, v1x);
      const angle2 = Math.atan2(v2y, v2x);
      let diff = angle2 - angle1;
      while (diff <= -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      totalAngleChange += diff;

      // Count sharp corners (inflections > 65 deg)
      if (Math.abs(diff) > 1.13) {
        inflectionCount++;
      }
    }

    // 1. Circle / Taichi (圆 "〇"):
    // Ends are close to each other, winding angle is high (~2pi = 6.28), roughly round aspect ratio
    const closedLoopRatio = endToEndDist / Math.max(width, height);
    if (
      (Math.abs(totalAngleChange) > 4.2 || (closedLoopRatio < 0.42 && Math.abs(totalAngleChange) > 2.8)) &&
      aspectRatio > 0.4 &&
      aspectRatio < 2.5 &&
      totalLength > 120
    ) {
      return {
        type: 'CIRCLE',
        name: '浑元太极',
        hanzi: '圆',
        desc: '墨劲圆转，八卦护体并震退群敌',
        confidence: 0.94,
        points,
      };
    }

    // 2. Zigzag / Flash Dash (闪 "乛" / Z):
    // Has 1 or 2 sharp directional reversals and covers notable horizontal or diagonal ground
    if (inflectionCount >= 1 && totalLength > 100 && endToEndDist > 70) {
      return {
        type: 'ZIGZAG',
        name: '踏影瞬杀',
        hanzi: '闪',
        desc: '残影穿梭，瞬身斩敌留下水墨裂痕',
        confidence: 0.91,
        points,
      };
    }

    // 3. Horizontal Slash (横 "一"):
    // Distinctly wider than tall, moving left or right
    if (aspectRatio > 1.7 && Math.abs(dx) > Math.abs(dy) * 1.6 && totalLength > 60) {
      return {
        type: 'HORIZONTAL',
        name: '横扫千军',
        hanzi: '横',
        desc: '挥墨千钧，破浪剑气横扫前方群敌',
        confidence: 0.95,
        points,
      };
    }

    // 4. Vertical Slam Down (劈 "丨"):
    // Distinctly taller than wide, moving downward (dy > 0)
    if (aspectRatio < 0.65 && dy > Math.abs(dx) * 1.5 && dy > 50) {
      return {
        type: 'VERTICAL_DOWN',
        name: '力劈华山',
        hanzi: '劈',
        desc: '凌空重劈，震撼大地激起墨涌地刺',
        confidence: 0.96,
        points,
      };
    }

    // 5. Rising Launcher / Diagonal Up (挑 "丿" / "乀"):
    // Upward stroke (dy < 0) with substantial upward velocity
    if (dy < -45 && Math.abs(dy) > 40) {
      return {
        type: 'DIAGONAL_UP',
        name: '飞燕凌空',
        hanzi: '挑',
        desc: '墨锋挑空，击飞目标实现凌空追击',
        confidence: 0.90,
        points,
      };
    }

    // Secondary fallback: examine primary displacement vector
    if (Math.abs(dx) > Math.abs(dy)) {
      return {
        type: 'HORIZONTAL',
        name: '横扫千军',
        hanzi: '横',
        desc: '挥墨千钧，破浪剑气横扫前方群敌',
        confidence: 0.82,
        points,
      };
    } else if (dy > 0) {
      return {
        type: 'VERTICAL_DOWN',
        name: '力劈华山',
        hanzi: '劈',
        desc: '凌空重劈，震撼大地激起墨涌地刺',
        confidence: 0.82,
        points,
      };
    } else {
      return {
        type: 'DIAGONAL_UP',
        name: '飞燕凌空',
        hanzi: '挑',
        desc: '墨锋挑空，击飞目标实现凌空追击',
        confidence: 0.80,
        points,
      };
    }
  }

  /**
   * Resamples points along curve to fixed count with equidistant spacing
   */
  private static resample(points: StrokePoint[], n: number): StrokePoint[] {
    if (points.length <= 1) return points;

    let totalLength = 0;
    const dists: number[] = [0];
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      totalLength += d;
      dists.push(totalLength);
    }

    if (totalLength === 0) return points;

    const interval = totalLength / (n - 1);
    const res: StrokePoint[] = [points[0]];
    let currentIdx = 0;

    for (let i = 1; i < n - 1; i++) {
      const targetDist = i * interval;
      while (currentIdx < dists.length - 1 && dists[currentIdx + 1] < targetDist) {
        currentIdx++;
      }
      const segStart = dists[currentIdx];
      const segEnd = dists[currentIdx + 1];
      const ratio = (targetDist - segStart) / Math.max(0.0001, segEnd - segStart);
      const p1 = points[currentIdx];
      const p2 = points[currentIdx + 1];

      res.push({
        x: p1.x + (p2.x - p1.x) * ratio,
        y: p1.y + (p2.y - p1.y) * ratio,
        t: p1.t + (p2.t - p1.t) * ratio,
      });
    }

    res.push(points[points.length - 1]);
    return res;
  }

  /**
   * Render real-time ink calligraphy brush stroke on canvas with Chinese sumi-e dynamics
   */
  public static renderBrushStroke(ctx: CanvasRenderingContext2D, points: StrokePoint[]) {
    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const pPrev = points[i - 1];
      const pCurr = points[i];

      const dt = Math.max(1, pCurr.t - pPrev.t);
      const dist = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);
      const speed = dist / dt;

      // Ink stroke width: slower = thicker ink bleed; faster = thinner dry brush (飞白)
      const baseWidth = Math.max(3, Math.min(18, 16 - speed * 4));

      // Draw main black ink core
      ctx.beginPath();
      ctx.moveTo(pPrev.x, pPrev.y);
      ctx.lineTo(pCurr.x, pCurr.y);
      ctx.strokeStyle = '#1a1917';
      ctx.lineWidth = baseWidth;
      ctx.stroke();

      // Draw faint ink bleed outer edge (晕染)
      ctx.beginPath();
      ctx.moveTo(pPrev.x, pPrev.y);
      ctx.lineTo(pCurr.x, pCurr.y);
      ctx.strokeStyle = 'rgba(30, 25, 20, 0.25)';
      ctx.lineWidth = baseWidth + 5;
      ctx.stroke();

      // Bristle feathering on faster strokes (飞白)
      if (speed > 1.2 && i % 2 === 0) {
        const nx = -(pCurr.y - pPrev.y) / (dist || 1);
        const ny = (pCurr.x - pPrev.x) / (dist || 1);
        const offset = (Math.random() - 0.5) * baseWidth * 1.2;

        ctx.beginPath();
        ctx.moveTo(pPrev.x + nx * offset, pPrev.y + ny * offset);
        ctx.lineTo(pCurr.x + nx * offset, pCurr.y + ny * offset);
        ctx.strokeStyle = 'rgba(40, 35, 30, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Brush head indicator on the latest point
    const head = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#b91c1c'; // Vermilion tip of brush
    ctx.fill();

    ctx.restore();
  }
}
