"""
캐리커처 변환 모델 모듈
- dlib 없이도 동작 (중앙 크롭 폴백)
- 실제 StyleGAN2 가중치로 교체 가능
"""

from __future__ import annotations

import os
import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
from typing import Optional

# --- 디바이스 설정 ---
if torch.backends.mps.is_available():
    device = torch.device("mps")
    print("Using Apple Silicon GPU (MPS)")
else:
    device = torch.device("cpu")
    print("Using CPU")


# --- dlib 선택적 임포트 ---
try:
    import dlib as _dlib
    _detector = _dlib.get_frontal_face_detector()
    _DLIB_OK = True
    print("✅ dlib 얼굴 검출기 로드 완료")
except Exception:
    _detector = None
    _DLIB_OK = False
    print("⚠️  dlib 미설치 — 중앙 크롭으로 대체")

_predictor = None
_LANDMARK_PATH = os.path.join(os.path.dirname(__file__), "shape_predictor_68_face_landmarks.dat")
if _DLIB_OK and os.path.exists(_LANDMARK_PATH):
    _predictor = _dlib.shape_predictor(_LANDMARK_PATH)
    print("✅ 68-point landmark predictor 로드 완료")


# --- StyleGAN2 추론 모델 ---
class SimpleStyleGANInference(nn.Module):
    """
    파이프라인 검증용 더미 모델 (좌우 반전).
    실제 사용 시 encoder → latent → generator 로직으로 교체하세요.
    """
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return torch.flip(x, dims=[3])


model = SimpleStyleGANInference().to(device).eval()


# --- 전처리 파이프라인 ---
_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
])


# --- 얼굴 정렬 및 크롭 ---
def align_and_crop_face(frame: np.ndarray) -> Optional[Image.Image]:
    """
    BGR numpy 배열에서 얼굴을 찾아 1024×1024 PIL 이미지로 반환.
    얼굴 미검출 시 None 반환.
    """
    if not _DLIB_OK or _detector is None:
        return _center_crop(frame)

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = _detector(gray)
    if len(faces) == 0:
        return None

    face = max(faces, key=lambda r: r.width() * r.height())
    x, y, w, h = face.left(), face.top(), face.width(), face.height()
    margin = int(w * 0.4)
    img_h, img_w = frame.shape[:2]

    x1 = max(0, x - margin)
    y1 = max(0, y - margin * 2)
    x2 = min(img_w, x + w + margin)
    y2 = min(img_h, y + h + margin)

    cropped = frame[y1:y2, x1:x2]
    return None if cropped.size == 0 else _to_pil(cropped)


def _center_crop(frame: np.ndarray) -> Image.Image:
    h, w = frame.shape[:2]
    size = min(h, w)
    y1, x1 = (h - size) // 2, (w - size) // 2
    return _to_pil(frame[y1:y1 + size, x1:x1 + size])


def _to_pil(bgr: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb).resize((1024, 1024), Image.Resampling.LANCZOS)


# --- 캐리커처 생성 ---
def process_caricature(pil_img: Image.Image) -> np.ndarray:
    """PIL 이미지 → 캐리커처 BGR numpy 배열."""
    tensor = _transform(pil_img).unsqueeze(0).to(device)
    with torch.no_grad():
        out = model(tensor)
    out = (out.squeeze(0).cpu() * 0.5 + 0.5).clamp(0, 1)
    return cv2.cvtColor(np.array(transforms.ToPILImage()(out)), cv2.COLOR_RGB2BGR)
