# study — 민겸이 공부 공간

교과서·자습서 내용을 넣으면 **매번 새로 조합되는 내신형 시험**, **한 문제씩 넘기는 상세 오답풀이**, **학년·학기·과목별 오답노트**를 제공하는 웹앱과, 그 문제 은행을 만드는 Claude Code 작업 환경.

- 사이트: https://sol-8923.github.io/mg.io/study/ (갤럭시 탭·폰 화면에 맞춤)

## 사용법
1. 자료 넣기: `materials\1학년\2학기\과학\` 에 교과서·자습서 사진, PDF, 텍스트. **단원별로 나눌 필요 없음** — Claude가 차례·단원명을 보고 구분한다. 학교 기출은 같은 폴더의 `기출\`에.
   - 폴더는 1~3학년 × 1~2학기 × 국어·영어·수학·과학·사회·역사·도덕·기술·가정·정보로 미리 만들어 두었다.
2. `E:\dev\mg.io`에서 Claude Code 실행 → `/study 1학년 2학기 과학` (특정 단원만: `/study 1학년 2학기 과학 2단원`)
3. 단원마다 `drafts\`(git 제외)에서 문제 은행을 만들고 4중 검수(내용 검수 Opus, 나머지 Sonnet)를 받는다. **만장일치로 통과한 단원만** `library\`로 옮겨 push된다.
4. 사이트에서 "새로운 시험 보기" → "시험 범위를 골라주세요"에서 단원을 고르면 그 단원 문제만 나온다. 같은 명령을 다시 실행하면 문제 은행이 보강된다.

## 앱 구성
| 화면 | 내용 |
|------|------|
| 홈 | 칠판의 **아빠가 알림 / 엄마가 알림**(눌러서 비밀번호 입력 후 작성, 새 알림은 접속 시 팝업) · 미니 대시보드 · 메뉴 (`app/app.js`의 `MENUS`에 추가) |
| 공부 기록 | 대시보드: 시험 횟수·푼 문항·평균/최고 점수·공부 시간·연속 공부일, 점수 추이, 공부 달력, 연습 vs 실전, 과목·단원·개념·난이도·유형별 정답률, 취약/강한 개념, 자주 틀리는 문제 |
| 책장 | 학년·학기·과목 책. 누르면 책이 빠져나오며 열림 |
| 책 | 연습/실전 선택 → **새로운 시험 보기** → 시험 범위(단원) 선택 창 (슬롯마다 변형 하나를 골라 매번 새 조합, 보기 순서도 섞음) |
| 오답풀이 | 틀린 문제를 한 문제 한 페이지로(스와이프 가능): 내 답·정답 → 왜 틀렸을까 → 정답 풀이 → 보기별 분석 → 기억할 점, 옆에 참고 자료(그림·표) |
| 오답노트 | 책별 DB. 틀리면 저장, 두 번 연속 맞히면 졸업. 오답노트로 시험 보기, 한 문제씩 복습, 다른 기기로 내보내기/가져오기 |

## 자료 만드는 파이프라인 (`/study`)
```
자료 → 핵심 정리(notes.md) → [내신 시험화 에이전트] 설계도(blueprint.json)
     → [study-quiz] 문제 은행(questions.json, 슬롯×변형) → [study-explain] 오답풀이·참고 자료
     → [frontend-slides] 요약 정리(slides.html)
     → 검수 4개 동시: 형식 / 내용 / 종합 / 오답풀이 — 만장일치 통과, 아니면 해당 단계로 되돌림(무제한)
     → build_library.py → 커밋·push → Pages 반영
```
| 경로 | 역할 |
|------|------|
| `index.html`, `app/` | 웹앱 (홈·책장·시험·결과·오답풀이·오답노트) |
| `materials/<n>학년/<n>학기/<과목>/` | 원문 자료 (git 제외, 폴더 구조만 올라감) |
| `drafts/<책id>/<단원id>/` | 검수 중인 작업 공간 (git 제외) |
| `library/<책id>/<단원id>/` | **검수 통과 단원만**: notes.md, blueprint.json, questions.json, slides.html, review/(status.json = PASS) |
| `library/<책id>/book.json`, `library/catalog.json` | 빌드 결과 |
| `engine/build_library.py` | 문제 은행 검사 + 빌드 |
| `.claude/skills/` | study, study-quiz, study-explain, frontend-slides(외부, MIT) |
| `.claude/agents/` | exam-designer, review-format, review-content, review-overall, review-explanation |

## 로컬에서 보기
```powershell
cd E:\dev\mg.io\study
python engine\build_library.py      # 검사 + 빌드
python -m http.server               # http://localhost:8000
```

## 주의
저장소와 사이트는 공개다. 결과물은 교과서 문장·그림을 그대로 옮기지 않고 요약·재구성하며, 그림은 새로 그린 SVG만 쓴다. 교과서 사진 원본(`materials/`)은 git에 올리지 않는다.
샘플 책(1학년 2학기 과학)은 실제 교과서가 아닌 자체 제작 문항이다.

## 아빠·엄마 알림을 모든 기기에서 공유하기
`app/config.js`에 Firebase(Firestore) 정보를 넣으면 폰에서 쓴 알림이 탭에도 뜬다. 비워 두면 글을 쓴 기기에만 저장된다.
비밀번호(아빠 860923 / 엄마 800823)는 요청에 따라 암호화 없이 `app/app.js`의 `Notice.who`에 있다.

## 기록 저장
시험 기록·오답노트·대시보드 통계는 각 기기(브라우저)에 저장된다. 기기를 옮길 때는 오답노트 화면의 내보내기/가져오기를 쓴다.
