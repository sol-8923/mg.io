/* 민겸이 공부 공간 설정
 *
 * 아빠·엄마 알림을 모든 기기(폰·탭)에서 함께 보기 위한 Firebase(Firestore) 정보.
 * apiKey는 공개돼도 되는 프로젝트 식별값이고, 실제 접근 범위는 Firestore 보안 규칙이 정한다
 * (notices/dad, notices/mom 문서의 text·updatedAt만 읽기/쓰기 허용, 300자 제한).
 * 일정(plan/routine, plan/events, plan/todos)도 같은 방식이며 규칙은 README의 '우리 집 일정' 항목 참고.
 * 비우면(firebase: null) 알림은 글을 쓴 기기에만 저장된다.
 */
window.MG_CONFIG = {
  firebase: { projectId: "mg-study", apiKey: "AIzaSyBISC0B66JrWv-TNqG3zFTphLFT5Ea_LSI", appId: "1:905539239303:web:d40dc31575073f4998e722", messagingSenderId: "905539239303" }
};
