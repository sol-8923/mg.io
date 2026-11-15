/* 가족 채팅 푸시 알림: chat 문서가 새로 생기면 보낸 사람을 뺀 다른 가족의 기기(chattokens)로 알림을 보낸다. */
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
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
    // 용량 계산용으로 글 크기(바이트)를 문서에 기록해 둔다 (청소 함수가 사진을 다시 읽지 않아도 되게)
    await event.data.ref.update({ sz: Buffer.byteLength(JSON.stringify(d)) }).catch(() => {});
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

/* ───── 채팅 청소: 두 가지 조건 ─────
 * ① 90일이 지난 글은 지운다.
 * ② 저장 용량이 Blaze 무료 한도(1GiB)의 85%에 이르면, 가장 오래된 글부터 지워 40%까지 줄인다.
 * 용량은 글 크기(sz) + 글당 색인 여유분으로 추정한다(정확한 청구 용량과는 다를 수 있다). 매일 새벽 4시(서울). */
const GIB = 1024 ** 3;
const FREE_LIMIT = 1 * GIB, HIGH = 0.85, LOW = 0.40, KEEP_DAYS = 90;
const BASE_BYTES = 5 * 1024 * 1024;   // 다른 문서(일정·알림 등)와 기본 여유
const INDEX_BYTES = 6 * 1024;         // 글 하나당 자동 색인 여유
const UNKNOWN_SZ = 20000;             // sz가 아직 없는 옛 글의 추정 크기

/* docs: 오래된 순 [{sz}], 반환: 지울 개수(앞에서부터). 순수 함수라 따로 시험할 수 있다. */
function planDeletion(docs, baseBytes, limit, high, low) {
  let total = baseBytes + docs.reduce((a, d) => a + d.sz, 0);
  if (total < limit * high) return { count: 0, before: total, after: total };
  const before = total; let n = 0;
  while (n < docs.length - 1 && total > limit * low) { total -= docs[n].sz; n++; }
  return { count: n, before, after: total };
}
exports.planDeletion = planDeletion;

async function deleteRefs(db, refs) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

exports.cleanupChat = onSchedule(
  { schedule: '0 4 * * *', timeZone: 'Asia/Seoul', region: 'asia-northeast3', memory: '512MiB', timeoutSeconds: 540, maxInstances: 1 },
  async () => {
    const db = getFirestore(), col = db.collection('chat');
    // ① 90일 지난 글
    const cutoff = Date.now() - KEEP_DAYS * 86400000;
    let removedOld = 0;
    for (;;) {
      const old = await col.where('at', '<', cutoff).orderBy('at').limit(400).get();
      if (old.empty) break;
      await deleteRefs(db, old.docs.map((d) => d.ref)); removedOld += old.size;
      if (old.size < 400) break;
    }
    // ② 용량
    const docs = []; let last = null;
    for (;;) {
      let q = col.orderBy('at').select('sz').limit(1000);
      if (last) q = q.startAfter(last);
      const s = await q.get();
      s.docs.forEach((d) => { const z = d.get('sz'); docs.push({ ref: d.ref, sz: (typeof z === 'number' ? z : UNKNOWN_SZ) + INDEX_BYTES }); });
      if (s.size < 1000) break;
      last = s.docs[s.docs.length - 1];
    }
    const plan = planDeletion(docs, BASE_BYTES, FREE_LIMIT, HIGH, LOW);
    if (plan.count) await deleteRefs(db, docs.slice(0, plan.count).map((d) => d.ref));
    logger.info('chat cleanup', { removedOld, remaining: docs.length - plan.count, removedForSpace: plan.count, estBeforeMB: Math.round(plan.before / 1048576), estAfterMB: Math.round(plan.after / 1048576) });
  }
);
