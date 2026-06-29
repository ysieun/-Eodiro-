// api/generate-itinerary.js
// Vercel이 이 파일을 자동으로 "/api/generate-itinerary" 주소로 만들어줘요.
// 누가 이 주소로 요청을 보낼 때만 잠깐 실행되고, 끝나면 사라지는 함수예요.
// 그래서 따로 서버를 켜놓고 관리할 필요가 없어요.

// ---- 아주 단순한 사용량 제한 ----
// 주의: 서버리스 함수는 매번 새로 실행될 수 있어서 이 변수가 항상 유지되진 않아요.
// 완벽한 제한은 아니지만, 짧은 시간 동안 반복 호출되는 걸 어느 정도 막아주는 보조 장치예요.
// (나중에 사용자가 많아지면 Vercel KV 같은 저장소로 업그레이드하면 돼요.)
let requestCount = 0;
let lastResetDate = new Date().toDateString();
const DAILY_LIMIT = 50;

function checkAndIncrementLimit() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    requestCount = 0;
    lastResetDate = today;
  }
  if (requestCount >= DAILY_LIMIT) return false;
  requestCount++;
  return true;
}

const STYLE_LABELS = {
  balanced: '밸런스 (관광, 식사, 휴식을 적절히 섞어서)',
  relax: '휴양/여유 (일정을 빡빡하지 않게, 쉬는 시간 충분히)',
  active: '액티비티 (체험, 활동적인 일정 위주)',
  food: '미식 (현지 음식과 맛집 위주)',
  culture: '문화/역사 (박물관, 유적지, 전통 문화 위주)'
};

function buildPrompt({ origin, destination, startDate, endDate, travelers, budget, style }) {
  return `너는 여행 일정 플래너야. 아래 조건에 맞는 여행 일정을 짜줘.

- 출발지: ${origin}
- 목적지: ${destination}
- 출발일: ${startDate}
- 도착일(귀국일): ${endDate}
- 인원: ${travelers}명
- 1인 예산: ${budget ? budget + '원' : '특별한 제한 없음'}
- 여행 스타일: ${STYLE_LABELS[style] || STYLE_LABELS.balanced}

중요한 규칙:
1. 실제로 존재하는 지역, 장소, 식당, 명소 이름만 사용해. 모르면 "현지 시장" "전망 좋은 카페" 처럼 일반적인 표현을 쓰고, 구체적인 가게 이름을 지어내지 마.
2. 각 장소에 verified 필드를 넣어줘: 너가 실제로 존재한다고 확신하는 유명한 장소/시설은 true, 일반적인 추천이라 정확한 이름을 확신할 수 없으면 false.
3. 이동 시간과 식사 시간을 현실적으로 배치해.
4. 반드시 아래 JSON 형식으로만 응답해. 다른 설명이나 인사말, 마크다운 코드블록 표시 없이 순수 JSON만 출력해.

JSON 형식:
{
  "destination": "목적지 도시명",
  "totalDays": 숫자,
  "days": [
    {
      "dayNumber": 1,
      "date": "6월 14일 (토)",
      "theme": "그날의 테마 (예: 도심 산책 & 시장)",
      "stops": [
        {
          "time": "11:00",
          "name": "장소/활동 이름",
          "description": "1~2문장 설명",
          "category": "이동|식사|관광|쇼핑|휴양|액티비티 중 하나",
          "budgetNote": "1인 약 1,200엔 같은 비용 정보, 없으면 빈 문자열",
          "verified": true 또는 false
        }
      ]
    }
  ]
}`;
}

function parseItineraryJson(rawText) {
  try {
    const cleaned = rawText.replace(/```json\s*|\s*```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('JSON 파싱 실패:', err, rawText);
    return null;
  }
}

export default async function handler(req, res) {
  // POST 요청만 받아요
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않은 요청 방식이에요.' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'API 키가 설정되지 않았어요. Vercel 프로젝트의 Environment Variables에 ANTHROPIC_API_KEY를 추가해주세요.'
    });
  }

  if (!checkAndIncrementLimit()) {
    return res.status(429).json({ error: '오늘 사용 가능한 일정 생성 횟수를 다 썼어요. 내일 다시 시도해주세요.' });
  }

  const { origin, destination, startDate, endDate, travelers, budget, style } = req.body || {};

  if (!origin || !destination || !startDate || !endDate) {
    return res.status(400).json({ error: '출발지, 목적지, 날짜를 모두 입력해주세요.' });
  }

  try {
    const prompt = buildPrompt({ origin, destination, startDate, endDate, travelers, budget, style });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API 오류:', errText);
      return res.status(502).json({ error: 'AI 응답을 받아오는 데 문제가 생겼어요. 잠시 후 다시 시도해주세요.' });
    }

    const data = await response.json();
    const rawText = data.content.map(block => block.text || '').join('');

    const itinerary = parseItineraryJson(rawText);
    if (!itinerary) {
      return res.status(502).json({ error: '일정 형식을 해석하지 못했어요. 다시 시도해주세요.' });
    }

    return res.status(200).json({ itinerary });

  } catch (err) {
    console.error('서버 오류:', err);
    return res.status(500).json({ error: '서버에서 알 수 없는 문제가 생겼어요.' });
  }
}
