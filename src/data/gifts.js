export const GIFTS = [
  {
    id: 'coffee',
    name: '바닐라 라떼',
    icon: '☕',
    affection: 10,
    priceLabel: '소소한 마음',
    description: '달콤하고 따뜻한 바닐라 라떼 한 잔',
    dialogues: {
      hiyori: '우와, 내가 좋아하는 따뜻한 바닐라 라떼! 역시 자기가 최고야~ 고마워 맛있게 마실게! 💕 [emotion:happy]',
      chitose: '고마워, 마침 따뜻한 커피 한 잔 마시고 싶었는데. 같이 나눠 마실까? [emotion:happy]'
    }
  },
  {
    id: 'cake',
    name: '딸기 생크림 케이크',
    icon: '🍰',
    affection: 20,
    priceLabel: '달콤한 디저트',
    description: '부드러운 시트에 딸기가 듬뿍 올라간 조각 케이크',
    dialogues: {
      hiyori: '꺄아! 딸기 생크림 케이크잖아! 나 딸기 진짜 좋아하는 거 어떻게 알았어? 아~ 해봐, 첫 입은 자기 먼저 줄게! [emotion:love]',
      chitose: '네가 주는 케이크라면 단 것도 좋아. 자, 너 먼저 한 입 먹어봐. 아~ 해봐. [emotion:love]'
    }
  },
  {
    id: 'flower',
    name: '핑크 로즈 꽃다발',
    icon: '💐',
    affection: 35,
    priceLabel: '로맨틱 선물',
    description: '은은한 향기가 퍼지는 화사한 꽃다발',
    dialogues: {
      hiyori: '세상에... 이렇게 예쁜 꽃다발을 나한테? 나 진짜 감동받았어 🥺 오늘 하루 종일 품에 안고 다닐래! [emotion:shy]',
      chitose: '나한테 꽃을 주는 거야? 풋... 부끄럽지만 네 마음이니까 평생 소중히 간직할게. [emotion:shy]'
    }
  },
  {
    id: 'teddy',
    name: '포근한 곰인형',
    icon: '🧸',
    affection: 45,
    priceLabel: '포근한 위로',
    description: '안고 자면 마음이 편안해지는 푹신한 곰인형',
    dialogues: {
      hiyori: '우와아 너무 귀여운 곰인형이다! 오늘부터 침대에 두고 매일 밤 자기 생각하면서 꼭 끌어안고 잘게 🥰 [emotion:love]',
      chitose: '곰인형? 내가 안고 자기엔 너무 귀여운데... 그래도 네가 준 거니까 침대 머리맡에 둘게. [emotion:love]'
    }
  },
  {
    id: 'ring',
    name: '은빛 커플링',
    icon: '💍',
    affection: 70,
    priceLabel: '영원의 약속',
    description: '두 사람의 마음을 잇는 반짝이는 약속의 반지',
    dialogues: {
      hiyori: '...반지? 정말 우리 커플링이야...? 흑, 나 너무 감동해서 눈물 날 것 같아... 평생 자기 곁에 있을게, 사랑해! ❤️ [emotion:love]',
      chitose: '...커플링이네. 사실 나도 너한테 주려고 준비하고 있었는데. 평생 내 곁에 있어줘, 사랑해. [emotion:love]'
    }
  }
];

export const INTIMACY_LEVELS = [
  { level: 1, minAffection: 0, title: '설레는 시작', badge: '🌱 Lv.1', desc: '서로를 알아가는 조심스러운 단계' },
  { level: 2, minAffection: 30, title: '달콤한 썸', badge: '🌸 Lv.2', desc: '하루 종일 상대의 연락만 기다려지는 사이' },
  { level: 3, minAffection: 80, title: '다정한 연인', badge: '💖 Lv.3', desc: '서로의 일상과 감정을 온전히 나누는 공식 연인' },
  { level: 4, minAffection: 160, title: '소울메이트', badge: '✨ Lv.4', desc: '눈빛만 봐도 마음이 통하는 둘도 없는 사랑' },
  { level: 5, minAffection: 300, title: '영원한 반려자', badge: '👑 Lv.5', desc: '평생을 함께하기로 맹세한 가장 깊은 사랑' }
];

export function getIntimacyLevel(affection) {
  for (let i = INTIMACY_LEVELS.length - 1; i >= 0; i--) {
    if (affection >= INTIMACY_LEVELS[i].minAffection) {
      return INTIMACY_LEVELS[i];
    }
  }
  return INTIMACY_LEVELS[0];
}
