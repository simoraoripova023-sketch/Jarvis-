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

  // MediaPipe Hands instance reference
  const mpHandsRef = useRef<any>(null);
  const isMediaPipeActiveRef = useRef(false);

  // Optical & Hand Detection Buffers
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const prevBboxAreaRef = useRef<number>(0);
  const lastGestureTriggerTimeRef = useRef(0);
  const smoothXRef = useRef(0);
  const smoothYRef = useRef(0);
  const smoothZoomRef = useRef(6.5);

  // Process MediaPipe results
  const handleMediaPipeResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      isMediaPipeActiveRef.current = true;
      setIsHandVisible(true);

      const landmarks = results.multiHandLandmarks[0];
      const wrist = landmarks[0];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const indexPip = landmarks[6];
      const middleTip = landmarks[12];
      const middlePip = landmarks[10];
      const ringTip = landmarks[16];
      const ringPip = landmarks[14];
      const pinkyTip = landmarks[20];
      const pinkyPip = landmarks[18];

      // Hand position mapping (index tip & wrist)
      const centerX = indexTip.x * w;
      const centerY = indexTip.y * h;

      smoothXRef.current += (centerX - smoothXRef.current) * 0.4;
      smoothYRef.current += (centerY - smoothYRef.current) * 0.4;

      const normX = ((smoothXRef.current / w) - 0.5) * 3.0;
      const normY = ((smoothYRef.current / h) - 0.5) * 3.0;

      if (onHandMove) {
        onHandMove(-normX, normY);
      }

      // Check finger states
      const indexOpen = indexTip.y < indexPip.y;
      const middleOpen = middleTip.y < middlePip.y;
      const ringOpen = ringTip.y < ringPip.y;
      const pinkyOpen = pinkyTip.y < pinkyPip.y;

      const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

      // Distance between wrist and middle tip represents hand scale/zoom
      const handScale = Math.hypot(wrist.x - middleTip.x, wrist.y - middleTip.y);
      const targetZoom = Math.max(3.5, Math.min(8.0, 9.0 - handScale * 10));
      smoothZoomRef.current += (targetZoom - smoothZoomRef.current) * 0.15;
      if (onHandZoom) {
        onHandZoom(smoothZoomRef.current);
      }

      const now = performance.now();
      let detected: GestureType = 'NONE';

      if (pinchDist < 0.065) {
        detected = 'PINCH';
      } else if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        detected = 'FIST';
      } else if (indexOpen && middleOpen && ringOpen && pinkyOpen) {
        detected = 'OPEN_PALM';
      } else if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        detected = 'POINT';
      }

      if (detected !== 'NONE' && now - lastGestureTriggerTimeRef.current > 1200) {
        lastGestureTriggerTimeRef.current = now;
        setLastDetectedGesture(detected);
        onGestureDetected(detected);
      }

      setTrackingTelemetry({
        x: Number((-normX).toFixed(2)),
        y: Number(normY.toFixed(2)),
        gesture: detected !== 'NONE' ? detected : 'TRACKING HAND',
        confidence: 96
      });

      // Draw futuristic holographic hand skeleton
      ctx.strokeStyle = '#00D9FF';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#73EEFF';

      // Connect landmarks
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17]
      ];

      connections.forEach(([p1, p2]) => {
        ctx.beginPath();
        ctx.moveTo(landmarks[p1].x * w, landmarks[p1].y * h);
        ctx.lineTo(landmarks[p2].x * w, landmarks[p2].y * h);
        ctx.stroke();
      });

      // Draw landmark nodes
      landmarks.forEach((pt: any) => {
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Reticle on index tip
      ctx.strokeStyle = '#73EEFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      isMediaPipeActiveRef.current = false;
    }
  }, [onGestureDetected, onHandMove, onHandZoom]);

  // Fallback optical analyzer if MediaPipe is loading or not available
  const analyzeFrameFallback = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    // Send frame to MediaPipe if initialized
    if (mpHandsRef.current) {
      try {
        mpHandsRef.current.send({ image: video });
        if (isMediaPipeActiveRef.current) return;
      } catch {}
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.drawImage(video, 0, 0, w, h);
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

    // Render Face & Device Overlays
    detectedEntities.forEach((entity) => {
      const { x, y, width, height } = entity.bbox;
      if (entity.type === 'FACE') {
        ctx.strokeStyle = '#00D9FF';
        ctx.lineWidth = 2;
        const cornerLen = 12;

        ctx.beginPath();
        ctx.moveTo(x, y + cornerLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerLen, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + width - cornerLen, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + cornerLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y + height - cornerLen);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x + cornerLen, y + height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + width - cornerLen, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + width, y + height - cornerLen);
        ctx.stroke();

        ctx.fillStyle = 'rgba(7, 21, 37, 0.9)';
        ctx.fillRect(x, Math.max(0, y - 22), width, 20);
        ctx.strokeStyle = '#00D9FF';
        ctx.strokeRect(x, Math.max(0, y - 22), width, 20);

        ctx.fillStyle = '#EAFBFF';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`👤 ${entity.label}`, x + 4, Math.max(12, y - 8));
      }
    });

    if (movingSkinCount > 25) {
      setIsHandVisible(true);
      const rawCenterX = movingSkinX / movingSkinCount;
      const rawCenterY = movingSkinY / movingSkinCount;

      smoothXRef.current += (rawCenterX - smoothXRef.current) * 0.4;
      smoothYRef.current += (rawCenterY - smoothYRef.current) * 0.4;

      const normX = ((smoothXRef.current / w) - 0.5) * 3.0;
      const normY = ((smoothYRef.current / h) - 0.5) * 3.0;

      if (onHandMove) onHandMove(-normX, normY);

      const bboxW = Math.max(24, maxX - minX);
      const bboxH = Math.max(24, maxY - minY);
      const bboxArea = bboxW * bboxH;

      const targetZ = Math.max(3.6, Math.min(7.8, 8.5 - (bboxArea / 1200)));
      smoothZoomRef.current += (targetZ - smoothZoomRef.current) * 0.15;
      if (onHandZoom) onHandZoom(smoothZoomRef.current);

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
    } else {
      setIsHandVisible(false);
      setTrackingTelemetry((t) => ({ ...t, gesture: 'STANDBY' }));
    }
  }, [onHandMove, onHandZoom, onGestureDetected]);

  // Initialize MediaPipe Hands if available on window
  const initMediaPipe = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).Hands) {
      try {
        const hands = new (window as any).Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults(handleMediaPipeResults);
        mpHandsRef.current = hands;
      } catch (e) {
        console.warn('MediaPipe Hands init warning:', e);
      }
    }
  }, [handleMediaPipeResults]);

  const startWebcam = useCallback(async () => {
    setWebcamError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setWebcamError('Kamera qo\'llab-quvvatlanmaydi.');
      return;
    }

    initMediaPipe();

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
        analyzeFrameFallback();
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
  }, [analyzeFrameFallback, initMediaPipe]);

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
    if (mpHandsRef.current && mpHandsRef.current.close) {
      try {
        mpHandsRef.current.close();
      } catch {}
      mpHandsRef.current = null;
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
