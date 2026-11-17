# u5 changelog (Lesson 5. Art for All)

## S1b 제작 (2026-11-17)
- 산출물: blueprint.json(17슬롯: 객관식 13 + 서술형 4, 변형 2, 67점) · questions.json(34문항) · gen.py(`python drafts/g1s2-english/u5/gen.py`로 재생성) · 이 파일.
- 규칙 근거: `docs/subjects/영어.md` 0절(기출 유형), `docs/출제-반려-예방.md` §10, unit-builder S1b. notes는 동결 상태 그대로 두고(수정 없음) '출제 근거로 쓰면 안 되는 항목'(지도서·교사용에만 있는 내용, p83 시계 선택지·사다리, p93 연결 정답, 듣기 스크립트 정답)은 정답 근거로 쓰지 않았다. will의 3가지 쓰임·few/a little 구분표·시각 읽기 등 지도서 전용 문법 설명도 출제·해설에 쓰지 않았다.
- 서술형은 선택형 확정 뒤 `engine/avoid_motifs.py` 출력(이름·소재·정답 문장)을 받아 S01~S04의 `avoidMotifs`에 적고, 겹치지 않는 문장·지문으로 설계했다. 서술형 오류 유형(S03)은 선택형 오류 유형(will to·will be not·looks like very big·a few+단수·was)과 겹치지 않게 다른 유형(3인칭 단수·be going to/Let's 뒤 동사원형·감각동사+형용사·시제)으로 골랐다.

## 기출 편입 판정 (past-exams.md의 단원 u5 행 = 2025-2학기-기말-09 하나)
- **판정: 편입(원문 그대로) — Q09 변형 a.** `origin:"past-exam"`, `pastExamRef:"2025-2학기-기말-09"`, 학교 정답표와 같은 정답(③ 질문과 응답 불일치: A: What would you like to learn? / B: Oh, that sounds fun!).
- 판단 근거: ① 문항 안의 다섯 대화만 보고 풀리고(지문 불필요) 응답이 질문과 어긋난 것은 ③ 하나뿐이라 교과서와 무관하게 정답이 하나로 수렴한다. ② ①·②는 교과서 p.80·p.82의 계획 묻기·말하기(What are you going to do ~? / I'm going to ~, be going to), ④는 p.83의 제안 How about ~?, ⑤는 p.85의 동의 표현(Me, too)과 같은 계열이라 해설을 학생용 교과서 쪽수로 쓸 수 있다.
- **정답 근거가 약한 곳(숨기지 않고 표시)**: ③의 What would you like to learn?·④의 I'd like to try ...·⑤의 I think ... / I feel the same은 학생용 교과서에 없는 표현이다. 그래서 해당 해설에 '(대화 속 표현은 교과서 밖 일반 상식)'을 붙였고, 정답 ③은 교과서 문장이 아니라 '질문이 묻는 것과 응답 내용이 맞는지'라는 대화 자연스러움으로 설명했다. 검수에서 '교과서 근거 부족'으로 반려되면 기출 2라운드 폐기 규칙에 따라 Q09 변형 a를 빼면 된다(변형 b가 같은 슬롯의 새 문항으로 남는다).
- 기출 원본과 다르게 수정: 발문의 강조 표시([[어색한]])와 '(4점)'만 제거(배점은 앱이 배점 칩으로 보여 줌). 선지 대화 원문·번호 순서는 원문 그대로(정답 번호 ③ 유지).
- 나머지 `범위밖` 기출은 편입하지 않았고, 0절의 문형·배점·난이도·서술형 유형만 반영했다(두 단어 관계·공통 빈칸·구동사·영영 풀이·'쓰임이 나머지와 다른 것'·어법 조합형·단어 배열 N번째·어색한 대화·(A)~(E) 순서·내용 일치·답할 수 없는 질문·흐름상 어색한 문장, 서술형 영작·오류 4개 고치기·글에서 단어 찾기).

## 점검 결과
- `PYTHONIOENCODING=utf-8 python engine/gate.py g1s2-english u5 --drafts`: build ✖0·⚠0, precheck ✖0·⚠0, b_scan 0, 종료 0(통과). (gate가 `units.md`의 쪽 범위 표를 읽지 못한다는 안내를 내므로 `precheck_unit.py --pages 80-95 --src units/u5_교과서.txt`도 따로 돌려 ✖0·⚠0 확인.)
- `python engine/coverage_check.py g1s2-english u5 --root drafts`: 문항 커버 166/187 = **89%**(≥85%). 미커버 21개와 사유:
  - 표 머리말·구조 항목(문항으로 물을 개념이 아님): 단원 번호·이름, Art for All, 단원 소재, 문화(Culture to Culture p.93은 검색 활동이라 출제 근거 아님), 불일치 핵심, 빈칸 어휘 후보, 출제 근거로 쓰지 않는다, 동사에 -s를 붙인다?, 거의 없다?, "모든 도시 사람들(자주 하는 오해 문장의 따옴표 조각)
  - 지도서·교사용 근거라 출제하지 않음(동결 notes의 '출제 근거로 쓰면 안 되는 항목'): a little(수량형용사 비교표), 합성어(교과서 외 참고), 전치사 in(지도서 구문 해설), 듣기 스크립트 항목(Listen and Number·Listen and Check·Listen and Choose, Blue Boys 콘서트, 영화관 앞, Real Life Talk 영상, Grand Park, 한 예술가)
  - 의사소통 기능 ①·②, 시간 약속 정하기는 Q10 refs 표 제목에 넣었으나 gate의 표기 변형(원문자·띄어쓰기)으로 미커버 집계될 수 있음(내용은 Q09·Q10·Q12·S02에서 출제).
- 정답 번호: 변형 a 5·2·4·1·5·3·2·4·3·1·5·2·4(①2 ②3 ③2 ④3 ⑤3), 변형 b 3·1·5·2·4·2·1·3·5·4·3·5·2(①2 ②3 ③3 ④2 ⑤3), 각 변형 3연속 없음, 정답이 단독 최장인 문항 0.
- 직접 검색: 서술형 모범 답안·조건 낱말(will 영작 문장, be going to·many/a few 문장, 오류 정정 단어, 글에서 찾는 travels/reads/walks/sings)이 선택형 발문·지문·보기에 나오지 않음을 확인(선택형 오답 보기의 will/a few 오류 문장은 서술형 정답과 다른 문장).

## 알려진 약한 곳 (검수 참고)
- Q09 변형 a(기출): 위 '정답 근거가 약한 곳'. Q01 변형 b의 private, Q05 변형 b의 동사 like, Q01 변형 a의 quick/slow/happy 짝은 교과서에 없는 일반 상식이라 해설마다 '(교과서 밖 일반 상식)' 표시.
- Q01 a의 huge–giant 유의어는 교과서가 유의어로 제시한 것이 아니라 본문 쓰임(p.87 a giant red ball, p.88 a huge beach ball)에서 같은 뜻으로 쓰인 것으로 설명했다(notes '참고' 표시와 일치).
- Q11·Q12는 교과서 읽기 본문(p.87~p.89)과 p.84 포스터(Robot Show·Ice Show 시각·장소)의 사실을 새로 풀어 쓴 짧은 글·대화다(문장 그대로 옮기지 않음). 대화 스크립트(듣기 원문)는 근거로 쓰지 않았다.

## 검수 1라운드 수정 (2026-11-17)
바뀐 문항: u5-Q02-a/b, Q04-a/b, Q07-b, Q08-b, Q09-a, Q10-a/b, S01-a/b, S02-a/b, S03-a/b, S04-a/b (id·유형·배점·정답 번호·변형 구조는 그대로, gen.py 수정 후 재생성).
- [A] 서술형 S01-a/b·S02-a/b: 소문항마다 우리말 문장을 passage에 추가(제목 '우리말과 주어진 단어'), 발문에 '주어진 단어를 순서대로' 조건을 넣어 어순이 하나로 확정. S01은 We'll·won't 축약형 인정을 발문·rubric tip에 명시. S02-a (2)는 설계도 intent를 '수영장에 아이들이 많이 있다'로 고쳐 실제 문장(children in the pool)과 일치시킴. 모범 답안·rubric은 그대로 우리말과 일치 확인.
- [B] Q02-a (1) 정답 time → light(불·전등 / 가벼운), Q02-b play → fly(날다 / 파리)로 교체. 새 정답 light·fly가 다른 슬롯 발문·지문·보기·해설·refs에 나오지 않음을 questions.json 전체 검색으로 확인(각각 자기 문항에만 있음). 같은 사유로 time·play 문장은 쓰지 않았다(time은 Q08-b·Q09-b·Q10·Q12에 필연적으로 나옴). 새 낱말은 교과서 밖 일반 상식이라 해설·refs·source에 표시. blueprint Q02 intent·facts·analysis·avoidMotifs 갱신.
- [B] Q02-a (2) 'This is the first time I saw...' 부자연스러운 영어: 문장 자체를 교체해 해소.
- [B] Q07-b ⓓ: 'until next Friday' → 'It won't be here after next Friday.'(일기 내용과 모순 해소, 정답 ⓐ·ⓒ 유지), detail 문장 맞춤.
- [B] Q10-b 발문 '(A)~(E)' → '(A)~(D)'(Q10-a는 (A)~(E) 항목 5개라 그대로).
- [B] S03-a/b·S04-a/b detail 끝: '허용 답안: 없음(모범 답안만 인정). 인정하지 않는 답: …'으로 변경.
- [B] Q09-a(기출): explanation·detail 3번째 줄·choiceExplanations에 '(What would you like to learn?은 교과서 밖 일반 상식)' 표시. 기출 보기·정답은 원문 그대로.
- [B] Q04-a/b refs[0]: 표 제목에서 영영 풀이를 빼고 열 이름을 '영영 풀이(이해를 돕는 풀이, 교과서 밖)'로 표시.
- 참고 반영: Q09-a tip을 질문–응답 불일치 함정으로 구체화, Q08-b source를 p.83으로(detail 근거와 일치), Q10-a detail '(A)으로'→'(A)로', S01 rubric tip에 won't·We'll 허용 문구.
- 점검: gate 통과(build·precheck ✖0, b_scan 0), review_diff 변경 id는 위 목록뿐(정답 번호·id·배점 불변).
- 마무리 정리(2026-11-17): 문체·표기 수준 정리. 바뀐 문항 Q04-a/b·Q09-a·S01-b·S02-a/b·S03-a/b·S04-a/b(S01-b 허용 답안 They'll 추가, S02 rubric·허용 답안 문구 명확화, Q09-a source 근거 표시, Q04 refs·detail 표기, S03·S04 채점 안내에서 〈조건〉 제외, S03 source·마침표 정리). 정답·id·배점·정답 번호 불변.
- 표본 감사 반영·확산 수정(2026-11-17): Q07-a 일기 passage ⓐ를 'I visited a street art festival with my friends today.'로 바꿔 시제 통일(정답 ②, 틀린 것 ⓑ·ⓓ 불변), 해설·보기 ② 해설의 'were(are)'→'were', ⓔ 근거 쪽을 p.89(took pictures of it)·p.91(a few + 복수 명사)로 정정, 관련 ⓐ 해설·tip·refs·source 정리. 새로 쓴 지문 표시 추가: Q03-a·Q07-a/b·Q11~Q13·S04. 정답·id·배점·유형·보기·발문 불변.

B4(2026-11-17): precheck ⚠ 4건 판정 — 고침 0, 무시 4(S03-a/b·S04-a/b는 발문에 '조건 낱말'을 쓰는 문항이 아니라 오류 고치기·글에서 낱말 찾기이고, detail에 형식·철자·허용/불인정 답안을 담은 '채점 안내'가 이미 있음).
