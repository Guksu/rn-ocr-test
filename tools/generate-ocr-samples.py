"""
성분표 합성 샘플 생성기 (1회용 검증 도구)

목적: 실사 사진으로는 분리할 수 없는 변수를 통제해서 측정한다.
  - 글자가 사진에서 몇 px 높이일 때 한글 인식이 무너지는가
    → 촬영 가이드("성분표를 프레임의 몇 %로 채워라")의 직접적 근거
  - 저대비 / 기울임 / 블러 / 압축이 각각 얼마나 깎는가

캔버스를 실제 사진 크기로 고정하고 글자 크기만 바꾼다.
그래야 "카메라를 얼마나 가까이 댔는가"와 1:1로 대응된다.
"""

import json
import pathlib
import random

import math

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "ocr-samples"
FONT_PATH = "/System/Library/Fonts/Supplemental/AppleGothic.ttf"

# 일반적인 폰 사진 비율. 4MP 상한 아래로 잡아 리사이즈 없이 원본 픽셀을 쓴다.
CANVAS = (2048, 1536)

INGREDIENTS = [
    "정제수", "부틸렌글라이콜", "글리세린", "1,2-헥산다이올", "나이아신아마이드",
    "판테놀", "소듐하이알루로네이트", "알란토인", "다이포타슘글리시리제이트",
    "카보머", "트로메타민", "에틸헥실글리세린", "다이소듐이디티에이",
    "토코페릴아세테이트", "센텔라아시아티카추출물", "마데카소사이드",
    "아시아티코사이드", "베타인", "알지닌", "하이드록시에틸셀룰로오스",
    "폴리글리세릴-10라우레이트", "카프릴릴글라이콜", "소듐시트레이트",
    "시트릭애씨드", "녹차추출물", "병풀추출물", "히알루론산", "세라마이드엔피",
    "판테닐에틸에터", "향료",
]

# 실제 라벨에는 성분 목록만 있지 않다. 사용법·주의사항·제조정보가 함께 인쇄되고
# OCR 은 그것까지 전부 읽어온다. 성분을 그 속에서 찾아내는 것이 실제 과제다.
BODY = "\n".join([
    "수분진정 토너 200mL",
    "사용방법: 세안 후 적당량을 화장솜에 덜어 피부결을 따라 부드럽게 닦아냅니다. "
    "아침 저녁 하루 두 번 사용을 권장합니다.",
    "전성분: " + ", ".join(INGREDIENTS),
    "주의사항: 1) 사용 중 붉은 반점, 부어오름, 가려움증 등의 이상이 있는 경우 사용을 "
    "중지하고 전문의와 상담하십시오. 2) 상처가 있는 부위에는 사용을 자제하십시오. "
    "3) 어린이의 손이 닿지 않는 곳에 보관하십시오. 4) 직사광선을 피해 서늘한 곳에 두십시오.",
    "제조업자: 길수코스메틱  책임판매업자: 길수코스메틱  제조국: 대한민국",
    "제조번호 및 사용기한: 용기 하단 별도표기",
])

random.seed(20260829)


def wrap(*, text, font, max_width, draw):
    """문단(\n)은 경계로 유지하고, 문단 안에서만 폭에 맞춰 접는다."""
    lines = []
    for paragraph in text.split("\n"):
        current = ""
        for token in paragraph.split(" "):
            candidate = f"{current} {token}".strip()
            if draw.textlength(candidate, font=font) <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = token
        if current:
            lines.append(current)
    return lines


def glyph_height(*, font):
    """실제로 렌더된 한글 한 글자의 픽셀 높이"""
    box = font.getbbox("한")
    return box[3] - box[1]


