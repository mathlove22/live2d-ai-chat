# 🌱 초등 2학년 단짝 친구 즌다몬 (Zundamon AI Chat)

공식 Live2D **즌다몬(ずんだもん)** 인터랙티브 캐릭터와 Google **Gemini 3.5 Flash** & **Gemini Flash TTS**를 결합하여 초등학교 2학년 어린이 눈높이에 맞춘 다정하고 안전한 AI 단짝 친구 웹 애플리케이션입니다.

---

## ✨ 주요 특징 및 맞춤 기능

- 🧚 **초등 2학년 맞춤형 즌다몬 페르소나**:
  - 초등학교 2학년(8~9세) 어린이 눈높이에 꼭 맞춘 따뜻하고 친근한 반말 구어체 ("안녕!", "진짜루?", "우와 대박!", "헤헤", "신난다!").
  - 즌다몬 특유의 사랑스러운 말투("~인 거시다!")가 자연스럽게 섞여 귀여움 배가.
  - 100% 안전하고 긍정적인 대화: 어린이 정서에 유해하거나 어려운 어휘 배제, 자존감을 높여주는 따뜻한 칭찬과 공감.
- 🔤 **자연스러운 기초 영단어 지도**:
  - 일상 대화 속에서 초등학교 1~2학년 필수 기초 영단어(과일, 동물, 가족, 감정, 학교, 색깔 등)를 재미있게 지도.
  - 알파벳 철자와 한글 발음, 뜻, 재미있는 예시를 함께 제시:
    > "사과는 영어로 **Apple(애플)**이라고 해! 에이-피-피-엘-이! 아삭아삭 달콤한 애플~ 너도 소리 내서 '애플!' 하고 따라 해봐! [emotion:english]"
  - 신나는 영단어 퀴즈 모드 지원.
- 🎭 **Live2D 즌다몬 실시간 애니메이션**:
  - 화면 터치 인터랙션: 머리 쓰다듬기, 볼 만지기, 손잡기/사랑 고백에 맞춘 생동감 넘치는 반응.
  - 완두콩 귀 쫑긋거림 및 다양한 표정 변화(신남, 감동, 수줍음, 뾰로통, 영어 척척박사 등).
- 🔊 **Google Gemini 3.8 / Flash TTS & 실시간 립싱크**:
  - Vercel 서버리스 프록시 환경 변수를 통해 안전한 API Key 관리 지원.
  - OpenRouter Google Gemini Flash TTS (`gemini-3.8-flash-lite-tts` / `Leda`) 기반의 밝고 맑은 단일 음성.
  - Web Audio AnalyserNode 기반의 실시간 음성 주파수 분석을 통해 즌다몬 입 모양(ParamMouthOpenY) 동기화.
- 🍡 **어린이 맞춤 선물 & 우정 레벨 시스템**:
  - 달콤한 즌다모찌, 무지개 롤리팝 사탕, 반짝이 스티커북, 알록달록 색연필, 아기 곰인형, 비밀 보물상자 선물하기.
  - Lv.1 쑥스러운 짝꿍부터 Lv.5 영원한 비밀친구까지 우정 점수 성장 시스템.

---

## 🛠️ 기술 스택

- **Frontend**: HTML5, Vanilla JavaScript (ES Module), CSS3 (Mint/Zunda Theme)
- **Live2D Engine**: PixiJS v6, pixi-live2d-display (Cubism 4 Core SDK)
- **AI Models**:
  - LLM: `google/gemini-3.8-flash` (초등학생 눈높이 언어 및 영어 교육 프롬프트)
  - TTS: `google/gemini-3.8-flash-lite-tts` (Voice: `Leda`)
- **Serverless Backend**: Vercel Edge Functions (`/api/chat`, `/api/tts`, `/api/check`)
- **Build Tool**: Vite

---

## 🚀 실행 방법

```bash
# 로컬 개발 서버 실행
npm run dev

# 브라우저에서 접속
# http://localhost:5173
```

---

## 📄 라이선스 및 리소스 출처

- 즌다몬 Live2D 모델은 [Live2D Cubism 공식 샘플 모델 (東北ずん子・ずんだもんプロジェクト)](https://www.live2d.com/ko/learn/sample/zundamon/)을 기반으로 제작되었습니다.
- 캐릭터 저작권은 SSS LLC. (東北ずん子・ずんだもんプロジェクト)에 있습니다.
