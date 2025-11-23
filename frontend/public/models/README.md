# Face Detection Models

This directory should contain the face-api.js model files:

- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`

## Installation

Download the models from the [face-api.js GitHub repository](https://github.com/justadudewhohacks/face-api.js/tree/master/weights) and place them in this directory.

Or use the following commands to download them:

```bash
# Tiny Face Detector
curl -L https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-weights_manifest.json -o tiny_face_detector_model-weights_manifest.json
curl -L https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-shard1 -o tiny_face_detector_model-shard1

# Face Landmark 68
curl -L https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-weights_manifest.json -o face_landmark_68_model-weights_manifest.json
curl -L https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-shard1 -o face_landmark_68_model-shard1

# Face Recognition
curl -L https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-weights_manifest.json -o face_recognition_model-weights_manifest.json
curl -L https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard1 -o face_recognition_model-shard1
```

These models are required for the webcam face detection functionality in the proctoring system.