def cylinder_warp(*, image, k=0.93):
    """세로축 원통(병·튜브) 표면에 인쇄된 것처럼 가장자리를 압축한다.

    화면 x 는 표면 각도 θ 에 대해 x = R·sinθ 이므로, 역투영하면 asin 이 된다.
    가장자리로 갈수록 같은 화면 폭에 더 많은 글자가 눌려 들어간다 = 실제 곡면 라벨.
    """
    width, height = image.size
    strips = 72

    def source_x(dst_x):
        u = max(-1.0, min(1.0, (dst_x / width) * 2 - 1))
        return (math.asin(u * k) / math.asin(k) + 1) / 2 * width

    mesh = []
    for i in range(strips):
        dx0, dx1 = width * i / strips, width * (i + 1) / strips
        sx0, sx1 = source_x(dx0), source_x(dx1)
        mesh.append(((int(dx0), 0, int(dx1), height),
                     (sx0, 0, sx0, height, sx1, height, sx1, 0)))

    return image.transform((width, height), Image.MESH, mesh, Image.BICUBIC, fillcolor="white")


def apply_shade(*, image, amount, mode):
    """곡면 음영(가장자리가 어두움) 또는 한쪽 그림자."""
    width, height = image.size
    row = Image.new("L", (width, 1))
    for x in range(width):
        u = (x / width) * 2 - 1
        factor = 1.0 - amount * (u ** 2) if mode == "curve" else 1.0 - amount * ((u + 1) / 2)
        row.putpixel((x, 0), int(255 * max(0.05, factor)))
    mask = row.resize((width, height))
    return ImageChops.multiply(image, Image.merge("RGB", (mask, mask, mask)))


def add_glare(*, image, strength=0.55):
    """유광 포장의 반사 — 밝은 타원이 글자를 통째로 날린다."""
    width, height = image.size
    glare = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(glare)
    cx, cy = int(width * 0.55), int(height * 0.32)
    rx, ry = int(width * 0.26), int(height * 0.17)
    steps = 44
    for i in range(steps):
        t = i / steps
        value = int(255 * strength * (1 - t) ** 2)
        draw.ellipse(
            [cx - int(rx * (1 - t)), cy - int(ry * (1 - t)),
             cx + int(rx * (1 - t)), cy + int(ry * (1 - t))],
            fill=value,
        )
    glare = glare.filter(ImageFilter.GaussianBlur(width * 0.02))
    return ImageChops.screen(image, Image.merge("RGB", (glare, glare, glare)))


def render(
    *,
    font_size,
    contrast=1.0,
    rotate=0.0,
    blur=0.0,
    noise=0,
    warp=False,
    fill_frame=False,
    shade=None,
    glare=False,
    background=(252, 250, 246),
    canvas=CANVAS,
):
    """물리적으로 일어나는 순서대로 열화를 얹는다.

    인쇄 → 곡면 → 조명/반사 → 센서 노이즈 → 렌즈 블러 → 압축
    순서를 바꾸면 실제 사진과 다른 결과가 나온다.
    """
    image = Image.new("RGB", canvas, background)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(FONT_PATH, font_size)

    margin = int(canvas[0] * 0.06)
    # 한 줄에 약 34자. 글자가 작아지면 블록도 같이 작아진다 = 멀리서 찍은 사진.
    # fill_frame 이면 라벨이 프레임을 가로로 채운다 — 곡면 왜곡이 실제로 걸리는 상황.
    block_width = (
        canvas[0] - margin * 2
        if fill_frame
        else min(int(font_size * 34 * 0.62), canvas[0] - margin * 2)
    )
    lines = wrap(text=BODY, font=font, max_width=block_width, draw=draw)

    # 블록을 화면 가운데에 둔다. 실제로 라벨을 찍을 때 프레임 중앙에 맞추기 때문이고,
    # 구석에 몰아두면 곡면·반사 같은 화면 전체 효과가 텍스트에 제대로 걸리지 않는다.
    line_gap = int(font_size * 1.45)
    block_height = line_gap * len(lines)
    used_width = max((draw.textlength(line, font=font) for line in lines), default=0)
    x0 = (canvas[0] - used_width) / 2
    y = (canvas[1] - block_height) / 2

    for line in lines:
        draw.text((x0, y), line, font=font, fill=(28, 26, 24))
        y += line_gap

    if warp:
        image = cylinder_warp(image=image)
    if shade is not None:
        image = apply_shade(image=image, amount=shade[0], mode=shade[1])
    if glare:
        image = add_glare(image=image)

    if noise:
        pixels = image.load()
        for _ in range(noise):
            x, ny = random.randrange(canvas[0]), random.randrange(canvas[1])
            level = random.randrange(60, 235)
            pixels[x, ny] = (level, level, level)

    if contrast != 1.0:
        image = ImageEnhance.Contrast(image).enhance(contrast)
    if rotate:
        image = image.rotate(rotate, resample=Image.BICUBIC, fillcolor=background)
    if blur:
        image = image.filter(ImageFilter.GaussianBlur(blur))

    return image, glyph_height(font=font), len(lines)


