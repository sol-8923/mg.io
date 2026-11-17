# g1s2-english u7 changelog (S1b)

## 2026-11-17 S1b 제작
- 산출물: `blueprint.json`, `questions.json`, `gen.py`(생성 스크립트). 선택형 14슬롯 + 서술형 4슬롯 = 18슬롯 × 변형 2 = 36문항, 70점(객관 54 + 서술형 16).
- 기출: past-exams.md에 단원id u7 행이 없어 편입 없음. 범위 밖 기출은 편입하지 않고 영어.md 0절의 문형·배점·난이도·서술형 유형만 반영했다(past-exams 처리 표: 해당 없음).
- 순서: 선택형 28문항을 먼저 확정 → `avoid_motifs.py` 출력(이름·정답 문장·핵심 명사구)으로 서술형 `avoidMotifs`를 적고 서술형 소재(Sora·Kevin·Jenny·Sam·Jisu·Yena·Jun, 쓰레기·우산·영화·모자·기차)를 선택형과 겹치지 않게 정했다.
- 정답 번호 배분: 변형 a ①3 ②3 ③3 ④3 ⑤2, 변형 b ①3 ②2 ③3 ④3 ⑤3, 3연속 없음, 정답이 단독 최장인 선택형 0.

## 설계 판단
- 지문은 모두 새로 쓴 짧은 글이다. Q12 두 변형만 교과서 본문 줄거리(p.119~121)를 다시 쓴 요약이고(문장은 새로 씀), 다른 지문은 교과서와 다른 사례(용돈 일기·꽃가게·저금)다.
- 같은 시험지에서 다른 슬롯 정답이 새지 않도록 지문·보기에서 아래 표현을 피했다: show up, one by one, work up a sweat, in the end, pay for, take responsibility for, be proud of, mad at, spend ... on, play catch, harder(Q02·Q03·Q04 정답), I'm looking for / I'll take it / too expensive(Q11 정답), reward·broken·accidental·replied(S04 정답). Q12·Q13·Q14 지문은 같은 뜻의 다른 표현(cover the cost, upset, returned, Finally 등)으로 썼다.
- 기능 대화 문항(Q09·Q10)은 Q11 정답 표현을 직접 쓰지 않고 need/want/buy/costs too much로 구성했다.
- 가격·숫자 표기는 notes 그대로(`$1,000`, `$20`, `$90`, 40 dollars 등).

## 출제 근거로 쓰지 않은 것(지시 목록)
seller·shopper, choice·sign·sneakers·latest, after all 등 in the end의 비슷한 표현, '자주 하는 오류' 표의 교과서 밖 예문·혼동 주의·대화 순서 배열 정리, thrown·bring의 to 그룹·must not, Tic-Tac-Toe T/F 정답, 듣기 스크립트·More Questions·Practice·After You Read 정답. 대화에 필요한 내용은 모두 문항 안에 넣었다.

## 교과서 밖 일반 지식·약한 근거(검수 참고)
- Q01: cost·angry·high·low·open·close·big·small 등 교과서 밖 기초 어휘(detail에 표시). 유의어/반의어 관계 문항이라 근거가 교과서 쪽이 아닌 일반 어휘 지식이다.
- Q05·Q06: 3형식 to 쓰임은 교과서 p.121(gave 40 dollars to ...)에서만 직접 보이고, 4형식에 전치사를 넣지 않는다는 규칙은 p.123 예문(어순)에서 추론하는 일반 문법이다.
- Q07·Q08: don't have to(p.123 cf.)·had to 의무 해석은 일반 문법 지식에 기댄다(had to는 학생용 p.123에 없음, 해설에 과거형으로만 언급).
- Q12-b: 속담 'Money doesn't grow on trees'의 뜻은 해설에서 '(교과서 밖 일반 상식)'으로 표시.
- S03: How about + 동명사(p.120)·want/decide + to부정사(p.121)·과거진행형(p.119)·has to(p.123)는 학생용 지면 예문에 근거. 4형식 전치사 오류는 위와 같다.

