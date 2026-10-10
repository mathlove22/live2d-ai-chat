/**
 * Live2D Controller supporting multiple characters (Momose Hiyori & Chitose)
 * Utilizes PixiJS v6 + pixi-live2d-display (Cubism 4 runtime)
 */

export class Live2DManager {
  constructor({ canvasId, onHit, onEmotionChange }) {
    this.canvas = document.getElementById(canvasId);
    this.onHit = onHit || (() => {});
    this.onEmotionChange = onEmotionChange || (() => {});
    
    this.app = null;
    this.model = null;
    this.activeCharId = 'hiyori';
    this.isLoaded = false;
    this.isSpeaking = false;
    this.lipSyncValue = 0;
    this.currentEmotion = 'neutral';
    this.currentMotion = 'Idle';

    // Parameter target values for smooth manual blending
    this.paramOverrides = {
      ParamCheek: 0,
      ParamEyeLSmile: 0,
      ParamEyeRSmile: 0,
      ParamMouthForm: 0.1
    };

    // Emotion definitions mapping per character
    this.charEmotionConfigs = {
      hiyori: {
        happy: { expression: 'happy', motion: 'Tap', motionIndex: 1, badge: '😊 행복함', cheek: 0.6, description: '활짝 웃으며 고개를 끄덕인다' },
        love: { expression: 'love', motion: 'Tap@Body', motionIndex: 0, badge: '🥰 설렘가득', cheek: 0.95, description: '가슴에 손을 얹고 다정한 눈빛으로 바라본다' },
        shy: { expression: 'shy', motion: 'FlickDown', motionIndex: 0, badge: '😳 부끄러움', cheek: 1.0, description: '얼굴을 붉히며 수줍게 시선을 내린다' },
        surprised: { expression: 'surprised', motion: 'Flick', motionIndex: 0, badge: '😮 깜짝!', cheek: 0.2, description: '눈을 동그랗게 뜨고 깜짝 놀란다' },
        pout: { expression: 'pout', motion: 'Flick@Body', motionIndex: 0, badge: '🥺 삐짐/토라짐', cheek: 0.5, description: '볼을 부풀리고 고개를 살짝 돌려 뾰로통해한다' },
        sad: { expression: 'sad', motion: 'FlickDown', motionIndex: 0, badge: '😢 시무룩', cheek: 0.1, description: '풀이 죽어 시무룩한 표정을 짓는다' },
        thinking: { expression: 'thinking', motion: 'Idle', motionIndex: 2, badge: '🤔 고민중', cheek: 0.2, description: '고개를 갸우뚱하며 골똘히 생각에 잠긴다' },
        wink: { expression: 'wink', motion: 'FlickUp', motionIndex: 0, badge: '😉 장난/윙크', cheek: 0.7, description: '장난기 가득한 미소로 윙크를 보낸다' },
        neutral: { expression: 'neutral', motion: 'Idle', motionIndex: 0, badge: '🌸 편안함', cheek: 0.0, description: '다정하고 편안한 미소로 바라본다' }
      },
      chitose: {
        happy: { expression: 'happy', motion: 'Tap', motionIndex: 0, badge: '😊 다정함', cheek: 0.4, description: '부드럽게 미소 지으며 바라본다' },
        love: { expression: 'love', motion: 'Tap', motionIndex: 1, badge: '🥰 심쿵/설렘', cheek: 0.9, description: '멋진 포즈와 함께 다정한 눈빛을 보낸다' },
        shy: { expression: 'shy', motion: 'Idle', motionIndex: 0, badge: '😳 쑥스러움', cheek: 0.85, description: '얼굴을 붉히며 쑥스러운 듯 헛기침한다' },
        surprised: { expression: 'surprised', motion: 'Flick', motionIndex: 0, badge: '😮 깜짝!', cheek: 0.1, description: '놀라 손을 살짝 흔들며 반응한다' },
        pout: { expression: 'pout', motion: 'Idle', motionIndex: 0, badge: '😤 새침/질투', cheek: 0.3, description: '살짝 굳은 표정으로 쿨한 척 질투한다' },
        sad: { expression: 'sad', motion: 'Idle', motionIndex: 0, badge: '🥺 속상함', cheek: 0.1, description: '안타까운 표정으로 시선을 내린다' },
        thinking: { expression: 'thinking', motion: 'Idle', motionIndex: 0, badge: '🤔 생각중', cheek: 0.0, description: '팔짱을 끼고 차분히 고민한다' },
        wink: { expression: 'wink', motion: 'Tap', motionIndex: 0, badge: '😉 장난기', cheek: 0.5, description: '자신감 넘치는 눈빛으로 싱긋 웃는다' },
        neutral: { expression: 'neutral', motion: 'Idle', motionIndex: 0, badge: '📘 차분함', cheek: 0.0, description: '든든하고 다정한 눈빛으로 쳐다본다' }
      }
    };
  }

