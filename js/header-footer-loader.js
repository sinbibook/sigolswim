(function () {
  'use strict';

  function loadCSS(href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src, onload) {
    var script = document.createElement('script');
    script.src = src;
    if (onload) script.onload = onload;
    document.body.appendChild(script);
  }

  function loadHTML(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Failed to load: ' + url);
      return res.text();
    });
  }

  function loadHeader() {
    return loadHTML('common/header.html').then(function (html) {
      var temp = document.createElement('div');
      temp.innerHTML = html;
      var header = temp.querySelector('header, .header');
      if (header) {
        document.body.insertBefore(header, document.body.firstChild);
      }
    });
  }

  function loadFooter() {
    return loadHTML('common/footer.html').then(function (html) {
      var temp = document.createElement('div');
      temp.innerHTML = html;
      // footer.html의 모든 최상위 요소를 추가
      // (<footer> 뿐 아니라 형제인 .ft_btn_reserve(모바일 예약 버튼)도 함께 주입)
      while (temp.firstChild) {
        document.body.appendChild(temp.firstChild);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    Promise.all([loadHeader(), loadFooter()])
      .then(function () {
        document.dispatchEvent(new Event('headerFooterLoaded'));
      })
      .catch(function (err) {
        console.error('[header-footer-loader]', err);
        document.dispatchEvent(new Event('headerFooterLoaded'));
      });
  });
})();
