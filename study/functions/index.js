/* 가족 채팅 푸시 알림: chat 문서가 새로 생기면 보낸 사람을 뺀 다른 가족의 기기(chattokens)로 알림을 보낸다. */
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
initializeApp();

const NAMES = { dad: '아빠', mom: '엄마', min: '민겸' };
const LINK = 'https://sol-8923.github.io/mg.io/study/#/chat';

exports.notifyChat = onDocumentCreated(
  { document: 'chat/{id}', region: 'asia-northeast3', memory: '256MiB', maxInstances: 3 },
  async (event) => {
    const d = event.data && event.data.data();
    if (!d) return;
    const db = getFirestore();
    const snap = await db.collection('chattokens').get();
    const targets = snap.docs.filter((x) => x.data().who && x.data().who !== d.who);
    const tokens = [...new Set(targets.map((x) => x.data().token))];
    if (!tokens.length) return;
    const text = d.text ? String(d.text).slice(0, 80) : '사진을 보냈어요';
    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: '가족 채팅', body: (NAMES[d.who] || '가족') + ': ' + text },
      webpush: { notification: { tag: 'mg-chat', renotify: true }, fcmOptions: { link: LINK } },
    });
    // 더 이상 쓸 수 없는 기기 번호는 정리한다
    const bad = new Set();
    res.responses.forEach((r, i) => {
      const code = (r.error && r.error.code) || '';
      if (!r.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test(code)) bad.add(tokens[i]);
    });
    await Promise.all(snap.docs.filter((x) => bad.has(x.data().token)).map((x) => x.ref.delete()));
  }
);
