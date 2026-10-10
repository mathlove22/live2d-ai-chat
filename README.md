# 🌸 Sweet Live2D AI Chat (히요리 & 치토세 AI 채팅 웹앱)

Live2D 인터랙티브 캐릭터와 Google **Gemini 3.5 Flash-Lite** & **Gemini 3.8 Flash-Lite TTS**를 결합한 가상 연인 대화 웹 애플리케이션입니다.

---

## ✨ 주요 기능

- 🎭 **Live2D 다중 캐릭터 지원**:
  - **모모세 히요리 (Momose Hiyori)**: 밝고 명랑한 10대 여고생 소꿉친구 여친
  - **치토세 (Chitose)**: 츤데레 매력의 19세 다정하고 든든한 소꿉친구 남친
- 💬 **자연스러운 구어체 AI 대화**:
  - Google Gemini 3.5 Flash-Lite 기반의 맞춤형 페르소나 시스템 프롬프트 탑재
  - API 키가 없어도 바로 즐길 수 있는 고품질 로컬 시뮬레이션 모드 지원
- 🔊 **차세대 AI 음성 (TTS) & 실시간 립싱크**:
  - Google Gemini 3.8 Flash-Lite TTS 연동 (여성: Leda, 남성: Puck)
  - Web Audio AnalyserNode 기반의 실시간 음성 주파수 분석을 통한 입 모양 동기화
- 💖 **호감도 및 인터랙티브 시스템**:
  - 실시간 스킨십 (머리 쓰다듬기, 볼 꼬집기, 사랑 고백) 및 감정 리액션
  - 5종류의 선물하기 (바닐라 라떼, 조각 케이크, 꽃다발, 곰인형, 커플링) 및 캐릭터별 특별 대사
  - 캔버스 하트 파티클 이펙트
- 📱 **반응형 UI & 뷰 모드 전환**:
  - 데스크톱/태블릿/모바일 지원
  - 캐릭터 뷰 / 메신저 뷰 / 분할 뷰 모드 지원

---

## 🛠️ 기술 스택

- **Frontend**: HTML5, Vanilla JavaScript (ES Module), CSS3 (Modern Glassmorphism Design)
- **Live2D Runtime**: PixiJS v6, pixi-live2d-display (Cubism 4 Core SDK)
- **Build Tool**: Vite
- **AI Models**:
  - LLM: `gemini-3.5-flash-lite` (또는 사용자 정의 Gemini 모델)
  - TTS: `gemini-3.8-flash-lite-tts` (음성 스타일 프롬프트 제어)

---

## 🚀 로컬 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 로컬 개발 서버 실행
npm run dev

# 3. 브라우저에서 접속
# http://localhost:5173
```

---

## 🔑 Gemini API 설정

1. [Google AI Studio](https://aistudio.google.com/)에서 무료 Gemini API Key를 발급받습니다.
2. 웹앱 우측 상단 또는 좌측 하단의 **⚙️ API 설정** 아이콘을 클릭합니다.
3. 발급받은 API 키를 입력하고 **저장하기**를 누르면 끝! (브라우저 로컬 저장소에만 안전하게 보관됩니다)

---

## 📄 라이선스 및 리소스 출처

- 본 프로젝트의 Live2D 모델 데이터는 [Live2D Cubism 공식 샘플 모델](https://www.live2d.com/ko/learn/sample/)을 기반으로 제작되었습니다.
- 모델 저작권은 (주)Live2D에 있습니다.