## 점검 결과
- gate: ✖ 0, ⚠ 0, b_scan 0 (종료 0). 단, gate가 `drafts/g1s2-english/units.md` 표에서 쪽 범위를 읽지 못한다는 안내를 출력해 precheck가 쪽 범위·원문 인용 대조 없이 실행됐다(엔진·docs 미수정, 코디네이터 확인 필요).
- coverage_check: 문항 커버 92/187(49%). 미커버 95개 중 대부분은 개념 추출기가 notes의 차례·소제목·표 머리·참고 예문까지 개념으로 잡은 것이다(아래 분류). 분류 제외 후 출제 가능 개념 기준 약 88%.
  - 구조·메타 38개(단원 소재, 단원 구성, Warm Up, Language Use 등 차례·시험 포인트 항목명) — 문항 소재가 아님.
  - 출제 근거 금지·교사용/지도서 전용 35개(choice, latest, sign, sneakers, seller, shopper, crash, a pair of, fitting room, another, on sale, allowance, 축약형, 큰 숫자 읽기·thousand·million, to/for를 쓰는 동사, 의문문·will have to, must not, find, Practice 정답, 듣기 정답·Tic-Tac-Toe T/F 등).
  - 교과서 밖 참고용 오류 표 예문 9개(I have to pays, to paying, Susan have to ~, He has to went 등).
  - 한국어 요약 문장이라 문자열이 안 맞는 본문 사실 6개(창문 깨뜨림·포스터·은행에 넣기 등)는 Q12·Q14에서 영어로 다루었다.
- 정답 근거가 약하거나 A급이 의심되는 곳: 위 '교과서 밖 일반 지식' 항목(Q01, Q05·Q06, Q07·Q08)과 Q02-a의 오답쌍(in the end – 처음에: 정답이 '틀린 짝'이라 학생이 at first와 구분해야 함). 나머지는 지문·문장 안에서 정답이 하나로 정해진다.

## 검수 1라운드 수정(2026-11-17)
- [B] S03-b (4) 정답 노출: Q06-b 정답과 같은 to 오류("Jun told to us ...")를 has to 뒤 동사원형 오류("Jun has to meets his coach after school." → meet)로 교체. blueprint S03 intent·facts·avoidMotifs·analysis도 함께 고침. 허용 답안(told ~ to us) 삭제.
- [B] Q08 정답 노출 완화: Q08-a ⓒ "told to her the plan" → "told the plan her"(어순 오류), Q08-b ⓑ "showed to his mom the bike" → "showed the bike his mom"(어순 오류). 4형식에 to를 넣는 틀은 Q06-b에만 남음. 정답 조합(Q08-a ⓒ,ⓓ / Q08-b ⓐ,ⓑ)과 번호는 그대로. 어순 오류는 Q06-a 틀과 겹치지만 Q06-a 정답은 숫자+이름 순서라 형태가 달라 남김.
- [B] S01-a/b 채점 모순: 3형식(to 추가) 답안은 4형식 조건·'단어를 더하지 않음' 조건을 모두 어겨 1번·3번 항목 0점(2점)으로 통일하고 rubric·detail에 명시. "허용: 대소문자만 올바르면 인정" 문구 삭제.
- [B] S01-b detail "벤이" → "케빈이".
- [B] Q10-b ④ 해설·tip·refs[0]: (C)에 shoes가 이미 있으므로 대명사 이유를 버리고 "(A) 가격 질문 바로 뒤에 (D)가 아닌 (E) 권유가 와서 질문과 대답이 어긋난다"로 수정, tip·refs·detail 끝 문장도 '질문 바로 뒤에 대답이 오는지'로 통일.
- [B] Q07-b: ⑤ had to가 p.123에 없음을 detail·보기 해설·refs 카드에 '교과서 밖 일반 문법'으로 표시, 발문을 "의미가 나머지와 다른 것"으로 변경(정답 유지). Q07 보기 주어를 Q08과 겹치지 않게 변경(Q07-b You→They, Q07-a I→Min).
- [B 참고급] Q03-b 오답 해설: do·take·get마다 다른 이유로 다시 씀(do the laundry류 / take a bus·take two hours / get a gift·get angry). Q03-a·b 교과서 밖 용법(rained very hard·열심히·play the guitar)을 detail에 '교과서 밖'으로 표시.
- [B] Q02↔Q04: Q02-a 보기 pay for → try on, Q02-b 보기 take responsibility for·be proud of → one by one·agree로 교체(Q02 정답 in the end–처음에 / show up–사라지다는 유지). Q04 정답 전치사 구가 Q02 참인 보기에 더는 안 나옴. blueprint Q02 facts·intent도 갱신.
- [참고→반영] S02-a answerHint (2)를 doesn't have to로 줄이고 S02-a/b modelAnswer에 인정(분리형 take the trash out, does not 비축약, 문법에 맞는 어순 변경)·불인정(must·need 등, 주어에 틀린 don't/doesn't) 명시, 조건문 '단, doesn't는 쓸 것'(a)·'단, don't는 쓸 것'(b). S03-a/b modelAnswer에 인정 범위(한 곳만 고쳐 뜻·시제 유지)와 불인정 예(buy·save 삭제, 문장 바꿔 쓰기)를 명시하고 (2) rubric에 반영.
- [참고→반영] Q12-b detail "번 돈 40달러" → "모은 돈 중 40달러", Q12-a "the posters" → "some posters", Q04-a ③ 해설 "이 뜻으로는 쓰지 않아요", S04-a detail "Mom이 한 말" → "어머니가 한 말", Q14-a '오빠(남동생)' → '남자 형제'.
- Q04-a detail에 be proud of를 풀어 써서(해설 한정) coverage 개념 'be proud of'가 계속 잡히게 함.
- [빠짐없음 보강] 새 슬롯 Q15(선택형 4점·중·변형 a·b, 지칭·의미 파악) 추가: a = 새로 쓴 지문(깨진 꽃 화분)에서 this won't be their last broken pot의 this가 가리키는 것(정답 ⑤, 근거 p.119 this ... last broken window), b = 새 대화에서 Kids will be kids.의 의미(정답 ②, 근거 p.119 '의미를 말해 봅시다'). 총 19슬롯 38문항 74점(객관 58 + 서술형 16), 정답 번호 변형별 ①~⑤ 각 3개·3연속 없음. blueprint 슬롯·facts·intent·types·difficulty·concepts·totals·analysis 갱신. 다른 슬롯 정답·본문과 겹치는 낱말 직접 검색으로 없음 확인.
- 점검: gate ✖ 0·⚠ 0·b_scan 0(종료 0), coverage_check에서 '지칭·의미 파악' 개념 문항 커버, review_diff --diff 바뀐 문항 22개(Q02·Q03·Q04-a·Q07·Q08·Q10-b·Q12·Q14-a·Q15 신규·S01~S04-a).

