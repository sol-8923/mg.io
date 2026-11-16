/* 설치 도우미
 * 1) 카카오톡·라인 같은 앱 안의 "전용 뷰어"에서 열면 홈 화면 설치가 안 되므로, 기본 브라우저(삼성 인터넷·크롬 등)로 한 번 넘겨 준다.
 * 2) 설치할 수 있는 브라우저에서는 "앱으로 설치" 안내를 한 번 보여 준다. (아이폰은 방법 안내만 가능)
 * 이미 앱으로 설치돼 열린 경우(standalone)에는 아무것도 하지 않는다. */
(function(){
  'use strict';
  var ua = navigator.userAgent || '';
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  if (standalone) return;

  /* 1) 앱 안 브라우저 탈출 */
  try {
    if (!sessionStorage.getItem('mg-study:escaped')) {
      if (/KAKAOTALK/i.test(ua)) {
        sessionStorage.setItem('mg-study:escaped', '1');
        location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
        return;
      }
      if (/Line\//i.test(ua)) {
        sessionStorage.setItem('mg-study:escaped', '1');
        location.href = location.href + (location.href.indexOf('?') < 0 ? '?' : '&') + 'openExternalBrowser=1';
        return;
      }
    }
  } catch (e) {}

  /* 2) 설치 안내 */
  var KEY = 'mg-study:install-hint';
  function dismissed() { try { return localStorage.getItem(KEY) === 'off'; } catch (e) { return false; } }
  function dismiss() { try { localStorage.setItem(KEY, 'off'); } catch (e) {} }
  if (dismissed()) return;

  var css = document.createElement('style');
  css.textContent =
    '.inst{position:fixed;left:12px;right:12px;bottom:12px;z-index:60;display:flex;gap:12px;align-items:center;padding:12px 14px;' +
    'background:var(--card,#fffdf8);color:var(--ink,#2a2622);border:1px solid var(--line,#e3d8c5);border-radius:16px;box-shadow:0 8px 28px rgba(0,0,0,.28);font-size:.95rem;line-height:1.45}' +
    '.inst img{width:44px;height:44px;border-radius:10px;flex:none}.inst b{display:block}' +
    '.inst .iact{margin-left:auto;display:flex;gap:8px;flex:none}' +
    '.inst button{font:inherit;border-radius:10px;border:1px solid var(--line,#e3d8c5);background:transparent;color:inherit;padding:8px 12px;cursor:pointer}' +
    '.inst button.go{background:#2f6b52;color:#fff;border-color:#2f6b52;font-weight:700}';
  document.head.appendChild(css);

  /* 안내 박스는 홈·공부방에서만 보인다(문제 풀이 중 아래쪽 버튼을 가리지 않도록) */
  function onHomeRoute() { var h = location.hash.replace(/^#\/?/, ''); return h === '' || h === 'room'; }
  function sync() { var b = document.querySelector('.inst'); if (b) b.style.display = onHomeRoute() ? '' : 'none'; }
  window.addEventListener('hashchange', sync);
  function show(text, withInstall, deferred) {
    if (document.querySelector('.inst')) return;
    var box = document.createElement('div');
    box.className = 'inst';
    box.setAttribute('role', 'dialog');
    box.innerHTML = '<img src="icons/icon-192.png?v=2" alt=""><div><b>앱처럼 쓰려면</b><span></span></div><div class="iact"></div>';
    box.querySelector('span').textContent = text;
    var act = box.querySelector('.iact');
    if (withInstall) {
      var b = document.createElement('button');
      b.className = 'go'; b.textContent = '설치';
      b.onclick = function () {
        deferred.prompt();
        deferred.userChoice.then(function () { dismiss(); box.remove(); }, function () { box.remove(); });
      };
      act.appendChild(b);
    }
    var x = document.createElement('button');
    x.textContent = '닫기';
    x.onclick = function () { dismiss(); box.remove(); };
    act.appendChild(x);
    document.body.appendChild(box);
    sync();
  }

  /* 안드로이드(크롬·삼성 인터넷): 브라우저가 설치 가능하다고 알려 주면 설치 버튼을 보여 준다 */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    show('홈 화면에 설치하면 주소창 없이 앱처럼 열려요.', true, e);
  });
  window.addEventListener('appinstalled', function () { dismiss(); var b = document.querySelector('.inst'); if (b) b.remove(); });

  /* 아이폰 사파리: 자동 설치 버튼이 없어서 방법만 안내 */
  var isIOS = /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  if (isIOS) {
    setTimeout(function () { show('아래 공유 버튼(□↑)을 누르고 "홈 화면에 추가"를 선택하세요.', false); }, 1500);
  }
})();