# 1차 측정에서 임계점이 안 나왔다 = 조건이 너무 쉬웠다.
# 실제 사진에는 열화가 "동시에" 얹히므로 조합 샘플이 핵심이다.

# 모든 사진에 기본으로 깔리는 열화 (센서 노이즈 · 약한 손떨림 · JPEG)
BASE = {"blur": 1.0, "noise": 40_000, "contrast": 0.80}

SPECS = []

# A. 크기 스윕 — 이제 "보통 사진" 수준의 열화를 깔고 크기만 바꾼다.
for size in (9, 11, 13, 16, 20, 26):
    SPECS.append({
        "id": f"size-{size:02d}",
        "group": "크기 스윕",
        "condition": f"글자 {size}pt (기본 열화)",
        "quality": 78,
        "kwargs": {"font_size": size, **BASE},
    })

# B. 조건 스윕 — 20pt 고정. 1차보다 훨씬 가혹하게.
SPECS += [
    {"id": "cond-blur3", "group": "조건 스윕", "condition": "블러 3.0px", "quality": 88,
     "kwargs": {"font_size": 20, "blur": 3.0}},
    {"id": "cond-blur5", "group": "조건 스윕", "condition": "블러 5.0px", "quality": 88,
     "kwargs": {"font_size": 20, "blur": 5.0}},
    {"id": "cond-contrast15", "group": "조건 스윕", "condition": "저대비 0.15", "quality": 88,
     "kwargs": {"font_size": 20, "contrast": 0.15}},
    {"id": "cond-noise-hard", "group": "조건 스윕", "condition": "강한 노이즈", "quality": 88,
     "kwargs": {"font_size": 20, "noise": 300_000}},
    {"id": "cond-jpeg35", "group": "조건 스윕", "condition": "JPEG 품질 35", "quality": 35,
     "kwargs": {"font_size": 20}},
    {"id": "cond-curve", "group": "조건 스윕", "condition": "곡면(병) + 가장자리 음영", "quality": 88,
     "kwargs": {"font_size": 20, "warp": True, "fill_frame": True, "shade": (0.45, "curve")}},
    {"id": "cond-glare", "group": "조건 스윕", "condition": "유광 포장 반사", "quality": 88,
     "kwargs": {"font_size": 20, "glare": True}},
    {"id": "cond-shadow", "group": "조건 스윕", "condition": "한쪽 그림자", "quality": 88,
     "kwargs": {"font_size": 20, "shade": (0.62, "linear")}},
]