  async init(initialChar = 'hiyori') {
    if (!this.canvas) {
      console.error('Live2D Canvas not found');
      return;
    }

    if (!window.PIXI || !window.PIXI.live2d || !window.PIXI.live2d.Live2DModel) {
      await this.waitForDependencies();
    }

    try {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const width = Math.max(rect.width, 320);
      const height = Math.max(rect.height, 480);

      this.app = new window.PIXI.Application({
        view: this.canvas,
        width: width,
        height: height,
        transparent: true,
        autoDensity: true,
        antialias: true,
        resolution: window.devicePixelRatio || 1
      });

      this.setupUpdateLoop();
      window.addEventListener('resize', () => this.onResize());

      await this.loadModel(initialChar);

    } catch (err) {
      console.error('Failed to initialize Live2D application:', err);
      throw err;
    }
  }

  async loadModel(charId = 'hiyori') {
    this.isLoaded = false;
    this.activeCharId = charId;

    if (this.model) {
      this.app.stage.removeChild(this.model);
      this.model.destroy();
      this.model = null;
    }

    const modelPath = charId === 'chitose'
      ? './live2d/chitose/chitose.model3.json'
      : './live2d/hiyori/hiyori_pro_t11.model3.json';

    console.log(`Loading Live2D model for [${charId}] from ${modelPath}...`);

    this.model = await window.PIXI.live2d.Live2DModel.from(modelPath, {
      autoInteract: true
    });

    this.app.stage.addChild(this.model);

    this.setupModelPosition();
    this.setupInteractivity();

    this.isLoaded = true;
    console.log(`Model [${charId}] loaded successfully!`);

    await this.setEmotion('happy');
  }

  async switchCharacter(charId) {
    if (this.activeCharId === charId && this.model) return;
    await this.loadModel(charId);
  }

