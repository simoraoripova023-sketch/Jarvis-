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
  const [trackingTelemetry, setTrackingTelemetry] = useState({
    x: 0,
    y: 0,
    gesture: 'STANDBY',
    confidence: 0
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Processing state lock to prevent MediaPipe pipeline busy errors
  const isMediaPipeProcessingRef = useRef(false);
  const mpHandsRef = useRef<any>(null);
  const useMediaPipeRef = useRef(false);

  // Hand tracking smoothing
  const smoothXRef = useRef(0);
  const smoothYRef = useRef(0);
  const smoothZoomRef = useRef(6.5);
  const lastGestureTriggerTimeRef = useRef(0);

  // Optical fallback buffers
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const prevBboxAreaRef = useRef<number>(0);

  // Trigger gesture with cooldown
  const handleDetectedGesture = useCallback((gesture: GestureType) => {
    const now = performance.now();
    if (now - lastGestureTriggerTimeRef.current > 1200) {
      lastGestureTriggerTimeRef.current = now;
      setLastDetectedGesture(gesture);
      onGestureDetected(gesture);
    }
  }, [onGestureDetected]);

  // Handle MediaPipe 21 Hand Landmarks
  const onMediaPipeResults = useCallback((results: any) => {
    isMediaPipeProcessingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      useMediaPipeRef.current = true;
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

      // Calculate hand coordinates (-1 to 1) for 3D rotation
      const rawX = indexTip.x * w;
      const rawY = indexTip.y * h;

      smoothXRef.current += (rawX - smoothXRef.current) * 0.45;
      smoothYRef.current += (rawY - smoothYRef.current) * 0.45;

      const normX = ((smoothXRef.current / w) - 0.5) * 3.2;
      const normY = ((smoothYRef.current / h) - 0.5) * 3.2;

      if (onHandMove) {
        onHandMove(-normX, normY);
      }

      // Fast direct dispatch to 3D canvas
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jarvis-hand-motion', {
          detail: { x: -normX, y: normY, zoom: smoothZoomRef.current }
        }));
      }

      // Finger extension detection
      const indexOpen = indexTip.y < indexPip.y;
      const middleOpen = middleTip.y < middlePip.y;
      const ringOpen = ringTip.y < ringPip.y;
      const pinkyOpen = pinkyTip.y < pinkyPip.y;

      // Distance between thumb tip and index tip for Pinch
      const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

      // Hand scale (distance between wrist and middle finger tip) for 3D Zoom
      const handScale = Math.hypot(wrist.x - middleTip.x, wrist.y - middleTip.y);
      const targetZoom = Math.max(3.5, Math.min(8.0, 9.2 - handScale * 11));
      smoothZoomRef.current += (targetZoom - smoothZoomRef.current) * 0.15;
      if (onHandZoom) {
        onHandZoom(smoothZoomRef.current);
      }

      // Gesture Classification
      let gesture: GestureType = 'NONE';
      if (pinchDist < 0.075) {
        gesture = 'PINCH';
      } else if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        gesture = 'FIST';
      } else if (indexOpen && middleOpen && ringOpen && pinkyOpen) {
        gesture = 'OPEN_PALM';
      } else if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        gesture = 'POINT';
      }

      if (gesture !== 'NONE') {
        handleDetectedGesture(gesture);
      }

      setTrackingTelemetry({
        x: Number((-normX).toFixed(2)),
        y: Number(normY.toFixed(2)),
        gesture: gesture !== 'NONE' ? gesture : 'TRACKING HAND',
        confidence: 98
      });

      // Render Holographic Hand Skeleton
      ctx.strokeStyle = '#00D9FF';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#73EEFF';

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

      landmarks.forEach((pt: any) => {
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Holographic targeting cursor on index finger
      ctx.strokeStyle = '#73EEFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rawX, rawY, 9, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      setIsHandVisible(false);
      setTrackingTelemetry((t) => ({ ...t, gesture: 'SEARCHING' }));
    }
  }, [handleDetectedGesture, onHandMove, onHandZoom]);

  // Optical fallback analyzer
  const analyzeOpticalFallback = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.drawImage(video, 0, 0, w, h);
    jarvisVision.processVideoFrame(canvas, ctx, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let skinX = 0;
    let skinY = 0;
    let skinCount = 0;
    let minX = w, maxX = 0, minY = h, maxY = 0;

    const prev = prevFrameDataRef.current;

    if (prev && prev.length === data.length) {
      for (let y = 0; y < h; y += 3) {
        for (let x = 0; x < w; x += 3) {
          const i = (y * w + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const diff = Math.abs(r - prev[i]) + Math.abs(g - prev[i + 1]) + Math.abs(b - prev[i + 2]);
          const isSkin = r > 60 && g > 35 && b > 20 && r > g && r > b && Math.abs(r - g) > 10;

          if (diff > 35 && isSkin) {
            skinX += x;
            skinY += y;
            skinCount++;
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

    if (skinCount > 20) {
      setIsHandVisible(true);
      const rawX = skinX / skinCount;
      const rawY = skinY / skinCount;

      smoothXRef.current += (rawX - smoothXRef.current) * 0.45;
      smoothYRef.current += (rawY - smoothYRef.current) * 0.45;

      const normX = ((smoothXRef.current / w) - 0.5) * 3.2;
      const normY = ((smoothYRef.current / h) - 0.5) * 3.2;

      if (onHandMove) onHandMove(-normX, normY);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jarvis-hand-motion', {
          detail: { x: -normX, y: normY, zoom: smoothZoomRef.current }
        }));
      }

      const bboxArea = Math.max(20, maxX - minX) * Math.max(20, maxY - minY);
      const targetZ = Math.max(3.6, Math.min(8.0, 9.0 - (bboxArea / 1200)));
      smoothZoomRef.current += (targetZ - smoothZoomRef.current) * 0.15;
      if (onHandZoom) onHandZoom(smoothZoomRef.current);

      const prevArea = prevBboxAreaRef.current;
      const now = performance.now();

      if (prevArea > 1500 && bboxArea < 800 && now - lastGestureTriggerTimeRef.current > 1200) {
        handleDetectedGesture('PINCH');
      } else if (bboxArea > 3500 && now - lastGestureTriggerTimeRef.current > 1500) {
        handleDetectedGesture('OPEN_PALM');
      } else if (bboxArea < 900 && bboxArea > 200 && now - lastGestureTriggerTimeRef.current > 1500) {
        handleDetectedGesture('FIST');
      }

      prevBboxAreaRef.current = bboxArea;

      setTrackingTelemetry({
        x: Number((-normX).toFixed(2)),
        y: Number(normY.toFixed(2)),
        gesture: 'OPTICAL MOTION',
        confidence: Math.min(95, skinCount * 2)
      });

      // Reticle
      ctx.strokeStyle = '#00D9FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(smoothXRef.current, smoothYRef.current, 10, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      setIsHandVisible(false);
      setTrackingTelemetry((t) => ({ ...t, gesture: 'STANDBY' }));
    }
  }, [handleDetectedGesture, onHandMove, onHandZoom]);

  // Main frame processing loop
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    // If MediaPipe is active, send frame with promise lock
    if (mpHandsRef.current && !isMediaPipeProcessingRef.current) {
      isMediaPipeProcessingRef.current = true;
      mpHandsRef.current.send({ image: video }).catch(() => {
        isMediaPipeProcessingRef.current = false;
        useMediaPipeRef.current = false;
        analyzeOpticalFallback(video, canvas);
      });
    } else if (!mpHandsRef.current) {
      analyzeOpticalFallback(video, canvas);
    }
  }, [analyzeOpticalFallback]);

  // Initialize MediaPipe Hands
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

        hands.onResults(onMediaPipeResults);
        mpHandsRef.current = hands;
      } catch (err) {
        console.warn('MediaPipe hands load warning, using optical fallback:', err);
      }
    }
  }, [onMediaPipeResults]);

  const startWebcam = useCallback(async () => {
    setWebcamError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setWebcamError("Brauzer kamerani qo'llab-quvvatlamaydi.");
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
        processFrame();
        animFrameRef.current = requestAnimationFrame(loop);
      };

      loop();
    } catch (err: any) {
      console.error('Webcam start error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setWebcamError("Kameraga ruxsat berilmadi. Manzil satridagi qulf (🔒) belgisidan kameraga ruxsat bering.");
      } else {
        setWebcamError(`Kamera xatosi: ${err.message || 'Xatolik'}`);
      }
      setIsWebcamActive(false);
      jarvisVision.setVisionActive(false);
    }
  }, [initMediaPipe, processFrame]);

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
    isMediaPipeProcessingRef.current = false;
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
