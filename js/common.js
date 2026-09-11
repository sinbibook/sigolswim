(function () {
  'use strict';

  // Swiper 중복 생성 방지 헬퍼 - 즉시 노출 (mapper/pages 양쪽에서 사용)
  // Swiper 6 은 el.swiper 에 기존 인스턴스가 있어도 재사용하지 않고 새로 만든다.
  // 매퍼(fetch 완료 후)와 pages/*.js(ready+100ms)가 같은 엘리먼트를 각각 초기화하면
  // 이전 인스턴스의 autoplay 타이머와 네비게이션 핸들러가 그대로 남아
  // 두 인스턴스가 같은 wrapper transform 을 서로 덮어써 슬라이드가 버벅인다.
  // → 생성 직전에 해당 엘리먼트에 물려있는 인스턴스를 반드시 정리한다.
  window.createSwiper = function (target, options) {
    var els = typeof target === 'string'
      ? Array.prototype.slice.call(document.querySelectorAll(target))
      : (target ? [target] : []);
    if (!els.length) return null;

    var created = els.map(function (el) {
      if (el.swiper && !el.swiper.destroyed) {
        el.swiper.destroy(true, true);
      }
      return new Swiper(el, options);
    });

    return created.length === 1 ? created[0] : created;
  };

  // Swiper 초기화 헬퍼 - 즉시 노출 (pages/[page].js의 ready()에서 사용)
  window.initSwiper = function (container, options) {
    if (container && container.length) {
      return window.createSwiper(container.find('.swiper')[0], options);
    }
  };

  function initCommon() {
    // AOS (CDN 로드 실패/지연 시 ReferenceError 로 initCommon 전체가 중단되지 않도록 가드)
    if (typeof AOS !== 'undefined') {
      AOS.init({ once: true, duration: 2000 });
    }

    // 모바일 헤더 메뉴 열기/닫기 (#m_navBtn) — 헤더가 동적 로드되므로 이벤트 위임
    $(document).on('click', '#m_navBtn', function () {
      if ($(this).hasClass('on')) {
        // 닫기
        $('#m_navBtn').removeClass('on');
        $('#m_navBtn span').removeClass('on');
        $('#mnavWrap').fadeOut(300).removeClass('on');
        $('#topmenuM .depth1').removeClass('on');
        $('#topmenuM .depth_list').slideUp(200);
      } else {
        // 열기
        $('#m_navBtn').addClass('on');
        $('#m_navBtn span').addClass('on');
        $('#mnavWrap').fadeIn(300).addClass('on');
      }
    });

    // 모바일 서브메뉴 아코디언 (#topmenuM .depth1) — 클릭 시 해당 .depth_list 토글
    $(document).on('click', '#topmenuM .depth1', function () {
      if ($(this).hasClass('on')) {
        $(this).removeClass('on');
        $(this).next('.depth_list').slideUp(200);
      } else {
        $('#topmenuM .depth1').removeClass('on');
        $('#topmenuM .depth_list').slideUp(200);
        $(this).addClass('on');
        $(this).next('.depth_list').slideDown(200);
      }
    });

    // 푸터 IntersectionObserver
    var $footer = $('#footer');
    if ($footer.length) {
      var footerObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            $footer.addClass('footer-visible');
          } else {
            $footer.removeClass('footer-visible');
          }
        });
      }, { threshold: 0.1 });
      footerObserver.observe($footer[0]);
    }
  }

  // 타이핑 효과
  window.typingEffect = function ($element1, $element2, cursor1, cursor2, container) {
    var text1 = $element1.text().trim();
    var text2 = $element2.text().trim();
    var speed = 100;
    var index1 = 0;
    var index2 = 0;

    $element1.text('');
    $element2.text('');

    function typeFirstLine() {
      if (index1 < text1.length) {
        $element1.append(text1.charAt(index1++));
        setTimeout(typeFirstLine, speed);
      } else {
        cursor1.hide();
        cursor2.show();
        typeSecondLine();
      }
    }

    function typeSecondLine() {
      if (index2 < text2.length) {
        $element2.append(text2.charAt(index2++));
        setTimeout(typeSecondLine, speed);
      }
    }

    var typingObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          container.css('visibility', 'visible');
          cursor1.show();
          typeFirstLine();
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });

    if ($element1.length) {
      typingObserver.observe($element1[0]);
    }
  };

  // 이미지 롤링
  window.cloneImages = function ($container) {
    $container.find('.img').each(function () {
      $container.append($(this).clone());
    });
  };

  window.startRolling = function ($container) {
    if ($container.length) {
      var position = 0;
      var speed = 1;

      function roll() {
        position -= speed;
        if (Math.abs(position) >= $container[0].scrollWidth / 2) {
          position = 0;
        }
        $container.css('transform', 'translateX(' + position + 'px)');
        requestAnimationFrame(roll);
      }
      roll();
    }
  };

  // headerFooterLoaded 이벤트 시 공통 초기화
  document.addEventListener('headerFooterLoaded', function () {
    initCommon();
  });

  // header/footer-loader 없이 직접 열 경우 폴백
  $(document).ready(function () {
    if (!document.querySelector('.header')) return;
    initCommon();
  });
})();