## 검수 2라운드 수정(2026-11-17)
- [B] u7-Q15-a 정답 노출: 지문·보기의 broken/깨진 짝을 없애 "But this won't be the last pot to fall."·보기 ⑤ '방금 떨어진 꽃 화분'으로 다시 씀(정답 ⑤·지칭 대상 유지, 오답 해설도 '떨어진'으로 정리).
- [B] u7-Q15-a 쪽수 오류: this won't be their last broken window는 p.121이므로 source·detail·refs 카드·blueprint facts·intent의 p.119를 p.121로 수정(Q15-b Kids will be kids p.119는 유지). detail은 짧은 인용(... window)만 사용.
- [B] u7-Q07-a ②: Min has to clean his room. → Min has to go to bed early.(S03-a (4) has to clean 틀과 겹침 제거, 정답 조합·번호 유지).
- [참고→반영] Q08-b tip을 "4형식에서는 사람 → 물건 순서"로 바꿔 3형식(to)과 부딪치지 않게 함.
- [참고→반영] 서술형 채점 안내를 문항별로 분기: 인정 답안이 있는 S02·S03만 "인정 답안도 정답", S01은 3형식이 허용 답안이 아니라 부분점수(2점)임을 명시, S04는 허용 답안 문구 삭제.
- [참고→반영] S02-a/b 조건문을 "doesn't(does not)"·"don't(do not)"로 정리해 modelAnswer 인정 답안과 맞춤.
- [참고→반영] Q07-b 발문에 "의무/필요 여부에서"를 넣어 기준을 분명히 함(정답 ③ 유지), blueprint intent 동기화.
- [참고→반영] Q12-b detail: 속담 문장은 p.121에 있고 뜻 풀이만 교과서 밖 일반 상식으로 표기.
- 마무리 정리(2026-11-17): 문체·표기 수준 정리. 바뀐 문항 Q08-b(tip 중복 제거)·Q15-a(오답 ③ 해설)·S02-a(does not 언급)·S03-a/b·S04-a/b(채점 안내를 철자·대소문자 감점으로), blueprint S04 intent 정리. 정답·id·배점·정답 번호 불변.
- 표본 감사 반영·확산 수정(2026-11-17): Q01-a 다섯 쌍의 교과서 밖 일반 어휘 표시(교과서 근거는 price·spend·save뿐), Q01-b 같은 방식 표시, Q08~Q15·S04 새로 쓴 글/대화 표시(Q12는 p.119~121 이야기를 바꿔 쓴 글, Q09-b·Q10-b는 May I help you? 교과서 밖 표시). 정답·id·배점·유형·보기·발문 불변.
