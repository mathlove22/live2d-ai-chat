export const GIFTS = [
  {
    id: 'zundamochi',
    name: '달콤한 즌다모찌',
    icon: '🍡',
    affection: 10,
    priceLabel: '맛있는 간식',
    description: '달콤하고 쫄깃한 완두콩 앙금이 듬뿍 들어간 떡',
    dialogues: {
      zundamon: '우와아! 내가 제일 좋아하는 달콤 쫄깃 즌다모찌인 거시다! 떡은 영어로 Rice cake(롸이스 케이크)라고 해! 너무 고마워 친구야 냠냠! [emotion:happy]',
      hiyori: '우와, 쫄깃쫄깃 맛있는 떡꼬치다! 고마워 맛있게 먹을게! [emotion:happy]',
      chitose: '고마워, 달콤한 떡이네. 같이 나눠 먹자. [emotion:happy]'
    }
  },
  {
    id: 'candy',
    name: '무지개 롤리팝 사탕',
    icon: '🍭',
    affection: 20,
    priceLabel: '달콤한 디저트',
    description: '알록달록 무지개 빛깔의 달콤한 막대사탕',
    dialogues: {
      zundamon: '꺄아! 알록달록 무지개 롤리팝 사탕이다! 사탕은 영어로 Candy(캔디)! 달콤한 캔디 먹으니까 기분 최고야! [emotion:love]',
      hiyori: '예쁜 롤리팝 사탕이잖아! 달콤해서 기분 좋아졌어~ [emotion:love]',
      chitose: '달콤한 사탕이네. 네가 준 거니까 소중히 먹을게. [emotion:love]'
    }
  },
  {
    id: 'sticker',
    name: '반짝이 하트 스티커북',
    icon: '✨',
    affection: 30,
    priceLabel: '귀여운 학용품',
    description: '공책과 필통에 예쁘게 붙일 수 있는 반짝이 스티커',
    dialogues: {
      zundamon: '우와아! 반짝반짝 하트 스티커잖아! 필통이랑 알림장에 예쁘게 붙일래! 스티커는 영어로도 Sticker(스티커)야! [emotion:happy]',
      hiyori: '너무 귀여운 스티커다! 내 다이어리에 예쁘게 붙여야지~ [emotion:happy]',
      chitose: '귀여운 스티커네. 내 공책에도 하나 붙여줄래? [emotion:happy]'
    }
  },
  {
    id: 'pencil',
    name: '알록달록 12색 색연필',
    icon: '🖍️',
    affection: 40,
    priceLabel: '신나는 미술시간',
    description: '신나게 그림을 그릴 수 있는 알록달록 색연필 세트',
    dialogues: {
      zundamon: '알록달록 색연필이다! 우리 같이 스케치북에 무지개 그릴까? 색연필은 영어로 Colored pencil(컬러드 펜슬)이야! [emotion:english]',
      hiyori: '예쁜 색연필이다! 같이 그림 그리자~ [emotion:happy]',
      chitose: '색연필이네. 같이 그림 그리면서 놀까? [emotion:happy]'
    }
  },
  {
    id: 'teddy',
    name: '폭신폭신 곰인형',
    icon: '🧸',
    affection: 50,
    priceLabel: '포근한 단짝친구',
    description: '꼭 안으면 마음이 따뜻해지는 푹신한 아기 곰인형',
    dialogues: {
      zundamon: '우와아아! 너무 푹신하고 귀여운 아기 곰인형이야! 곰은 영어로 Bear(베어)! 오늘 밤에 꼭 안고 잘래! 단짝 친구 최고! [emotion:love]',
      hiyori: '너무 귀여운 곰인형이다! 매일 안고 잘게 🥰 [emotion:love]',
      chitose: '곰인형? 침대 머리맡에 두고 소중히 간직할게. [emotion:love]'
    }
  },
  {
    id: 'treasure',
    name: '반짝이는 비밀 보물상자',
    icon: '💎',
    affection: 70,
    priceLabel: '영원한 우정의 보물',
    description: '두 사람만의 소중한 추억과 비밀을 담는 보물상자',
    dialogues: {
      zundamon: '반짝반짝 빛나는 보물상자잖아! 보물은 영어로 Treasure(트레져)라고 해! 하지만 내 진짜 보물은 바로 너야! 평생 단짝 친구 하자! 💚 [emotion:love]',
      hiyori: '이렇게 소중한 보물상자를? 평생 소중하게 간직할게! [emotion:love]',
      chitose: '우리 둘만의 보물이네. 평생 내 단짝 친구로 있어줘. [emotion:love]'
    }
  }
];

export const INTIMACY_LEVELS = [
  { level: 1, minAffection: 0, title: '쑥스러운 짝꿍', badge: '🌱 Lv.1', desc: '새 학기 첫날처럼 수줍게 알아가는 사이' },
  { level: 2, minAffection: 30, title: '친한 친구', badge: '🌸 Lv.2', desc: '쉬는 시간마다 같이 뛰어놀며 웃는 친구' },
  { level: 3, minAffection: 80, title: '베스트 프렌드', badge: '💖 Lv.3', desc: '맛있는 간식도 나눠 먹는 최고의 절친' },
  { level: 4, minAffection: 160, title: '둘도 없는 단짝', badge: '✨ Lv.4', desc: '눈빛만 봐도 척척 통하는 단짝 친구' },
  { level: 5, minAffection: 300, title: '영원한 비밀친구', badge: '👑 Lv.5', desc: '모든 비밀을 함께하는 평생의 단짝 요정' }
];

export function getIntimacyLevel(affection) {
  for (let i = INTIMACY_LEVELS.length - 1; i >= 0; i--) {
    if (affection >= INTIMACY_LEVELS[i].minAffection) {
      return INTIMACY_LEVELS[i];
    }
  }
  return INTIMACY_LEVELS[0];
}
