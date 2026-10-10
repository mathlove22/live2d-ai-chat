import { CHARACTERS, EMOTIONS, QUICK_REPLIES, getSimulatedReply } from './data/characters.js';
import { GIFTS, getIntimacyLevel } from './data/gifts.js';
import { storage, DEFAULT_MODEL, DEFAULT_TTS_ENGINE, DEFAULT_TTS_VOICE } from './services/storage.js';
import { callGeminiStream, testConnection, parseEmotionAndText } from './services/gemini.js';
import { soundController } from './services/audio.js';
import { ParticleManager } from './components/particle.js';
import { Live2DManager } from './components/live2d.js';

class SweetheartApp {
  constructor() {
    this.characters = CHARACTERS;
    this.gifts = GIFTS;
    this.activeChar = this.characters[0]; // Momose Hiyori
    this.messages = [];
    this.isStreaming = false;
    this.particleManager = null;
    this.live2d = null;
    this.isCloseup = false;

    this.initElements();
    this.initParticles();
    this.initApp();
    this.initLive2D();
    this.bindEvents();
  }

  initElements() {
    // Stage elements
    this.live2dStage = document.getElementById('live2d-stage');
    this.live2dCanvas = document.getElementById('live2d-canvas');
    this.live2dLoading = document.getElementById('live2d-loading');
    this.live2dEmotionPill = document.getElementById('live2d-emotion-pill');
    this.live2dActionBubble = document.getElementById('live2d-action-bubble');
    this.btnZoomToggle = document.getElementById('btn-zoom-toggle');
    this.sideIntimacyBadge = document.getElementById('side-intimacy-badge');
    this.sideIntimacyFill = document.getElementById('side-intimacy-fill');
    this.sideIntimacyTitle = document.getElementById('side-intimacy-title');
    this.sideIntimacyPts = document.getElementById('side-intimacy-pts');
    this.btnSideGift = document.getElementById('btn-side-gift');
    this.btnSideApiSettings = document.getElementById('btn-side-api-settings');
    this.btnSideClearChat = document.getElementById('btn-side-clear-chat');

    // Header elements
    this.headerAvatarImg = document.getElementById('header-avatar-img');
    this.headerEmotionBadge = document.getElementById('header-emotion-badge');
    this.headerCharName = document.getElementById('header-char-name');
    this.headerCharStatus = document.getElementById('header-char-status');
    this.btnHeaderTts = document.getElementById('btn-header-tts');
    this.btnHeaderTheme = document.getElementById('btn-header-theme');
    this.btnHeaderSettings = document.getElementById('btn-header-settings');
    this.btnHeaderGift = document.getElementById('btn-header-gift');
    this.apiWarningBanner = document.getElementById('api-warning-banner');
    this.btnBannerSetup = document.getElementById('btn-banner-setup');

    // Chat elements
    this.messagesContainer = document.getElementById('chat-messages-container');
    this.quickRepliesContainer = document.getElementById('quick-replies-container');
    this.chatTextarea = document.getElementById('chat-textarea');
    this.btnSendMessage = document.getElementById('btn-send-message');
    this.btnInputGift = document.getElementById('btn-input-gift');
    this.btnInputHeart = document.getElementById('btn-input-heart');

    // Modals
    this.modalApiSettings = document.getElementById('modal-api-settings');
    this.modalGiftShop = document.getElementById('modal-gift-shop');
    this.modalCharSelect = document.getElementById('modal-char-select');
    this.charCardsContainer = document.getElementById('char-cards-container');

    // Stage character profile & switcher buttons
    this.stageAvatarMini = document.getElementById('stage-avatar-mini');
    this.stageCharName = document.getElementById('stage-char-name');
    this.btnStageCharSelect = document.getElementById('btn-stage-char-select');
    this.btnSideCharSelect = document.getElementById('btn-side-char-select');
    this.btnHeaderChars = document.getElementById('btn-header-chars');
    this.btnHeaderProfile = document.getElementById('btn-header-profile');

    // API settings elements
    this.inputApiKey = document.getElementById('input-api-key');
    this.selectGeminiModel = document.getElementById('select-gemini-model');
    this.groupCustomModel = document.getElementById('group-custom-model');
    this.inputCustomModel = document.getElementById('input-custom-model');
    this.selectTtsEngine = document.getElementById('select-tts-engine');
    this.groupTtsVoice = document.getElementById('group-tts-voice');
    this.selectTtsVoice = document.getElementById('select-tts-voice');
    this.apiTestStatusBox = document.getElementById('api-test-status-box');
    this.btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');
    this.btnTestApi = document.getElementById('btn-test-api');
    this.btnSaveApi = document.getElementById('btn-save-api');
  }

  initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
      this.particleManager = new ParticleManager(canvas);
    }
  }

  async initLive2D() {
    try {
      this.live2d = new Live2DManager({
        canvasId: 'live2d-canvas',
        onHit: (hitInfo) => this.handleLive2DHit(hitInfo),
        onEmotionChange: (info) => this.updateEmotionUI(info.emotion, info.badge, info.description)
      });

      await this.live2d.init(this.activeChar.id);

      if (this.live2dLoading) {
        this.live2dLoading.style.opacity = '0';
        setTimeout(() => {
          if (this.live2dLoading) this.live2dLoading.style.display = 'none';
        }, 400);
      }
    } catch (err) {
      console.error('Live2D init failed:', err);
      if (this.live2dLoading) {
        this.live2dLoading.innerHTML = `<span>⚠️ 캐릭터 로드 중 오류가 발생했습니다.<br/><small>${err.message}</small></span>`;
      }
    }
  }

  initApp() {
    // Restore active character preference
    const savedCharId = storage.getActiveCharacterId();
    this.activeChar = this.characters.find(c => c.id === savedCharId) || this.characters[0];

    // Load settings & theme
    const settings = storage.getSettings();
    document.body.setAttribute('data-theme', settings.theme || this.activeChar.bgTheme || 'blossom');
    soundController.soundEnabled = settings.sound !== false;
    soundController.ttsEnabled = settings.tts !== false;
    this.updateTtsButtonState();

    // Check API Key
    this.checkApiKeyStatus();

    // Load active character chats & intimacy
    this.loadCharacterData();

    // Render Character Grid in Modal
    this.renderCharacterGrid();

    // Render Gift Grid in Modal
    this.renderGiftGrid();

    // Populate API Settings inputs
    this.populateApiInputs();
  }

  checkApiKeyStatus() {
    const apiKey = storage.getApiKey();
    if (apiKey) {
      this.apiWarningBanner.style.display = 'none';
    } else {
      this.apiWarningBanner.style.display = 'flex';
    }
  }

  loadCharacterData() {
    const shortName = this.activeChar.name.split(' ')[0];

    // Header UI
    this.headerAvatarImg.src = this.activeChar.avatar;
    this.headerCharName.textContent = shortName;
    this.headerCharStatus.textContent = this.activeChar.statusMessage;
    this.chatTextarea.placeholder = `${shortName}에게 다정하게 말을 걸어보세요...`;

    // Stage Profile Info
    if (this.stageAvatarMini) {
      this.stageAvatarMini.src = this.activeChar.avatar;
    }
    if (this.stageCharName) {
      const icon = this.activeChar.gender === 'female' ? '🌸' : '📘';
      this.stageCharName.innerHTML = `${this.activeChar.name} <span>${icon}</span>`;
    }

    // Load chat messages
    this.messages = storage.getChats(this.activeChar.id);
    if (this.messages.length === 0) {
      // First greeting
      this.messages = [
        {
          id: 'msg_' + Date.now(),
          role: 'model',
          text: this.activeChar.initialGreeting,
          emotion: this.activeChar.initialEmotion || 'happy',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
      storage.saveChats(this.activeChar.id, this.messages);
    }

    this.renderMessages();
    this.updateIntimacyUI();
    this.renderQuickReplies();
  }

  renderMessages() {
    this.messagesContainer.innerHTML = '';
    for (const msg of this.messages) {
      this.appendMessageNode(msg);
    }
    this.scrollToBottom();
  }

  appendMessageNode(msg) {
    const isUser = msg.role === 'user';
    const isGift = msg.isGift === true;

    const row = document.createElement('div');
    row.className = `message-row ${isUser ? 'user-row' : 'bot-row'}`;
    row.id = `msg-${msg.id}`;

    if (!isUser) {
      // Bot Avatar
      const avatarWrap = document.createElement('div');
      avatarWrap.className = 'msg-avatar-wrap';
      const img = document.createElement('img');
      img.src = this.activeChar.avatar;
      img.alt = this.activeChar.name;
      img.className = 'msg-avatar';
      avatarWrap.appendChild(img);
      row.appendChild(avatarWrap);
    }

    const contentWrap = document.createElement('div');
    contentWrap.className = 'msg-content-wrap';

    if (!isUser) {
      const nameTag = document.createElement('div');
      nameTag.className = 'msg-author-name';
      nameTag.textContent = this.activeChar.name.split(' ')[0];

      if (msg.emotion && EMOTIONS[msg.emotion]) {
        const emoTag = document.createElement('span');
        emoTag.className = 'msg-emotion-pill';
        emoTag.textContent = `${EMOTIONS[msg.emotion].emoji} ${EMOTIONS[msg.emotion].label}`;
        nameTag.appendChild(emoTag);
      }

      contentWrap.appendChild(nameTag);
    }

    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${isUser ? 'user-bubble' : 'bot-bubble'} ${isGift ? 'gift-bubble' : ''}`;
    bubble.innerHTML = this.formatMessageText(msg.text);

    contentWrap.appendChild(bubble);

    // Meta footer: time and TTS repeat button
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    const timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    timeSpan.textContent = msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    meta.appendChild(timeSpan);

    if (!isUser && !isGift) {
      const btnSpeak = document.createElement('button');
      btnSpeak.className = 'btn-msg-speak';
      btnSpeak.title = '음성 다시 듣기 (Gemini TTS)';
      btnSpeak.innerHTML = '🔊';
      btnSpeak.onclick = () => {
        this.speakCharacter(msg.text, msg.emotion || 'happy');
      };
      meta.appendChild(btnSpeak);
    }

    contentWrap.appendChild(meta);
    row.appendChild(contentWrap);

    this.messagesContainer.appendChild(row);
  }

  formatMessageText(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  updateIntimacyUI() {
    const affection = storage.getAffection(this.activeChar.id);
    const info = getIntimacyLevel(affection);

    this.sideIntimacyBadge.textContent = info.badge;
    this.sideIntimacyTitle.textContent = info.title;

    let nextThreshold = 100;
    if (affection < 30) nextThreshold = 30;
    else if (affection < 80) nextThreshold = 80;
    else if (affection < 160) nextThreshold = 160;
    else if (affection < 300) nextThreshold = 300;
    else nextThreshold = 500;

    const percent = Math.min(100, Math.round((affection / nextThreshold) * 100));
    this.sideIntimacyFill.style.width = `${percent}%`;
    this.sideIntimacyPts.textContent = `${affection} / ${nextThreshold} pt`;
  }

  renderQuickReplies() {
    this.quickRepliesContainer.innerHTML = '';
    const replies = QUICK_REPLIES[this.activeChar.id] || QUICK_REPLIES.hiyori || [];
    replies.forEach((text) => {
      const chip = document.createElement('button');
      chip.className = 'quick-reply-chip';
      chip.textContent = text;
      chip.onclick = () => {
        this.chatTextarea.value = text;
        this.sendMessage();
      };
      this.quickRepliesContainer.appendChild(chip);
    });
  }

  renderCharacterGrid() {
    if (!this.charCardsContainer) return;
    this.charCardsContainer.innerHTML = '';

    this.characters.forEach((char) => {
      const isSelected = char.id === this.activeChar.id;
      const card = document.createElement('div');
      card.className = `char-card-item ${isSelected ? 'selected' : ''}`;
      card.setAttribute('data-char-id', char.id);
      card.innerHTML = `
        <div class="char-selected-check">✓</div>
        <img src="${char.avatar}" alt="${char.name}" class="char-card-avatar" />
        <div class="char-card-name">${char.name}</div>
        <div class="char-card-rel">${char.relation}</div>
        <div class="char-card-desc">${char.description}</div>
        <button class="btn-send-gift" style="margin-top: 6px; width: 100%; pointer-events: none;">
          ${isSelected ? '현재 대화 중 ✨' : '이 캐릭터로 변경하기'}
        </button>
      `;

      card.onclick = () => {
        if (this.activeChar.id !== char.id) {
          this.switchCharacter(char.id);
        } else {
          this.closeModal(this.modalCharSelect);
        }
      };

      this.charCardsContainer.appendChild(card);
    });
  }

  async switchCharacter(charId) {
    const target = this.characters.find(c => c.id === charId);
    if (!target) return;

    this.activeChar = target;
    storage.setActiveCharacterId(charId);

    // Show loading indicator
    if (this.live2dLoading) {
      this.live2dLoading.style.display = 'flex';
      this.live2dLoading.style.opacity = '1';
      this.live2dLoading.innerHTML = `
        <div class="live2d-loading-spinner"></div>
        <span>${target.gender === 'female' ? '🌸' : '📘'} ${target.name.split(' ')[0]} 불러오는 중...</span>
      `;
    }

    this.closeModal(this.modalCharSelect);
    this.renderCharacterGrid();

    // Switch Live2D model
    if (this.live2d) {
      try {
        await this.live2d.switchCharacter(charId);
      } catch (err) {
        console.error('Failed to switch Live2D model:', err);
      }
    }

    if (this.live2dLoading) {
      this.live2dLoading.style.opacity = '0';
      setTimeout(() => {
        if (this.live2dLoading) this.live2dLoading.style.display = 'none';
      }, 400);
    }

    // Set theme to match character
    if (target.bgTheme) {
      document.body.setAttribute('data-theme', target.bgTheme);
      const settings = storage.getSettings();
      settings.theme = target.bgTheme;
      storage.saveSettings(settings);
    }

    // Reload chat history and status
    this.loadCharacterData();

    // Speak initial greeting
    const greetingMsg = this.messages.find(m => m.role === 'model') || { text: target.initialGreeting, emotion: 'happy' };
    this.speakCharacter(greetingMsg.text, greetingMsg.emotion || 'happy');
  }

  renderGiftGrid() {
    const container = document.getElementById('gift-cards-container');
    if (!container) return;
    container.innerHTML = '';

    this.gifts.forEach((gift) => {
      const card = document.createElement('div');
      card.className = 'gift-card';
      card.innerHTML = `
        <span class="gift-icon">${gift.icon}</span>
        <div class="gift-name">${gift.name}</div>
        <div class="gift-desc">${gift.description}</div>
        <div class="gift-affection">+${gift.affection} 호감도</div>
        <button class="btn-send-gift" data-gift-id="${gift.id}">선물하기 💝</button>
      `;

      const btn = card.querySelector('.btn-send-gift');
      btn.onclick = () => this.sendGift(gift);
      container.appendChild(card);
    });
  }

  updateEmotionUI(emotion, badge = null, description = null) {
    const config = EMOTIONS[emotion] || EMOTIONS.neutral;
    const badgeText = badge || `${config.emoji} ${config.label}`;

    // Update Stage Pill
    if (this.live2dEmotionPill) {
      this.live2dEmotionPill.innerHTML = badgeText;
      this.live2dEmotionPill.style.borderColor = config.color;
    }

    // Update Header Badge
    if (this.headerEmotionBadge) {
      this.headerEmotionBadge.textContent = config.emoji;
      this.headerEmotionBadge.title = `현재 감정: ${config.label}`;
    }

    // Update Action / Subtitle Bubble
    if (this.live2dActionBubble) {
      const desc = description || (this.live2d?.emotionMap[emotion]?.description || '다정하게 바라본다');
      this.live2dActionBubble.textContent = `*${desc}*`;
    }
  }

  /**
   * High-fidelity speech synthesis using Gemini 3.8 Flash-Lite TTS
   * Directly drives real-time audio lip-sync on Hiyori Live2D!
   */
  speakCharacter(text, emotion = 'neutral') {
    if (!text) return;
    soundController.speak({
      text,
      emotion,
      charId: this.activeChar.id,
      voiceSettings: this.activeChar.voiceSettings,
      onStart: () => {
        if (this.live2d) this.live2d.setSpeaking(true);
      },
      onEnd: () => {
        if (this.live2d) this.live2d.setSpeaking(false);
      },
      onLipSync: (volume) => {
        if (this.live2d) this.live2d.setLipSyncValue(volume);
      }
    });
  }

  handleLive2DHit(hitInfo) {
    // Heart particles
    if (this.particleManager) {
      const rect = this.live2dCanvas.getBoundingClientRect();
      this.particleManager.burst(rect.left + rect.width / 2, rect.top + rect.height * 0.4, 18);
    }

    soundController.playHeart();
    storage.addAffection(this.activeChar.id, 2);
    this.updateIntimacyUI();

    // Show reaction subtitle bubble
    if (this.live2dActionBubble && hitInfo.text) {
      this.live2dActionBubble.textContent = hitInfo.text;
    }

    // Audio speech
    this.speakCharacter(hitInfo.text, hitInfo.emotion || 'happy');
  }

  handleTouchAction(actionType) {
    if (!this.live2d) return;
    const isChitose = this.activeChar.id === 'chitose';

    if (actionType === 'head') {
      this.live2d.setEmotion('happy');
      this.live2d.playMotion('Tap', 0);
      this.handleLive2DHit({
        area: 'head',
        emotion: 'happy',
        text: isChitose
          ? '머리 쓰다듬어주는 거야? ...나 애 취급하는 건 아니지? 그래도 네 손길은 좋아.'
          : '머리 쓰다듬어주니까 너무 기분 좋다... 헤헤 💕'
      });
    } else if (actionType === 'cheek') {
      this.live2d.setEmotion('shy');
      this.live2d.playMotion(isChitose ? 'Idle' : 'FlickDown', 0);
      this.handleLive2DHit({
        area: 'cheek',
        emotion: 'shy',
        text: isChitose
          ? '볼은 왜 꼬집어? ...간지러우니까 그만해, 얼굴 빨개지잖아.'
          : '볼 만지지 마아~ 얼굴 빨개진단 말이야! 😳'
      });
    } else if (actionType === 'love') {
      this.live2d.setEmotion('love');
      this.live2d.playMotion(isChitose ? 'Tap' : 'Tap@Body', isChitose ? 1 : 0);
      this.handleLive2DHit({
        area: 'chest',
        emotion: 'love',
        text: isChitose
          ? '나도 진심으로 너 좋아해. 내 옆에 계속 있어줘.'
          : '나도 자기 세상에서 제일 사랑해! 영원히 함께하자 🥰'
      });
    }
  }

  async sendGift(gift) {
    this.closeModal(this.modalGiftShop);

    // Audio & Hearts
    soundController.playGift();
    if (this.particleManager) {
      this.particleManager.heartShower(30);
    }

    // Add intimacy
    storage.addAffection(this.activeChar.id, gift.affection);
    this.updateIntimacyUI();

    // User message
    const userMsg = {
      id: 'msg_' + Date.now(),
      role: 'user',
      isGift: true,
      text: `🎁 [선물 전달] ${gift.name}을(를) 선물했습니다!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.messages.push(userMsg);
    this.appendMessageNode(userMsg);

    // Live2D Reaction: Love / Happy
    if (this.live2d) {
      this.live2d.setEmotion('love');
      const isChitose = this.activeChar.id === 'chitose';
      this.live2d.playMotion(isChitose ? 'Tap' : 'Tap@Body', isChitose ? 1 : 0);
    }

    // Character response
    const replyText = gift.dialogues[this.activeChar.id] || gift.dialogues.hiyori;
    const { text: cleanReply, emotion } = parseEmotionAndText(replyText);

    setTimeout(() => {
      const botMsg = {
        id: 'msg_' + Date.now(),
        role: 'model',
        text: cleanReply,
        emotion: emotion || 'love',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.messages.push(botMsg);
      this.appendMessageNode(botMsg);
      storage.saveChats(this.activeChar.id, this.messages);
      this.scrollToBottom();

      soundController.playReceive();
      this.speakCharacter(cleanReply, emotion || 'love');
    }, 600);
  }

  async sendMessage() {
    const text = this.chatTextarea.value.trim();
    if (!text || this.isStreaming) return;

    this.chatTextarea.value = '';
    this.chatTextarea.style.height = 'auto';

    soundController.playSend();

    // Add user message
    const userMsg = {
      id: 'msg_' + Date.now(),
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.messages.push(userMsg);
    this.appendMessageNode(userMsg);
    storage.saveChats(this.activeChar.id, this.messages);
    this.scrollToBottom();

    // Live2D thinking state
    if (this.live2d) {
      this.live2d.setEmotion('thinking');
    }

    // Show typing indicator
    const typingIndicator = this.createTypingIndicator();
    this.messagesContainer.appendChild(typingIndicator);
    this.scrollToBottom();

    this.isStreaming = true;
    this.btnSendMessage.disabled = true;

    const apiKey = storage.getApiKey();
    const model = storage.getModel() || DEFAULT_MODEL;

    try {
      if (apiKey) {
        // Live Gemini API call
        let accumulatedRaw = '';
        await callGeminiStream({
          apiKey,
          model,
          messages: this.messages,
          systemPrompt: this.activeChar.systemPrompt,
          onChunk: (chunk, fullText) => {
            accumulatedRaw = fullText;
          }
        });

        // Remove typing indicator
        if (typingIndicator.parentNode) {
          typingIndicator.parentNode.removeChild(typingIndicator);
        }

        const { text: cleanReply, emotion } = parseEmotionAndText(accumulatedRaw);

        // Update Live2D
        if (this.live2d) {
          await this.live2d.setEmotion(emotion);
        }

        const botMsg = {
          id: 'msg_' + Date.now(),
          role: 'model',
          text: cleanReply,
          emotion,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        this.messages.push(botMsg);
        this.appendMessageNode(botMsg);
        storage.saveChats(this.activeChar.id, this.messages);
        this.scrollToBottom();

        // Increment affection
        storage.addAffection(this.activeChar.id, 1);
        this.updateIntimacyUI();

        // Audio & TTS
        soundController.playReceive();
        this.speakCharacter(cleanReply, emotion);

      } else {
        // High-fidelity local simulation mode when API key is not entered yet
        await new Promise(r => setTimeout(r, 700));

        if (typingIndicator.parentNode) {
          typingIndicator.parentNode.removeChild(typingIndicator);
        }

        const simReply = getSimulatedReply(text, this.activeChar.id);
        const { text: cleanReply, emotion } = parseEmotionAndText(simReply);

        if (this.live2d) {
          await this.live2d.setEmotion(emotion);
        }

        const botMsg = {
          id: 'msg_' + Date.now(),
          role: 'model',
          text: cleanReply,
          emotion,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        this.messages.push(botMsg);
        this.appendMessageNode(botMsg);
        storage.saveChats(this.activeChar.id, this.messages);
        this.scrollToBottom();

        storage.addAffection(this.activeChar.id, 1);
        this.updateIntimacyUI();

        soundController.playReceive();
        this.speakCharacter(cleanReply, emotion);
      }
    } catch (err) {
      console.error('Chat error:', err);
      if (typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator);
      }

      const errMsg = {
        id: 'msg_' + Date.now(),
        role: 'model',
        text: `오류가 발생했어요: ${err.message || '네트워크 상태를 확인해주세요.'} [Gemini API 설정을 확인해주세요]`,
        emotion: 'sad',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.messages.push(errMsg);
      this.appendMessageNode(errMsg);
      if (this.live2d) this.live2d.setEmotion('sad');
    } finally {
      this.isStreaming = false;
      this.btnSendMessage.disabled = false;
      this.scrollToBottom();
    }
  }

  createTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row bot-row typing-row';
    row.innerHTML = `
      <div class="msg-avatar-wrap">
        <img src="${this.activeChar.avatar}" class="msg-avatar" alt="히요리" />
      </div>
      <div class="msg-content-wrap">
        <div class="typing-bubble">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    `;
    return row;
  }

  populateApiInputs() {
    this.inputApiKey.value = storage.getApiKey();
    const savedModel = storage.getModel() || DEFAULT_MODEL;

    const matchedOption = Array.from(this.selectGeminiModel.options).find(o => o.value === savedModel);
    if (matchedOption) {
      this.selectGeminiModel.value = savedModel;
      this.groupCustomModel.style.display = 'none';
    } else {
      this.selectGeminiModel.value = 'custom';
      this.groupCustomModel.style.display = 'flex';
      this.inputCustomModel.value = savedModel;
    }

    if (this.selectTtsEngine) {
      this.selectTtsEngine.value = storage.getTtsEngine() || DEFAULT_TTS_ENGINE;
    }
    if (this.selectTtsVoice) {
      this.selectTtsVoice.value = storage.getTtsVoice() || DEFAULT_TTS_VOICE;
    }
    if (this.groupTtsVoice && this.selectTtsEngine) {
      this.groupTtsVoice.style.display = this.selectTtsEngine.value.startsWith('gemini') ? 'flex' : 'none';
    }
  }

  saveApiSettings() {
    const key = this.inputApiKey.value.trim();
    let model = this.selectGeminiModel.value;
    if (model === 'custom') {
      model = this.inputCustomModel.value.trim() || DEFAULT_MODEL;
    }

    const ttsEngine = this.selectTtsEngine ? this.selectTtsEngine.value : DEFAULT_TTS_ENGINE;
    const ttsVoice = this.selectTtsVoice ? this.selectTtsVoice.value : DEFAULT_TTS_VOICE;

    storage.setApiKey(key);
    storage.setModel(model);
    storage.setTtsEngine(ttsEngine);
    storage.setTtsVoice(ttsVoice);
    this.checkApiKeyStatus();

    this.apiTestStatusBox.innerHTML = `
      <div style="color: #4ade80; padding: 10px; border-radius: 8px; background: rgba(74, 222, 128, 0.1);">
        ✅ 설정이 저장되었습니다!<br/>
        <small>대화 모델: <strong>${model}</strong> / 음성: <strong>${ttsEngine} (${ttsVoice})</strong></small>
      </div>
    `;

    setTimeout(() => {
      this.closeModal(this.modalApiSettings);
      this.apiTestStatusBox.innerHTML = '';
    }, 1200);
  }

  async testApiConnection() {
    const key = this.inputApiKey.value.trim();
    if (!key) {
      this.apiTestStatusBox.innerHTML = `
        <div style="color: #f87171; padding: 10px; border-radius: 8px; background: rgba(248, 113, 113, 0.1);">
          ❌ API 키를 먼저 입력해주세요.
        </div>
      `;
      return;
    }

    let model = this.selectGeminiModel.value;
    if (model === 'custom') {
      model = this.inputCustomModel.value.trim() || DEFAULT_MODEL;
    }

    this.apiTestStatusBox.innerHTML = `
      <div style="color: #38bdf8; padding: 10px; border-radius: 8px; background: rgba(56, 189, 248, 0.1);">
        ⏳ Gemini (${model}) 서버 및 TTS 연결을 확인하는 중...
      </div>
    `;

    try {
      this.btnTestApi.disabled = true;
      const res = await testConnection(key, model);
      this.apiTestStatusBox.innerHTML = `
        <div style="color: #4ade80; padding: 10px; border-radius: 8px; background: rgba(74, 222, 128, 0.1);">
          🎉 연결 성공! (Gemini 응답: "${res.text || '정상'}")<br/>
          <small>✨ Gemini 3.8 Flash-Lite TTS도 이 키로 무료 티어에서 바로 작동합니다!</small>
        </div>
      `;
    } catch (err) {
      this.apiTestStatusBox.innerHTML = `
        <div style="color: #f87171; padding: 10px; border-radius: 8px; background: rgba(248, 113, 113, 0.1);">
          ❌ 연결 실패: ${err.message}
        </div>
      `;
    } finally {
      this.btnTestApi.disabled = false;
    }
  }

  updateTtsButtonState() {
    if (this.btnHeaderTts) {
      if (soundController.ttsEnabled) {
        this.btnHeaderTts.classList.add('active');
        this.btnHeaderTts.innerHTML = '🔊';
        this.btnHeaderTts.title = '음성 읽기(TTS) 켜짐';
      } else {
        this.btnHeaderTts.classList.remove('active');
        this.btnHeaderTts.innerHTML = '🔇';
        this.btnHeaderTts.title = '음성 읽기(TTS) 꺼짐';
      }
    }
  }

  toggleTheme() {
    const themes = ['blossom', 'midnight', 'sunshine'];
    const current = document.body.getAttribute('data-theme') || 'blossom';
    const nextIdx = (themes.indexOf(current) + 1) % themes.length;
    const nextTheme = themes[nextIdx];

    document.body.setAttribute('data-theme', nextTheme);
    const settings = storage.getSettings();
    settings.theme = nextTheme;
    storage.saveSettings(settings);
  }

  openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  closeModal(modal) {
    if (modal) modal.classList.remove('active');
  }

  bindEvents() {
    // Send message
    this.btnSendMessage.onclick = () => this.sendMessage();
    this.chatTextarea.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    };

    // Auto resize textarea
    this.chatTextarea.oninput = () => {
      this.chatTextarea.style.height = 'auto';
      this.chatTextarea.style.height = Math.min(this.chatTextarea.scrollHeight, 120) + 'px';
    };

    // Touch Hotbar buttons
    document.querySelectorAll('.btn-touch-action[data-touch]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.getAttribute('data-touch');
        this.handleTouchAction(action);
      };
    });

    // Zoom Toggle Button
    if (this.btnZoomToggle) {
      this.btnZoomToggle.onclick = () => {
        this.isCloseup = !this.isCloseup;
        if (this.live2d) {
          this.live2d.setZoom(this.isCloseup ? 'closeup' : 'normal');
        }
        this.btnZoomToggle.classList.toggle('active', this.isCloseup);
        this.btnZoomToggle.title = this.isCloseup ? '전신 시점으로 전환' : '얼굴 클로즈업으로 전환';
      };
    }

    // Quick gift button on stage
    const btnQuickGift = document.getElementById('btn-quick-gift');
    if (btnQuickGift) btnQuickGift.onclick = () => this.openModal(this.modalGiftShop);
    if (this.btnSideGift) this.btnSideGift.onclick = () => this.openModal(this.modalGiftShop);
    if (this.btnHeaderGift) this.btnHeaderGift.onclick = () => this.openModal(this.modalGiftShop);
    if (this.btnInputGift) this.btnInputGift.onclick = () => this.openModal(this.modalGiftShop);

    // Heart emote button
    if (this.btnInputHeart) {
      this.btnInputHeart.onclick = () => {
        if (this.particleManager) {
          this.particleManager.heartShower(25);
        }
        soundController.playHeart();
        storage.addAffection(this.activeChar.id, 2);
        this.updateIntimacyUI();
        if (this.live2d) {
          this.live2d.setEmotion('love');
          this.live2d.playMotion('Tap@Body', 0);
        }
      };
    }

    // Mobile View Tabs
    document.querySelectorAll('.btn-view-tab').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.btn-view-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.getAttribute('data-view');
        document.body.setAttribute('data-mobile-view', view);
        if (this.live2d) {
          setTimeout(() => this.live2d.onResize(), 150);
        }
      };
    });

    // Character selection modal open
    const openCharSelect = () => {
      this.renderCharacterGrid();
      this.openModal(this.modalCharSelect);
    };
    if (this.btnStageCharSelect) this.btnStageCharSelect.onclick = openCharSelect;
    if (this.btnSideCharSelect) this.btnSideCharSelect.onclick = openCharSelect;
    if (this.btnHeaderChars) this.btnHeaderChars.onclick = openCharSelect;
    if (this.btnHeaderProfile) this.btnHeaderProfile.onclick = openCharSelect;

    // Settings modal open
    const openSettings = () => {
      this.populateApiInputs();
      this.openModal(this.modalApiSettings);
    };
    if (this.btnSideApiSettings) this.btnSideApiSettings.onclick = openSettings;
    if (this.btnHeaderSettings) this.btnHeaderSettings.onclick = openSettings;
    if (this.btnBannerSetup) this.btnBannerSetup.onclick = openSettings;

    // Clear chat
    if (this.btnSideClearChat) {
      this.btnSideClearChat.onclick = () => {
        const charName = this.activeChar.name.split(' ')[0];
        if (confirm(`${charName}와의 대화 내역을 모두 지우시겠어요? (호감도는 유지됩니다)`)) {
          storage.clearChats(this.activeChar.id);
          this.messages = [];
          this.loadCharacterData();
        }
      };
    }

    // TTS toggle
    if (this.btnHeaderTts) {
      this.btnHeaderTts.onclick = () => {
        soundController.ttsEnabled = !soundController.ttsEnabled;
        const settings = storage.getSettings();
        settings.tts = soundController.ttsEnabled;
        storage.saveSettings(settings);
        this.updateTtsButtonState();
        if (!soundController.ttsEnabled) {
          soundController.stopSpeak();
          if (this.live2d) this.live2d.setSpeaking(false);
        }
      };
    }

    // Theme toggle
    if (this.btnHeaderTheme) {
      this.btnHeaderTheme.onclick = () => this.toggleTheme();
    }

    // API settings controls
    if (this.selectGeminiModel) {
      this.selectGeminiModel.onchange = () => {
        this.groupCustomModel.style.display = this.selectGeminiModel.value === 'custom' ? 'flex' : 'none';
      };
    }

    if (this.selectTtsEngine) {
      this.selectTtsEngine.onchange = () => {
        if (this.groupTtsVoice) {
          this.groupTtsVoice.style.display = this.selectTtsEngine.value.startsWith('gemini') ? 'flex' : 'none';
        }
      };
    }

    if (this.btnToggleKeyVisibility) {
      this.btnToggleKeyVisibility.onclick = () => {
        const isPassword = this.inputApiKey.type === 'password';
        this.inputApiKey.type = isPassword ? 'text' : 'password';
        this.btnToggleKeyVisibility.textContent = isPassword ? '🔒' : '👁️';
      };
    }

    if (this.btnTestApi) this.btnTestApi.onclick = () => this.testApiConnection();
    if (this.btnSaveApi) this.btnSaveApi.onclick = () => this.saveApiSettings();

    // Modal close buttons
    document.querySelectorAll('.btn-modal-close, [data-close]').forEach(el => {
      el.onclick = () => {
        const targetId = el.getAttribute('data-close');
        const modal = targetId ? document.getElementById(targetId) : el.closest('.modal-overlay');
        this.closeModal(modal);
      };
    });

    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.onclick = (e) => {
        if (e.target === overlay) this.closeModal(overlay);
      };
    });
  }
}

// Bootstrap application on window load
window.addEventListener('DOMContentLoaded', () => {
  new SweetheartApp();
});