# C. 실전 복합 — 여러 열화가 동시에 얹힌 상태. 여기가 실제 매장 촬영에 가장 가깝다.
SPECS += [
    {"id": "real-bottle", "group": "실전 복합", "condition": "병 곡면 + 작은글씨(13pt) + 손떨림",
     "quality": 55,
     "kwargs": {"font_size": 13, "warp": True, "fill_frame": True, "shade": (0.42, "curve"),
                "blur": 1.5, "noise": 60_000, "contrast": 0.85}},
    {"id": "real-dimstore", "group": "실전 복합", "condition": "매장 저조도 + 작은글씨(11pt)",
     "quality": 50,
     "kwargs": {"font_size": 11, "contrast": 0.72, "noise": 180_000,
                "blur": 1.2, "shade": (0.30, "linear")}},
    {"id": "real-glossy", "group": "실전 복합", "condition": "유광 곡면 + 반사(16pt)",
     "quality": 60,
     "kwargs": {"font_size": 16, "warp": True, "fill_frame": True, "glare": True,
                "shade": (0.30, "curve"), "blur": 1.0, "noise": 50_000}},
    {"id": "real-worst", "group": "실전 복합", "condition": "최악 복합 (11pt·곡면·반사·저조도·흔들림)",
     "quality": 40,
     "kwargs": {"font_size": 11, "warp": True, "fill_frame": True, "glare": True, "shade": (0.38, "curve"),
                "contrast": 0.70, "blur": 2.0, "noise": 220_000}},
]

# D. 4MP 초과 — 리사이즈 대응 회귀 확인 (1차에서 통과했으므로 유지만 한다)
SPECS.append({
    "id": "oversize-12mp",
    "group": "상한 검증",
    "condition": "4032x3024 (12MP, 4MP 상한 초과)",
    "quality": 90,
    "kwargs": {"font_size": 60, "canvas": (4032, 3024), **BASE},
})


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.jpg"):
        old.unlink()

    manifest = []
    for spec in SPECS:
        image, char_px, line_count = render(**spec["kwargs"])
        filename = f"{spec['id']}.jpg"
        image.save(OUT_DIR / filename, "JPEG", quality=spec.get("quality", 90))

        manifest.append({
            "id": spec["id"],
            "file": filename,
            "group": spec["group"],
            "condition": spec["condition"],
            "charHeightPx": char_px,
            "width": image.width,
            "height": image.height,
            "lineCount": line_count,
            "expected": INGREDIENTS,
        })
        print(f"{spec['id']:<20} {image.width}x{image.height}  한글높이 {char_px:>3}px  {line_count}줄")

    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # 앱에서 쓸 TS 모듈을 함께 생성한다.
    # 이미지는 require() 로 정적 참조해야 Metro 가 번들에 포함시킨다.
    entries = []
    for item in manifest:
        entries.append(
            "  {\n"
            f"    id: {json.dumps(item['id'])},\n"
            f"    group: {json.dumps(item['group'], ensure_ascii=False)},\n"
            f"    condition: {json.dumps(item['condition'], ensure_ascii=False)},\n"
            f"    charHeightPx: {item['charHeightPx']},\n"
            f"    module: require('../../assets/ocr-samples/{item['file']}'),\n"
            "  },"
        )

    ts = (
        "/**\n"
        " * 자동 생성 파일 — 직접 수정하지 말 것.\n"
        " * 생성: python3 tools/generate-ocr-samples.py\n"
        " *\n"
        " * 합성 성분표 샘플. 글자 픽셀 높이와 촬영 조건을 통제해서\n"
        " * 실사로는 분리할 수 없는 변수를 측정한다.\n"
        " */\n\n"
        "export type OcrSample = {\n"
        "  id: string;\n"
        "  group: string;\n"
        "  condition: string;\n"
        "  /** 렌더된 한글 한 글자의 픽셀 높이 — 이 실험의 핵심 변수 */\n"
        "  charHeightPx: number;\n"
        "  module: number;\n"
        "};\n\n"
        "/** 모든 샘플이 공유하는 정답 성분 목록 */\n"
        f"export const SAMPLE_EXPECTED: string[] = {json.dumps(INGREDIENTS, ensure_ascii=False, indent=2)};\n\n"
        "export const OCR_SAMPLES: OcrSample[] = [\n"
        + "\n".join(entries)
        + "\n];\n"
    )
    (ROOT / "src" / "ocr-lab" / "samples.ts").write_text(ts, encoding="utf-8")

    print(f"\n총 {len(manifest)}장 · 정답 성분 {len(INGREDIENTS)}개")
    print("src/ocr-lab/samples.ts 생성됨")


if __name__ == "__main__":
    main()
