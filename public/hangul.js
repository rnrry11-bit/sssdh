(function (root) {
  'use strict';
  // 어간과 어미를 이어 붙여 활용한 낱말을 만들어요. 서버와 화면이 같은 파일을 써서 결과가 항상 같아요.
  // 자동으로 처리하는 것: ㅏ/ㅓ 탈락, ㅗ+ㅏ=ㅘ, ㅜ+ㅓ=ㅝ, ㅣ+ㅓ=ㅕ, 하+아=해, ㅡ 탈락, ㄴ/ㄹ/ㅁ/ㅂ으로 시작하는 어미, ㄹ 받침 탈락
  // 처리하지 않는 것: ㅂ·ㄷ·ㅅ·르 불규칙 같은 나머지 불규칙 활용
  var BASE = 0xAC00, JAMO_T = { 'ㄴ': 4, 'ㄹ': 8, 'ㅁ': 16, 'ㅂ': 17 };
  var INSERT = { 'ㄴ': '은', 'ㄹ': '을', 'ㅁ': '음', 'ㅂ': '습' };
  function dec(ch) {
    var c = ch ? ch.charCodeAt(0) - BASE : -1;
    if (c < 0 || c > 11171) return null;
    return { l: Math.floor(c / 588), v: Math.floor((c % 588) / 28), t: c % 28 };
  }
  function enc(l, v, t) { return String.fromCharCode(BASE + (l * 21 + v) * 28 + t); }
  function join(stem, ending) {
    stem = String(stem || '').trim(); ending = String(ending || '').trim();
    if (!ending) return stem;
    var last = dec(stem.charAt(stem.length - 1));
    if (!last) return stem + ending;
    var head = ending.charAt(0), rest = ending.slice(1), body = stem.slice(0, -1);
    if (JAMO_T[head]) {
      var t = JAMO_T[head];
      if (last.t === 0) return body + enc(last.l, last.v, t) + rest;
      if (last.t === 8) return t === 8 ? stem + rest : body + enc(last.l, last.v, t) + rest;   // 길+ㄴ → 긴
      return stem + INSERT[head] + rest;                                                          // 먹+ㄴ → 먹은
    }
    if ((head === '아' || head === '어') && last.t === 0 && stem !== '이') {
      var v = last.v;
      if (stem.charAt(stem.length - 1) === '하') return body + enc(last.l, 1, 0) + rest;      // 하+아 → 해
      if (v === 0 || v === 4 || v === 1 || v === 5) return stem + rest;                          // 가+아 → 가
      if (v === 8) return body + enc(last.l, 9, 0) + rest;                                       // 보+아 → 봐
      if (v === 13) return body + enc(last.l, 14, 0) + rest;                                     // 주+어 → 줘
      if (v === 20) return body + enc(last.l, 6, 0) + rest;                                      // 지키+어 → 지켜
      if (v === 18) {                                                                            // 쓰+어 → 써
        var prev = dec(stem.charAt(stem.length - 2));
        var vowel = prev && (prev.v === 0 || prev.v === 8) ? 0 : 4;
        return body + enc(last.l, vowel, 0) + rest;
      }
    }
    return stem + ending;
  }
  // 어미 칸에 쓸 수 있는 글자: 한글, 맨 앞에는 ㄴ ㄹ ㅁ ㅂ 도 가능, 1~8글자
  function validEnding(e) { return typeof e === 'string' && /^[ㄴㄹㅁㅂ]?[가-힣]{0,7}$/.test(e) && e.length >= 1; }
  function validStem(s) { return typeof s === 'string' && /^[가-힣]{1,10}$/.test(s); }
  // 문장 만들기: 조사와 서술격 조사는 앞말에 붙여 쓰고, 나머지는 띄어 써요.
  function sentence(parts) {
    var out = '';
    parts.forEach(function (p, i) {
      var t = p.text;
      out += (i === 0 || p.cat === 'particle' || p.cat === 'copula') ? t : ' ' + t;
    });
    return out;
  }
  var api = { sentence: sentence, join: join, validEnding: validEnding, validStem: validStem };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Hangul = api;
})(typeof window !== 'undefined' ? window : this);
