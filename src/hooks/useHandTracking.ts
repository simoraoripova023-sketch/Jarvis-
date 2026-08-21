import { useState, useRef, useCallback, useEffect } from 'react';
import { GestureType } from '../types/neural';
import { jarvisVision } from '../services/JarvisVisionService';

export function useHandTracking(
  onGestureDetected: (gesture: GestureType) => void,
  onHandMove?: (x: number, y: number) => void,
  onHandZoom?: (zoom: number) => void
) {
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [lastDetectedGesture, setLastDetectedGesture] = useState<GestureType>('NONE');
  const [isHandVisible, setIsHandVisible] = useState(false);
  const [trackingTelemetry, setTrackingTelemetry] = useState({ x: 0, y: 0, gesture: 'READY', confidence: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Optical & Hand Detection Buffers
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const prevBboxAreaRef = useRef<number>(0);
  const lastGestureTriggerTimeRef = useRef(0);
  const smoothXRef = useRef(0);
  const smoothYRef = useRef(0);
  const smoothZoomRef = useRef(6.5);

  // Optical Motion, Hand & Face AI Analyzer
  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.drawImage(video, 0, 0, w, h);

    // 1. Process Face & Object Recognition via JarvisVisionService
    const detectedEntities = jarvisVision.processVideoFrame(canvas, ctx, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let movingSkinX = 0;
    let movingSkinY = 0;
    let movingSkinCount = 0;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;

    const prev = prevFrameDataRef.current;

    // Filter moving skin pixels for gesture tracking
    if (prev && prev.length === data.length) {
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const i = (y * w + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const diff = Math.abs(r - prev[i]) + Math.abs(g - prev[i + 1]) + Math.abs(b - prev[i + 2]);

          const isSkin = (r > 60) && (g > 35) && (b > 20) &&
                         (r > g) && (r > b) &&
                         (Math.abs(r - g) > 10) &&
                         (r - b > 12);

          if (diff > 45 && isSkin) {
            movingSkinX += x;
            movingSkinY += y;
            movingSkinCount++;

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    prevFrameDataRef.current = new Uint8ClampedArray(data);

    ctx.clearRect(0, 0, w, h);

    // 2. Render Face Reticles & Holographic Targeting Overlays
    detectedEntities.forEach((entity) => {
      const { x, y, width, height } = entity.bbox;

      if (entity.type === 'FACE') {
        // Futuristic Iron Man Hexagonal/Cornered Bracket
        ctx.strokeStyle = '#00D9FF';
        ctx.lineWidth = 2;
        const cornerLen = 12;

        // Top Left
        ctx.beginPath();
        ctx.moveTo(x, y + cornerLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerLen, y);
        ctx.stroke();

        // Top Right
        ctx.beginPath();
        ctx.moveTo(x + width - cornerLen, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + cornerLen);
        ctx.stroke();

        // Bottom Left
        ctx.beginPath();
        ctx.moveTo(x, y + height - cornerLen);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x + cornerLen, y + height);
        ctx.stroke();

        // Bottom Right
        ctx.beginPath();
        ctx.moveTo(x + width - cornerLen, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + width, y + height - cornerLen);
        ctx.stroke();

        // Center Target Crosshair
        const cx = x + width / 2;
        const cy = y + height / 2;
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.4)';
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(x + 4, y + 4, width - 8, height - 8);
        ctx.setLineDash([]);

        // Label Badge
        ctx.fillStyle = 'rgba(7, 21, 37, 0.9)';
        ctx.fillRect(x, Math.max(0, y - 22), width, 20);
        ctx.strokeStyle = '#00D9FF';
        ctx.strokeRect(x, Math.max(0, y - 22), width, 20);

        ctx.fillStyle = '#EAFBFF';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`👤 ${entity.label}`, x + 4, Math.max(12, y - 8));

        // Distance & Lock Tag
        ctx.fillStyle = '#00D9FF';
        ctx.font = '8px monospace';
        ctx.fillText(`🎯 ${entity.distanceMeters}m • LOCK 99%`, x + 4, y + height + 12);
      } else if (entity.type === 'DEVICE') {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);

        ctx.fillStyle = '#F59E0B';
        ctx.font = '8px monospace';
        ctx.fillText(`📱 ${entity.label}`, x, Math.max(10, y - 4));
      }
    });

    // 3. Render Hand Gestures
    if (movingSkinCount > 25) {
      setIsHandVisible(true);

      const rawCenterX = movingSkinX / movingSkinCount;
      const rawCenterY = movingSkinY / movingSkinCount;

      smoothXRef.current += (rawCenterX - smoothXRef.current) * 0.4;
      smoothYRef.current += (rawCenterY - smoothYRef.current) * 0.4;

      const normX = ((smoothXRef.current / w) - 0.5) * 3.0;
      const normY = ((smoothYRef.current / h) - 0.5) * 3.0;

      if (onHandMove) {
        onHandMove(-normX, normY);
      }

      const bboxW = Math.max(24, maxX - minX);
      const bboxH = Math.max(24, maxY - minY);
      const bboxArea = bboxW * bboxH;

      const targetZ = Math.max(3.6, Math.min(7.8, 8.5 - (bboxArea / 1200)));
      smoothZoomRef.current += (targetZ - smoothZoomRef.current) * 0.15;

      if (onHandZoom) {
        onHandZoom(smoothZoomRef.current);
      }

      // Pinch Gesture Detection
      const prevArea = prevBboxAreaRef.current;
      const now = performance.now();

      if (prevArea > 1800 && bboxArea < 900 && now - lastGestureTriggerTimeRef.current > 1200) {
        lastGestureTriggerTimeRef.current = now;
        setLastDetectedGesture('PINCH');
        onGestureDetected('PINCH');
      }

      prevBboxAreaRef.current = bboxArea;

      setTrackingTelemetry({
        x: Number((-normX).toFixed(2)),
        y: Number(normY.toFixed(2)),
        gesture: 'TRACKING MOTION',
        confidence: Math.min(98, movingSkinCount * 2)
      });

      // Hand Cursor Reticle
      ctx.strokeStyle = '#73EEFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(smoothXRef.current, smoothYRef.current, 8, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(smoothXRef.current - 12, smoothYRef.current);
      ctx.lineTo(smoothXRef.current + 12, smoothYRef.current);
      ctx.moveTo(smoothXRef.current, smoothYRef.current - 12);
      ctx.lineTo(smoothXRef.current, smoothYRef.current + 12);
      ctx.stroke();
    } else {
      setIsHandVisible(false);
      setTrackingTelemetry((t) => ({ ...t, gesture: 'STANDBY' }));
    }
  }, [onHandMove, onHandZoom, onGestureDetected]);

  const startWebcam = useCallback(async () => {
    setWebcamError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setWebcamError('Kamera qo\'llab-quvvatlanmaydi.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsWebcamActive(true);
      jarvisVision.setVisionActive(true);

      const loop = () => {
        analyzeFrame();
        animFrameRef.current = requestAnimationFrame(loop);
      };

      loop();
    } catch (err: any) {
      console.error('Webcam access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setWebcamError('Kameraga ruxsat berilmadi. Iltimos brauzer manzil satridagi 🔒 (qulf) belgisidan ruxsat bering!');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setWebcamError('Kompyuteringizda kamera topilmadi.');
      } else {
        setWebcamError(`Kamera xatosi: ${err.message || 'Xatolik'}`);
      }
      setIsWebcamActive(false);
      jarvisVision.setVisionActive(false);
    }
  }, [analyzeFrame]);

  const stopWebcam = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
    setIsHandVisible(false);
    jarvisVision.setVisionActive(false);
  }, []);

  const toggleWebcam = useCallback(() => {
    if (isWebcamActive) {
      stopWebcam();
    } else {
      startWebcam();
    }
  }, [isWebcamActive, startWebcam, stopWebcam]);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  return {
    isWebcamActive,
    webcamError,
    videoRef,
    canvasRef,
    toggleWebcam,
    lastDetectedGesture,
    isHandVisible,
    trackingTelemetry
  };
}
