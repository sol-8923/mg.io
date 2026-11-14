---
name: study
description: 교과서·자습서 자료로 "민겸이 공부 공간"의 교과서(학년·학기·과목) 문제 은행과 요약 정리를 만드는 전체 파이프라인. 정리 → 내신 시험화(설계도) → 문제 은행 출제(슬롯별 변형) → 오답풀이 작성 → 요약 정리 → 4중 검수(만장일치, 반려 시 되돌림) → 빌드·배포. "/study 1학년 2학기 과학 2단원", "이 자료로 시험공부 자료 만들어줘", "문제 은행 보강해줘" 같은 요청에 사용한다.
---

# 시험공부 자료 만들기 (/study)

사용법: `/study <학년> <학기> <과목> <단원> [<단원> ...]` — 예: `/study 1학년 2학기 과학 2단원`
같은 단원을 다시 실행하면 **보강 모드**: 기존 문제는 두고 슬롯마다 변형 문제를 더 추가한다.

## 앱이 동작하는 방식 (만들 때 꼭 알아야 할 것)
- 사이트: `https://sol-8923.github.io/mg.io/study/` — 홈 → 시험으로 풀어보기(책장) → 책(시험 범위 선택) → 시험 → 결과 → 오답풀이(한 문제 한 페이지, 옆에 참고 자료) / 오답노트
- **시험지는 들어갈 때마다 새로 조합된다.** 설계도의 슬롯마다 은행의 변형 문제 중 하나를 고르고(최근에 덜 본 것 우선), 선택형 보기 순서를 섞는다. 그래서:
  - 슬롯마다 변형 문제가 **여러 개**(기본 2개 이상) 있어야 한다.
  - 보기가 섞이므로 해설에서 보기를 **번호(①~⑤)로 가리키면 안 된다.** 보기 내용으로 가리키거나, 순서가 의미 있는 문항(ㄱㄴㄷ 조합, A~E 기호, 크기순)은 `fixedOrder: true`.
- 오답노트·기록은 각 기기(localStorage)에 저장된다. 서버는 없다.

## 폴더
| 경로 | 내용 |
|------|------|
| `materials/<학년>학년<학기>학기-<과목>/<단원>/` | 원문: 교과서·자습서 사진, PDF, 텍스트 (git 제외) |
| `materials/past-exams/<과목>/` | 학교 기출문제 (git 제외) |
| `library/<책id>/meta.json` | 책 정보 `{grade, semester, subject, color?, description?}` |
| `library/<책id>/<단원id>/` | `notes.md`, `blueprint.json`, `questions.json`, `slides.html`, `review/` |
| `library/<책id>/book.json`, `library/catalog.json` | 빌드 결과 (직접 수정 금지) |

- 책id: `g<학년>s<학기>-<과목영문>` — 예: `g1s2-science`. 과목영문: 국어 korean, 영어 english, 수학 math, 과학 science, 사회 social, 역사 history, 도덕 ethics, 기술·가정 tech-home, 정보 info, 한문 hanmun
- 단원id: `u<번호>` — 예: 2단원 → `u2`. 문항 id: `<단원id>-<슬롯>-<a,b,c…>` — 예: `u2-Q03-b`
- 책이 처음이면 `meta.json`을 만든다(학년·학기·과목). 과목 색은 앱 기본값을 쓰므로 생략 가능.

## 진행 순서

### 0단계 · 준비
1. `materials/…/<단원>/`에 자료가 있는지 확인. 없으면 넣을 위치를 안내하고 멈춘다.
2. 사진은 Read로 직접 읽고, PDF는 `pdf` 스킬. 판독이 안 되는 부분은 추측하지 말고 사용자에게 확인.
3. 기존 단원이면 보강 모드로 진행할지, 새로 만들지 확인한다(덮어쓰기 전 확인).

### 1단계 · 핵심 정리 → `notes.md`
발표·시험·오답풀이의 **공통 원본**. 모든 사실에 출처 쪽수. 원문에 없는 내용 금지.
`## 단원 개요 / ## 핵심 개념(정의·설명·예시·출처) / ## 꼭 외울 것 / ## 헷갈리기 쉬운 것(비교표) / ## 자주 하는 오해 / ## 시험 포인트`

### 2단계 · 내신 시험화 → `blueprint.json`
`exam-designer` 에이전트 호출 (notes.md, materials, past-exams 경로 전달). 슬롯·배점·난이도·`variantsPerSlot`이 정해진다.

