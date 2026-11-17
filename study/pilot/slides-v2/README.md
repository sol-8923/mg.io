# 슬라이드 v2 시범 (과학) — 2026-11-17

기존 `library/*/slides.html`은 **그대로 두고**, 같은 내용을 새 방식으로 분해·조립해 본 시범이다. 앱에는 연결되지 않는다.

- 만들기/확인: `python engine/slides_v2.py extract|build|compare g1s2-science [단원…]` (사용법은 스크립트 머리말)
- 구조: `g1s2-science/template/`(공통 뼈대·스타일) · `assets/`(공통 그림) · `u4/slides.v2.json`(목차) · `u4/slides/sNN.html`(슬라이드 본문 조각) · `u4/figures/*.svg`(내용 그림 한 개당 파일 하나)
- 조립 결과: `out/g1s2-science/uN.html` (Pages 주소 `…/study/pilot/slides-v2/out/g1s2-science/u4.html`)
- 시범 결과: 조립 결과가 기존과 u4·u5는 글자 하나까지 동일, u6·u7은 본문 동일(공통 스타일에 `.lb` 규칙이 더 들어 있는 차이만).
- 빌드 점검: 자리표시자 누락, 그림 XML 형식, `<section>` 짝, 장수 예산(10~12장), 그림 글자 잘림·박스 겹침(기존 SVG 점검기 재사용).
