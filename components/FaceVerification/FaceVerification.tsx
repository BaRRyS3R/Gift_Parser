// src/components/FaceVerification/FaceVerification.tsx

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, SwitchCamera } from "lucide-react";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";

interface EmotionPrediction {
  emotion: "happy" | "sad" | "angry" | "neutral";
  confidence: number;
}

interface FaceDetectionState {
  isLoading: boolean;
  error: string | null;
  faceDetected: boolean;
  emotion: EmotionPrediction | null;
}

export default function FaceVerification() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [state, setState] = useState<FaceDetectionState>({
    isLoading: true,
    error: null,
    faceDetected: false,
    emotion: null,
  });

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check for multiple cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");
      setHasMultipleCameras(videoDevices.length > 1);

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error("Camera initialization error:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "Unable to access camera. Please check permissions.",
      }));
    }
  }, [facingMode]);

  // Initialize face detection model
  const initFaceDetection = useCallback(async () => {
    try {
      await tf.ready();
      await tf.setBackend("webgl");

      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig = {
        runtime: "mediapipe",
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh",
        refineLandmarks: true,
        maxFaces: 1,
      };

      const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
      detectorRef.current = detector;
    } catch (error) {
      console.error("Face detection initialization error:", error);
      setState(prev => ({
        ...prev,
        error: "Failed to initialize face detection",
      }));
    }
  }, []);

  // Analyze facial features for emotion (simplified version)
  const analyzeEmotion = useCallback((keypoints: faceLandmarksDetection.Keypoint[]): EmotionPrediction => {
    // This is a simplified emotion detection based on facial landmarks
    // In production, you'd use a proper emotion recognition model
    
    // Calculate features
    const calculateDistance = (p1: number, p2: number) => {
      const point1 = keypoints[p1];
      const point2 = keypoints[p2];
      return Math.sqrt(
        Math.pow(point1.x - point2.x, 2) + 
        Math.pow(point1.y - point2.y, 2)
      );
    };

    // Key points for emotion detection
    // Mouth corners: 61 (left), 291 (right)
    // Mouth top: 13, bottom: 14
    // Upper lip: 12, Lower lip: 15
    // Left eyebrow inner: 107, outer: 55
    // Right eyebrow inner: 336, outer: 285
    // Nose tip: 1
    
    // Calculate mouth features
    const mouthLeft = keypoints[61];
    const mouthRight = keypoints[291];
    const mouthTop = keypoints[13];
    const mouthBottom = keypoints[14];
    const upperLip = keypoints[12];
    const lowerLip = keypoints[15];
    
    // Mouth openness (vertical distance)
    const mouthOpenness = calculateDistance(13, 14);
    const mouthWidth = calculateDistance(61, 291);
    
    // Mouth corners position relative to center
    const mouthCenter = keypoints[13];
    const leftCornerHeight = mouthLeft.y - mouthCenter.y;
    const rightCornerHeight = mouthRight.y - mouthCenter.y;
    const averageCornerHeight = (leftCornerHeight + rightCornerHeight) / 2;
    
    // Eyebrow features
    const leftBrowInner = keypoints[107];
    const leftBrowOuter = keypoints[55];
    const rightBrowInner = keypoints[336];
    const rightBrowOuter = keypoints[285];
    const noseTip = keypoints[1];
    
    // Calculate eyebrow angles and positions
    const leftBrowAngle = Math.atan2(leftBrowOuter.y - leftBrowInner.y, leftBrowOuter.x - leftBrowInner.x);
    const rightBrowAngle = Math.atan2(rightBrowOuter.y - rightBrowInner.y, rightBrowInner.x - rightBrowOuter.x);
    const avgBrowAngle = (leftBrowAngle + rightBrowAngle) / 2;
    
    // Distance between eyebrows (furrowing)
    const browDistance = calculateDistance(107, 336);
    const faceWidth = calculateDistance(234, 454); // Face width reference points
    const browDistanceRatio = browDistance / faceWidth;
    
    // Eye features
    const leftEyeTop = keypoints[159];
    const leftEyeBottom = keypoints[145];
    const rightEyeTop = keypoints[386];
    const rightEyeBottom = keypoints[374];
    const leftEyeOpenness = calculateDistance(159, 145);
    const rightEyeOpenness = calculateDistance(386, 374);
    const avgEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;
    
    // Normalize features based on face size
    const faceHeight = calculateDistance(10, 152); // Top to bottom of face
    const normalizedMouthOpenness = mouthOpenness / faceHeight;
    const normalizedCornerHeight = averageCornerHeight / faceHeight;
    const normalizedEyeOpenness = avgEyeOpenness / faceHeight;
    
    // Emotion classification with corrected thresholds
    let emotion: EmotionPrediction["emotion"] = "neutral";
    let confidence = 0.7;
    
    // Happy: mouth corners up, moderate mouth opening, eyes slightly squinted
    const smileScore = -normalizedCornerHeight; // Negative because up is negative in y-axis
    const isSmiling = smileScore > 0.01 && normalizedMouthOpenness < 0.15;
    
    // Sad: mouth corners down, eyebrows angled down on outer edges
    const isSad = normalizedCornerHeight > 0.02 && avgBrowAngle > 0.1;
    
    // Angry: eyebrows furrowed (close together), angled down, mouth tight
    const isAngry = browDistanceRatio < 0.18 && avgBrowAngle < -0.1 && normalizedMouthOpenness < 0.05;
    
    // Apply classification
    if (isSmiling && normalizedEyeOpenness < 0.045) {
      emotion = "happy";
      confidence = Math.min(0.95, 0.6 + smileScore * 10);
    } else if (isSad) {
      emotion = "sad";
      confidence = Math.min(0.9, 0.6 + normalizedCornerHeight * 5);
    } else if (isAngry) {
      emotion = "angry";
      confidence = Math.min(0.9, 0.6 + (0.2 - browDistanceRatio) * 3);
    } else {
      // Neutral - default state
      emotion = "neutral";
      // Check if mouth is just open (not an emotion indicator)
      if (normalizedMouthOpenness > 0.1) {
        confidence = 0.5; // Lower confidence when mouth is open without other indicators
      } else {
        confidence = 0.75;
      }
    }
    
    return { emotion, confidence };
  }, []);

  // Draw face mesh
  const drawFaceMesh = useCallback((keypoints: faceLandmarksDetection.Keypoint[], ctx: CanvasRenderingContext2D) => {
    // Set mesh style
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#00ff88";

    // Draw connections (simplified mesh)
    const connections = faceLandmarksDetection.util.getKeypointIndexByContour(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
    );

    // Draw face oval
    const faceOval = connections.faceOval;
    if (faceOval) {
      ctx.beginPath();
      faceOval.forEach((index, i) => {
        const point = keypoints[index];
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.stroke();
    }

    // Draw eyes
    [connections.leftEye, connections.rightEye].forEach(eye => {
      if (eye) {
        ctx.beginPath();
        eye.forEach((index, i) => {
          const point = keypoints[index];
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.closePath();
        ctx.stroke();
      }
    });

    // Draw lips
    [connections.lips].forEach(feature => {
      if (feature) {
        ctx.beginPath();
        feature.forEach((index, i) => {
          const point = keypoints[index];
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.closePath();
        ctx.stroke();
      }
    });

    // Draw key points
    keypoints.forEach((keypoint) => {
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, []);

  // Main detection loop
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !detectorRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(detectFace);
      return;
    }

    // Set canvas size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply mirror transformation if needed (always mirror for front camera)
    if (facingMode === "user") {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
    }

    try {
      // Detect faces
      const faces = await detectorRef.current.estimateFaces(video, {
        flipHorizontal: false,
      });

      if (faces.length > 0) {
        const face = faces[0];
        const keypoints = face.keypoints;

        // Draw face mesh
        drawFaceMesh(keypoints, ctx);

        // Analyze emotion
        const emotion = analyzeEmotion(keypoints);

        setState(prev => ({
          ...prev,
          faceDetected: true,
          emotion: emotion,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          faceDetected: false,
          emotion: null,
        }));
      }
    } catch (error) {
      console.error("Detection error:", error);
    }

    // Restore canvas transformation
    if (facingMode === "user") {
      ctx.restore();
    }

    animationFrameRef.current = requestAnimationFrame(detectFace);
  }, [facingMode, drawFaceMesh, analyzeEmotion]);

  // Toggle camera facing mode
  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  }, []);

  // Initialize everything
  useEffect(() => {
    initCamera();
    initFaceDetection();

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
    };
  }, [initCamera, initFaceDetection]);

  // Start detection loop when video is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      detectFace();
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [detectFace]);

  return (
    <div className="relative w-full h-full">
      {/* Video feed */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover bg-black ${
          facingMode === "user" ? "scale-x-[-1]" : ""
        }`}
        playsInline
        muted
        autoPlay
      />

      {/* Canvas for face mesh overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Top overlay with emotion and confidence */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6 safe-area-inset">
        <div className="text-center text-white">
          {state.error ? (
            <div className="flex items-center justify-center gap-2 text-red-400">
              <CameraOff size={20} />
              <span className="text-sm">{state.error}</span>
            </div>
          ) : state.isLoading ? (
            <div className="text-sm text-gray-400">Initializing camera...</div>
          ) : !state.faceDetected ? (
            <div className="text-sm text-yellow-400">No face detected</div>
          ) : state.emotion ? (
            <div className="space-y-2">
              <div className="text-3xl font-bold uppercase tracking-wider">
                {state.emotion.emotion}
              </div>
              <div className="text-sm text-gray-300">
                Confidence: {(state.emotion.confidence * 100).toFixed(1)}%
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Control buttons */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 safe-area-inset-bottom">
        {/* Switch camera button (only show if multiple cameras) */}
        {hasMultipleCameras && (
          <button
            onClick={toggleCamera}
            className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
            aria-label="Switch camera"
          >
            <SwitchCamera size={24} />
          </button>
        )}
      </div>

      {/* Loading overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white text-center">
            <Camera className="animate-pulse mx-auto mb-2" size={48} />
            <p>Loading face detection...</p>
          </div>
        </div>
      )}
    </div>
  );
}