### 3단계 · 문제 은행 출제 → `questions.json`
`study-quiz` 스킬. 슬롯마다 `variantsPerSlot`개 이상의 **서로 다른** 변형 문제. 그림·자료(SVG)를 적극 활용한다.

### 4단계 · 오답풀이 작성
`study-explain` 스킬. 모든 문항에 상세 풀이·보기별 해설·자주 하는 오답·기억할 점·**참고 자료(refs)**를 채운다.

### 5단계 · 요약 정리 → `slides.html`
`frontend-slides` 스킬. 고정값: High density / reading-first, 입력은 notes.md, Vercel 배포·PDF 변환은 쓰지 않음. 스타일은 `config/slide-style.md`(없으면 첫 실행 때 정해 저장). 한글 글꼴 사용.

### 6단계 · 빌드 검사
`python engine/build_library.py <책id> --check-only` — `✖`가 없을 때까지 3·4단계로 돌아가 고친다.

### 7단계 · 4중 검수 (만장일치)
1. `review-format`, `review-content`, `review-overall`, `review-explanation` 네 에이전트를 **한 번에 동시에** 호출. 서로의 결과는 전달하지 않는다.
   - 전달: 책id·단원id, materials 경로, `library/<책id>/<단원id>/` 경로, past-exams 경로(있으면), 라운드 번호. 보강 모드면 새로 추가된 문항 id 목록도.
2. 보고서를 `library/<책id>/<단원id>/review/round-<N>-<format|content|overall|explanation>.md`로 저장.
3. **넷 모두 `VERDICT: PASS` → 통과.** 하나라도 REJECT → 되돌림 후 N+1 라운드. **횟수 제한 없음.**
   - **예외 (사용자 지정 규칙):** `review-overall`이 REJECT여도 지적 사항이 **난이도에 관한 것뿐**(난이도 표시의 타당성, 변형 간 난이도 차이, 상/중/하 체감)이면 통과로 본다. 이때 그 지적은 고치지 않고 `review/changelog.md`에 "난이도 참고"로 기록만 한다. 난이도 외의 지적(답 노출, 개념 중복, 변형 복제, 설계도 위반, 선택지 구성 결함 등)이 하나라도 섞여 있으면 평소처럼 반려한다.

### 되돌림 규칙
| 되돌릴 곳 | 처리 |
|-----------|------|
| `notes` | notes.md 수정 → 영향받는 문항·풀이·슬라이드도 수정 |
| `blueprint` | `exam-designer`에 지적 전달 → 바뀐 슬롯 문항 재출제 |
| `quiz` | `study-quiz`로 **지적된 문항만** 수정 |
| `explain` | `study-explain`으로 **지적된 문항의 풀이·참고 자료만** 수정 |
| `slides` | slides.html 해당 부분 수정 |
| `user` | 쟁점과 원문 근거를 보여 주고 사용자 결정 |
- 검수자끼리 반대되는 지적은 원문을 다시 확인한다. **같은 쟁점이 두 라운드 연속 해결되지 않으면** 사용자에게 결정을 받는다(교착 해소용, 횟수 제한 아님).
- 수정마다 `review/changelog.md`에 한 줄씩 기록.

### 8단계 · 빌드 · 배포 · 확인
1. `python engine/build_library.py <책id>` → `book.json`, `catalog.json` 생성
2. 로컬 확인: study 폴더에서 `python -m http.server` → 책장에 책이 보이고, 새로운 시험 보기·오답풀이·참고 자료가 정상 표시되는지 확인
3. 커밋 후 push (materials는 .gitignore로 제외). 1~2분 뒤 Pages 반영
4. 보고는 짧게: 은행 문항 수(슬롯×변형), 검수 통과 라운드 수, 사용자 판단 쟁점, 주소

## 주의
- 저장소와 사이트는 **공개**다. 교과서 문장·그림을 그대로 옮기지 말고 요약·재구성한다. 교과서 사진은 SVG로 **새로 그린** 자료만 쓴다. `materials/`는 절대 커밋하지 않는다.
- 이름·학교 등 개인정보를 결과물에 넣지 않는다.
- 중간에 멈추면 진행 상황을 `review/changelog.md`에 남겨 이어서 할 수 있게 한다.
