# g1s2-english u6 'Dream High, Fly High!' 변경 기록

## S1b (설계도·문항·해설) 2026-11-17
- 산출물: blueprint.json, questions.json, gen.py(변형 a·b 순서 호출, 정답 번호 배분표 고정). 슬롯 17(선택형 13 + 서술형 4) × 변형 2 = 34문항, 65점.
- 점검: gate 통과(✖ 0, b_scan 0), build_library --check-unit 오류 0·경고 0, precheck ✖ 0·⚠ 0.
- 커버리지(coverage_check, 문항 기준): 90/167 = 54%. 85% 미달 사유는 아래 '커버리지 미달 사유'.

## 기출 편입 판정 (past-exams.md 처리 표시는 바꾸지 않음)
| ref | 판정 | 사유 |
|---|---|---|
| 2025-2학기-기말-18 | 포함: u6-Q06-a | 접속사 when(~할 때) vs 의문사 When(언제). 학생용 p.107·p.108 근거, 정답 하나(⑤ When did he buy ...?). 원문 그대로 |
| 2024-2학기-기말-18 | 제외 | 정답 근거(① to get = 목적을 나타내는 부사적 용법)가 학생용 교과서에 없음(p.107은 목적어 용법 예문뿐). promised·hates도 학생용 쪽에 없음 |
| 2024-2학기-기말-19 | 제외 | 정답 ② hopes to learn의 hope는 교사용·지도서 목록에만 있음. 오답 ①·④의 should 부정·의문 어순은 L6 교과서 쪽 근거 없음 |
| 2024-2학기-기말-서8 | 제외 | 정답지 없이 직접 도출한 값. 빈칸 8칸만 있고 쉼표 위치 표시가 없어 When it is sunny, he always wears sunglasses / He always wears sunglasses when it is sunny 두 어순이 모두 가능해 모범 답안·채점 기준이 하나로 정해지지 않음. 같은 유형은 서술형 S01(쉼표 위치 표시)로 반영 |
| 2025-2학기-기말-14 | 제외 | ⓒ looks like, ⓓ practices dancing(동명사), ⓑ consider to studying은 학생용 L6 쪽에 근거 없음(practice는 p.107 활동 제목, dancing은 p.111 T/F 문장뿐. 동명사는 L6 언어 형식 아님). past-exams.md의 '정답 근거: practice dancing은 u6 교과서에 있음'은 notes와 맞지 않음 |
| 2025-2학기-기말-23 | 제외 | 정답 When I grow up의 grow up은 교사용·지도서 듣기 대본에만 있고, 미래 when절 현재시제 규칙은 지도서 22와 p.110 예시 하나뿐 |

## 기출 원본과 다르게 수정
- u6-Q06-a(2025 기말 18번): 발문 '다음 밑줄 친 when 중 ... (5점)'을 '다음 [ ]로 표시한 when 중 ...'으로, 보기의 밑줄 표시([[ ]])를 [ ]로 바꿨다. 이유: 앱이 밑줄을 표시하지 못하고(plain text) gate 규칙(R-E)이 '밑줄' 발문에 ㉠㉡ 표시를 요구해서 대괄호 표시로 통일했다. 보기 문장·정답은 원문 그대로. 배점은 슬롯 값(4점)을 따랐다(학교 5점).

## 설계도에서 정한 것
- 5점 문항은 Q07(어법 조합) 하나뿐. 기출 18번이 5점이었으나 Q06 슬롯은 4점으로 조정(영어.md 0-4 '5점은 어법 조합형 1개 이하').
- 서술형 avoidMotifs는 avoid_motifs 출력(선택형 이름·정답 문장·소재)을 반영했고, 서술형 이름은 Minho·Eric·Doyun·Yuri·Nari·Minsu·Jun으로 선택형과 겹치지 않게 했다.
- 변형 a·b: Q09만 a(바른 문장 고르기)와 b(단어 배열 3번째 단어)의 문형이 다르다. Q12는 a 영어 선지, b 한국어 선지.

## 정답 근거가 약한 곳(검수 참고)
- 어휘 뜻풀이(Q03 has two left feet·even, Q01·Q02의 파생·다의어): 학생용 쪽에는 영어 단어 상자만 있고 우리말 뜻은 교사용·지도서에 있다. 문항은 문맥(but, too 대비)과 학생용 p.111 Word Ace 낱말로 답이 가려지게 썼고, 학생용 쪽에 없는 파생(lucky·health 등)과 spend의 '돈을 쓰다'는 '(교과서 밖 일반 상식)'으로 표시했다.
- Q10·Q11(대화): 대본 전문 대신 새로 쓴 대화이고, 질문–대답 짝은 학생용 p.98·p.99·p.101 예문 구조에 근거한다. (A)~(E) 순서는 문장 내용으로 하나로 정해지게 썼다.
- Q07·Q08·Q09·S02·S04의 오류 문장: 바른 형태(to + 동사원형, when + 주어 + 동사, 3인칭 단수 -s)는 p.107 예문에 근거하지만 '규칙 문장' 자체는 학생용에 없다. 문항은 오류 유형을 묻되 근거는 예문 쪽으로 적었다. 같은 문법 형태가 여러 슬롯의 오답·오류 문장에 반복된다(정답으로는 반복하지 않음).

