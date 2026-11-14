# study — 시험공부 자료 만들기

교과서·자습서 내용을 넣으면 **요약 발표 자료**와 **내신형 사전 시험 페이지**를 만들어 주는 Claude Code 작업 환경.

## 사용법
1. 자료 넣기: `materials\<과목>\<단원>\` 에 교과서·자습서 사진, PDF, 텍스트를 넣는다.
   - 예: `materials\과학\2단원\교과서-p30.jpg`
   - 기출문제가 있으면 `materials\past-exams\<과목>\` 에 넣는다 (실제 학교 시험 경향에 맞춰 줌).
2. `E:\dev\mg.io` 또는 `study` 폴더에서 Claude Code를 실행하고 `/study 과학 2단원` 입력.
3. 결과: `output\과학\2단원\`
   - `slides.html` — 요약 발표 자료 (브라우저로 열기, 방향키로 넘김)
   - `quiz.html` — 사전 시험 (연습 모드: 한 문제씩 바로 채점 / 실전 모드: 시간 제한, 끝나고 채점)

## 동작 방식
```
자료 → 핵심 정리(notes.md)
     → 내신 시험화 에이전트: 시험 설계도(blueprint.json)
     → 발표 자료(slides.html) + 문제 출제(questions.json → quiz.html)
     → 검수 3개 동시 진행: 형식 / 내용 / 종합
          ├ 셋 다 통과 → 완성
          └ 하나라도 반려 → 해당 단계로 되돌려 수정 후 재검수 (통과할 때까지)
```

## 구성
| 경로 | 역할 |
|------|------|
| `.claude/skills/study/` | `/study` 전체 진행 |
| `.claude/skills/study-quiz/` | 문제 출제 규칙과 데이터 형식 |
| `.claude/skills/frontend-slides/` | 발표 자료 제작 (외부 스킬, MIT, github.com/zarazhangrui/frontend-slides) |
| `.claude/agents/exam-designer.md` | 내신 시험화: 문항 수·유형·난이도·배점 설계 |
| `.claude/agents/review-format.md` | 형식 검수: 오탈자, 정답 중복, 보기 형식 |
| `.claude/agents/review-content.md` | 내용 검수: 원문 대조, 학습 내용 오류 |
| `.claude/agents/review-overall.md` | 종합 검수: 설계도 준수, 시험다움, 범위 일치 |
| `engine/quiz-template.html` | 시험 페이지 엔진 (화면·채점·오답 복습) |
| `engine/build_quiz.py` | 문제 데이터 검사 + quiz.html 생성 |

## 시험 엔진만 따로 쓰기
```powershell
python engine\build_quiz.py output\과학\2단원\questions.json            # 검사 + quiz.html 생성
python engine\build_quiz.py output\과학\2단원\questions.json --check-only
```

## 온라인으로 보기 (GitHub Pages)
- 목록: https://sol-8923.github.io/mg.io/study/
- `/study`가 끝나면 목록 페이지(`index.html`)를 갱신하고 push해서 1~2분 뒤 반영된다.

## 주의
저장소와 Pages는 공개다. 결과물은 교과서 문장을 그대로 옮기지 않고 요약·재구성한 내용으로 만든다. 교과서 사진 원본(`materials/`)은 git에 올리지 않는다(.gitignore).
