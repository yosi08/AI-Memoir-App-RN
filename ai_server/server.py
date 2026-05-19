"""
AI Memoir — Caricature API Server
실행: python server.py
기본 포트: 8000
"""

import io
import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

from caricature_model import align_and_crop_face, process_caricature

app = FastAPI(title="AI Memoir Caricature API")

# RN 앱(web / 기기) 에서 호출할 수 있도록 CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "message": "Caricature server is running"}


@app.post("/caricature")
async def caricature(file: UploadFile = File(...)):
    """
    이미지 파일을 받아 캐리커처 JPEG를 반환합니다.

    - 얼굴 미검출 → 422 에러
    - 성공 → image/jpeg 스트리밍 응답
    """
    # 업로드 이미지 읽기
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="이미지 파일을 읽을 수 없습니다.")

    # 얼굴 정렬 및 크롭
    pil_face = align_and_crop_face(frame)
    if pil_face is None:
        raise HTTPException(status_code=422, detail="얼굴을 찾을 수 없습니다. 정면을 바라봐 주세요.")

    # 캐리커처 생성
    result_bgr = process_caricature(pil_face)

    # JPEG 인코딩 후 스트리밍 반환
    _, buffer = cv2.imencode(".jpg", result_bgr, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return StreamingResponse(
        io.BytesIO(buffer.tobytes()),
        media_type="image/jpeg",
        headers={"Content-Disposition": "inline; filename=caricature.jpg"},
    )


if __name__ == "__main__":
    import uvicorn
    print("🚀 Caricature API Server starting at http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
