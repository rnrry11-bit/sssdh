(function () {
  'use strict';
  // 품사 10가지. form=형태(불변어/가변어), func=기능, 이름=의미. conj=어간과 어미로 나뉘는 품사
  var CATS = [
    { key: 'noun', name: '명사', n: 1, form: '불변어', func: '체언', hint: '사람이나 사물의 이름이에요. 예) 마음, 별, 편지' },
    { key: 'pronoun', name: '대명사', n: 2, form: '불변어', func: '체언', hint: '이름 대신 가리키는 말이에요. 예) 나, 너, 우리, 여기' },
    { key: 'numeral', name: '수사', n: 3, form: '불변어', func: '체언', hint: '수량이나 순서를 나타내요. 예) 하나, 열, 첫째' },
    { key: 'determiner', name: '관형사', n: 4, form: '불변어', func: '수식언', hint: '체언 앞에서 꾸며 줘요. 예) 새, 모든, 이런' },
    { key: 'adverb', name: '부사', n: 5, form: '불변어', func: '수식언', hint: '용언이나 다른 말을 꾸며 줘요. 예) 매우, 함께, 꼭' },
    { key: 'particle', name: '조사', n: 6, form: '불변어', func: '관계언', hint: '체언 뒤에 붙어 관계를 나타내요. 예) 이/가, 을/를, 에게' },
    { key: 'interjection', name: '감탄사', n: 7, form: '불변어', func: '독립언', hint: '느낌이나 부름, 대답을 나타내요. 예) 아, 어머, 네' },
    { key: 'verb', name: '동사', n: 8, form: '가변어', func: '용언', conj: true, hint: '움직임을 나타내요. 어간은 그대로 두고 어미를 바꿔 활용해요.' },
    { key: 'adjective', name: '형용사', n: 9, form: '가변어', func: '용언', conj: true, hint: '상태나 성질을 나타내요. 어간은 그대로 두고 어미를 바꿔 활용해요.' },
    { key: 'copula', name: '서술격 조사', n: 10, form: '가변어', func: '관계언', conj: true, hint: '“이다”예요. 조사지만 활용하는 가변어예요. 체언 뒤에 붙여 써요.' }
  ];
  // 어미 칸 아래에 보여 줄 자주 쓰는 어미 (ㄴ ㄹ ㅂ 은 어간에 맞게 자동으로 바뀌어요)
  var ENDINGS = ['다', '어요', '었어', '고', '면', '어서', '지만', '는', 'ㄴ', 'ㄹ게요', 'ㅂ니다'];
  // 품사 체계를 한 줄로: 불변어 › 체언 › 명사
  function pathOf(c) { return c.form + ' › ' + c.func + ' › ' + c.name + (c.key === 'copula' ? '*' : ''); }

  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'value') el.value = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var kids = [].concat(arguments[i]);
      for (var j = 0; j < kids.length; j++) {
        var kid = kids[j];
        if (kid == null || kid === false) continue;
        el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
      }
    }
    return el;
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function catByKey(k) { return CATS.filter(function (c) { return c.key === k; })[0]; }
  function timeText(ts) {
    try { return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }
  function post(url, body, token) {
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, body: j }; });
    });
  }
  // 답장 결과 한 덩어리: 수락/거절, 점수, 세부 점수, 이유
  function replyBlock(m) {
    if (m.status === 'accepted' || m.status === 'rejected') {
      var ok = m.status === 'accepted';
      return h('div', { class: 'reply' },
        h('span', { class: 'badge ' + (ok ? 'ok' : 'no'), text: ok ? '수락' : '거절' }),
        h('b', { class: 'score', text: m.score + ' / 10' }),
        h('span', { class: 'detail', text: '참신성 ' + m.novelty + ' · 진심 ' + m.sincerity }),
        m.reason ? h('p', { class: 'why', text: m.reason }) : null);
    }
    return h('div', { class: 'reply' }, h('span', { class: 'badge wait', text: '답장 대기 중' }));
  }
  function msgItem(m, mode) {
    var li = h('li', { class: 'msg' });
    li.append(h('b', { text: m.from + '조' }), String(m.text));
    if (mode === 'out') li.append(' ', h('span', { class: 'to', text: '→ ' + m.to + '조에게' }));
    li.append(h('time', { text: timeText(m.at) }), replyBlock(m));
    return li;
  }

  // 무료 서버가 쉬지 않도록 열려 있는 화면에서 4분마다 가볍게 신호를 보내요
  setInterval(function () { fetch('/healthz', { cache: 'no-store' }).catch(function () {}); }, 240000);

  window.C = { CATS: CATS, ENDINGS: ENDINGS, pathOf: pathOf, join: window.Hangul.join, sentence: window.Hangul.sentence, validEnding: window.Hangul.validEnding, h: h, clone: clone, catByKey: catByKey, timeText: timeText, post: post, msgItem: msgItem };
})();