  waitForDependencies(maxWait = 6000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (window.PIXI && window.PIXI.live2d && window.PIXI.live2d.Live2DModel) {
          clearInterval(interval);
          resolve();
        } else if (Date.now() - start > maxWait) {
          clearInterval(interval);
          reject(new Error('Live2D library load timeout'));
        }
      }, 50);
    });
  }

  setupModelPosition() {
    if (!this.model || !this.app) return;

    this.model.anchor.set(0.5, 0.5);

    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    const rawWidth = this.model.width || 800;
    const rawHeight = this.model.height || 1000;

    const isChitose = this.activeCharId === 'chitose';
    const heightFactor = isChitose ? 1.4 : 1.35;
    const scaleY = (screenH * heightFactor) / rawHeight;
    const scaleX = (screenW * 1.1) / rawWidth;
    const finalScale = Math.min(scaleY, Math.max(scaleX, 0.22));

    this.model.scale.set(finalScale);

    this.model.x = screenW / 2;
    this.model.y = screenH * (isChitose ? 0.68 : 0.65);
  }

  onResize() {
    if (!this.app || !this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const width = Math.max(rect.width, 300);
    const height = Math.max(rect.height, 400);

    this.app.renderer.resize(width, height);
    this.setupModelPosition();
  }

  setupInteractivity() {
    if (!this.model) return;

    this.model.interactive = true;

    this.model.on('pointerdown', (e) => {
      const localPos = e.data.getLocalPosition(this.model);
      const normalizedY = localPos.y / (this.model.height || 800);

      let touchArea = 'body';
      if (normalizedY < -0.2) {
        touchArea = 'head';
      } else if (normalizedY >= -0.2 && normalizedY < 0.05) {
        touchArea = 'cheek';
      } else {
        touchArea = 'chest';
      }

      this.handleTouchInteraction(touchArea);
    });
  }

  handleTouchInteraction(area) {
    const isChitose = this.activeCharId === 'chitose';

    if (area === 'head') {
      this.setEmotion('happy');
      if (isChitose) {
        this.playMotion('Tap', 0);
        this.onHit({
          area: 'head',
          emotion: 'happy',
          text: '머리 쓰다듬어주는 거야? ...나 애 취급하는 건 아니지? 그래도 네 손길은 좋아.'
        });
      } else {
        this.playMotion('Tap', 0);
        this.onHit({
          area: 'head',
          emotion: 'happy',
          text: '머리 쓰다듬어주니까 너무 기분 좋다... 헤헤 💕'
        });
      }
    } else if (area === 'cheek') {
      const isShy = Math.random() > 0.4;
      if (isShy) {
        this.setEmotion('shy');
        if (isChitose) {
          this.playMotion('Idle', 0);
          this.onHit({
            area: 'cheek',
            emotion: 'shy',
            text: '볼은 왜 꼬집어? ...간지러우니까 그만해. 얼굴 빨개지잖아.'
          });
        } else {
          this.playMotion('FlickDown', 0);
          this.onHit({
            area: 'cheek',
            emotion: 'shy',
            text: '앗... 볼 만지면 간지럽고 부끄럽단 말이야~ 😳'
          });
        }
      } else {
        this.setEmotion('pout');
        if (isChitose) {
          this.playMotion('Idle', 0);
          this.onHit({
            area: 'cheek',
            emotion: 'pout',
            text: '장난 그만 쳐. 자꾸 그러면 나도 가만 안 있는다?'
          });
        } else {
          this.playMotion('Flick@Body', 0);
          this.onHit({
            area: 'cheek',
            emotion: 'pout',
            text: '볼 꼬집지 마아~ 볼 늘어난단 말야! 🥺'
          });
        }
      }
    } else {
      const isLove = Math.random() > 0.5;
      if (isLove) {
        this.setEmotion('love');
        if (isChitose) {
          this.playMotion('Tap', 1);
          this.onHit({
            area: 'body',
            emotion: 'love',
            text: '갑자기 그렇게 훅 들어오면... 심장 소리 다 들리잖아 바보야.'
          });
        } else {
          this.playMotion('Tap@Body', 0);
          this.onHit({
            area: 'body',
            emotion: 'love',
            text: '자기야 손 따뜻하다... 심장이 쿵쾅거려 🥰'
          });
        }
      } else {
        this.setEmotion('surprised');
        if (isChitose) {
          this.playMotion('Flick', 0);
          this.onHit({
            area: 'body',
            emotion: 'surprised',
            text: '깜짝이야! 너 은근히 대담하네...?'
          });
        } else {
          this.playMotion('Flick', 0);
          this.onHit({
            area: 'body',
            emotion: 'surprised',
            text: '깜짝이야! 어딜 불쑥 만지는 거야~? 😮'
          });
        }
      }
    }
  }

  setupUpdateLoop() {
    if (!this.app) return;

    this.app.ticker.add((delta) => {
      if (!this.model || !this.model.internalModel) return;

      const coreModel = this.model.internalModel.coreModel;
      if (!coreModel) return;

      // Real-time Audio Driven Lip-Sync or fallback oscillation (Supports both Cubism 2/3 naming)
      if (this.lipSyncValue > 0) {
        try { coreModel.setParameterValueById('ParamMouthOpenY', this.lipSyncValue); } catch (_) {}
        try { coreModel.setParameterValueById('PARAM_MOUTH_OPEN_Y', this.lipSyncValue); } catch (_) {}
      } else if (this.isSpeaking) {
        const time = Date.now() / 85;
        const mouthOpen = (Math.sin(time) * 0.5 + 0.5) * (0.35 + Math.random() * 0.55);
        try { coreModel.setParameterValueById('ParamMouthOpenY', mouthOpen); } catch (_) {}
        try { coreModel.setParameterValueById('PARAM_MOUTH_OPEN_Y', mouthOpen); } catch (_) {}
      }

      // Smooth cheek blush override (Supports both ParamCheek and PARAM_CHEEK)
      if (this.paramOverrides.ParamCheek > 0) {
        try {
          const currentCheek = coreModel.getParameterValueById('ParamCheek') || coreModel.getParameterValueById('PARAM_CHEEK') || 0;
          const target = this.paramOverrides.ParamCheek;
          const lerped = currentCheek + (target - currentCheek) * 0.1;
          try { coreModel.setParameterValueById('ParamCheek', lerped); } catch (_) {}
          try { coreModel.setParameterValueById('PARAM_CHEEK', lerped); } catch (_) {}
        } catch (_) {}
      }
    });
  }

  /**
   * Set emotion: triggers expression, corresponding motion, and updates UI state
   */
  async setEmotion(emotionKey, customMotion = null) {
    if (!this.isLoaded || !this.model) return;

    const normalized = (emotionKey || 'neutral').toLowerCase();
    const charMap = this.charEmotionConfigs[this.activeCharId] || this.charEmotionConfigs.hiyori;
    const config = charMap[normalized] || charMap.neutral;
    this.currentEmotion = normalized;

    try {
      if (config.expression && typeof this.model.expression === 'function') {
        await this.model.expression(config.expression);
      }

      this.paramOverrides.ParamCheek = config.cheek;

      const motionToPlay = customMotion || config.motion;
      const motionIndex = config.motionIndex ?? 0;
      this.playMotion(motionToPlay, motionIndex);

      this.onEmotionChange({
        emotion: normalized,
        badge: config.badge,
        description: config.description
      });

    } catch (err) {
      console.warn('Error applying emotion:', err);
    }
  }

  playMotion(group, index = 0, priority = 3) {
    if (!this.isLoaded || !this.model) return;

    try {
      this.currentMotion = group;
      if (typeof this.model.motion === 'function') {
        this.model.motion(group, index, priority);
      }
    } catch (err) {
      console.warn(`Motion [${group}] failed:`, err);
    }
  }

  setLipSyncValue(value) {
    this.lipSyncValue = Math.max(0, Math.min(1.0, value));
    if (this.model?.internalModel?.coreModel) {
      const core = this.model.internalModel.coreModel;
      try { core.setParameterValueById('ParamMouthOpenY', this.lipSyncValue); } catch (_) {}
      try { core.setParameterValueById('PARAM_MOUTH_OPEN_Y', this.lipSyncValue); } catch (_) {}
    }
  }

  setSpeaking(speaking) {
    this.isSpeaking = speaking;
    if (!speaking) {
      this.lipSyncValue = 0;
      if (this.model && this.model.internalModel?.coreModel) {
        const core = this.model.internalModel.coreModel;
        try { core.setParameterValueById('ParamMouthOpenY', 0); } catch (_) {}
        try { core.setParameterValueById('PARAM_MOUTH_OPEN_Y', 0); } catch (_) {}
      }
    }
  }

  setZoom(mode = 'normal') {
    if (!this.model || !this.app) return;
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;
    const rawHeight = this.model.height || 1000;
    const heightFactor = this.activeCharId === 'chitose' ? 1.4 : 1.35;
    const baseScale = (screenH * heightFactor) / rawHeight;

    if (mode === 'closeup') {
      this.model.scale.set(baseScale * 1.45);
      this.model.y = screenH * 0.82;
    } else {
      this.setupModelPosition();
    }
  }
}
