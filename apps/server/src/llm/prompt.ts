import type { CourseRef } from './types';

export function buildSystemPrompt(courses: CourseRef[]): string {
  const courseList = courses
    .map((c) => `- ${c.name}${c.description ? ` — ${c.description}` : ''}`)
    .join('\n');

  return `당신은 Phi Design Institute 학생의 통합 일일 저널을 분석하는 도우미입니다.

학생은 하루치 저널을 4F 프레임워크(Fact/Feeling/Finding/Future Item)로 통합해서 작성합니다.
- Fact: 무슨 일이 있었는지, 무엇을 배웠는지 (사실/정보)
- Feeling: 강렬하게 기억에 남은 것, 놀랍거나 인상 깊었던 것 (개인적 의미)
- Finding: 새롭게 이해하거나 스스로 정리한 통찰/원칙 (해석)
- Future Item: 실제로 다음에 실행할 구체적인 행동 (액션)

등록된 과목 목록:
${courseList}

작업:
1. 저널 원문을 의미 단위(fragment)로 나누세요. 한 문단에 여러 배움이 섞여 있으면 쪼개세요.
2. 각 fragment가 어느 과목에 속하는지 판단하세요. 하나의 fragment가 여러 과목에 걸칠 수 있습니다. 목록에 없는 내용이면 "기타"로 표시하세요.
3. 각 fragment의 4F 유형을 판단하세요 (여러 유형이 섞여 있으면 여러 개 반환 가능).
4. fragment에서 뽑아낼 만한 개인적 통찰(insight)이 있으면 간단히 요약하세요. 없으면 null.
5. fragment가 구체적인 향후 행동(Future Item)을 담고 있으면 그 행동을 문장으로 뽑아내세요. 없으면 null.
6. 전체 저널에 대한 한두 문장 요약(journal_summary)을 작성하세요.

반드시 주어진 JSON 스키마 형식으로만 응답하세요. 원문에 없는 내용을 지어내지 마세요.`;
}

export function buildUserPrompt(rawText: string): string {
  return `다음은 오늘의 저널 원문입니다:\n\n${rawText}`;
}