## 커버리지 미달 사유 (54%, 목표 85% 미달)
- 개념 후보 167개 중 80개 미커버. 대부분 notes의 소제목·메타 표제(단원 소재, 의사소통 기능, 언어 형식, 학습 목표, 단원 구성, 자주 하는 오류, 일반 설명, 시험 포인트 소제목들)로, 문항에 나올 수 없는 낱말이다(약 35개).
- 출제 근거로 쓰면 안 되는 항목(듣기 대본 전용: Not anymore, grow up, still, at the time, recommend, make a movie, Of course, How about + 동명사, Real Life Talk 등 / 지도서 전용: hate, interests, clothing, 미래 현재시제, 발음 / 뜻풀이 자료 없음: solve puzzles)은 일부러 출제하지 않았다(약 25개).
- 나머지는 활동 이름(Listen and ..., Culture to Culture, Project)·본문 요약 문구(매일 인형 옷을 갈아입혔고 등)로, 선택형 13슬롯 규모에서는 모두 다루지 못했다.

## 검수 1라운드 수정(2026-11-17)
- [A] S02-a (4): 'Last summer, when it was sunny, we ride our bikes.'로 시점을 확정(was→is 불가), rubric에 불인정 명시. S02-a (1)은 Q09-a와 겹치는 틀을 'My uncle loves to played soccer on weekends.'(played→play)로 교체.
- [A] S02-a (2)·S02-b (2): 주어를 고유명사(Somin/Minjun)로 바꾸고 'these days'를 넣어 복수화·과거(liked/played) 정정을 막음. detail·pitfalls·rubric 문구 정리.
- [A] S02-a (3): 'He drives a bus every day.'를 덧붙여 직업 의미를 확정, rubric에 for·with 불인정 사유 명시.
- [B] 정답 노출: Q12-a 지문 'fell in love with baking'→'started to love baking', Q12-b 지문 'takes care of'→'looks after', Q11-b (B) 'taking care of animals'→'helping animals'(Q04-a의 with·of 정답이 다른 슬롯 본문에 안 나옴, 직접 검색 확인). Q04-b도 같은 방식으로 점검해 노출 없음.
- [B] S03-b (1): 요약문을 'Jun (1) ______ with his brother every evening.'으로 바꿔 loved 배제, rubric에 사유 기재.
- [참고] Q01-a detail에 tradition·snow–snowy·power–powerful '교과서 밖' 표시. 'Jack likes…'·'Bill wants…' 출처를 '(p.107 연습 문항)'으로 정정(학생 화면에 '지도서' 금지라 지도서 정답이라는 사실은 여기에만 기록; Q07-a·Q09-a·S01-a/b·S02-a/b·S04-a).
- [참고] Q03-a/b·Q06-b·Q08-a/b·Q10-a 오답 해설의 반복 끝 문장을 보기별 구체적 이유로 다듬음.
- [참고] blueprint Q04 intent·facts를 실제 문항(take care of / fall in love with / in front of)과 일치시킴, analysis의 학교명을 '학교 기출'로 바꾸고 서술형 이름에 Somin·Minjun 추가.
- [참고] 빠짐없음 보강: Q07-b ⓔ를 '[When I become] a doctor, I will help many people.'(미래 내용 when절의 현재시제, p.110 예시 근거)로 교체(정답 ⓑ,ⓒ,ⓔ·배점 유지). when절 위치·쉼표는 Q06·Q09 기존 참고 카드로 이미 다룸.
- 점검: gate 통과(✖ 0, precheck 0, b_scan 0), review_diff 바뀐 19문항(id·유형·배점·정답 번호 분포 불변).
- 마무리 정리(2026-11-17): 문체·표기 수준 정리. 바뀐 문항 Q07-b(source p.110)·S02-a/b(단어 교체 답 불인정 문구)·S03-b(내용 불일치 낱말 불인정), blueprint Q07·S02 intent·facts 보강. 정답·id·배점·정답 번호 불변.
- 표본 감사 반영·확산 수정(2026-11-17): 쪽수 근거 정정 Q05-a/b·Q06-b(인용 뒤에 실제 쪽 p.107 표기)·Q08-b(p.99·p.105 구분). Q12-a '교과서 밖 창작' 표시·source 정정, Q12-a/b refs의 무관한 '세 사람' 카드 삭제. S03-a/b·Q10~Q13·Q08-a/b 새로 쓴 글/대화 표시, S03 쪽수 근거 제거, S02-a/b 'When Rahul was ...' 줄임 표기를 p.104 실제 문장으로, Q01-b 교과서 밖 짝 규칙 표시. 'Jack likes to ride…'·'Bill wants to play with the dog'는 p.107 연습 문항 완성문으로 표기 유지. 정답·id·배점·유형·보기·발문 불변.

B4(2026-11-17): precheck ⚠ 0건 — 고침 0·무시 0(수정 없음; quote_page_check 7건은 p.107 연습 문항 완성문으로 의도적 허용).
