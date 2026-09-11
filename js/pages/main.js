// 히어로 Swiper: 페이저 숫자/카운트는 "실제 DOM 슬라이드 수" 기준 → loop가 정확히 처음으로 복귀
// 매퍼가 슬라이드를 rebuild 한 뒤(heroSlidesReady) 재초기화
window.initMainSwipers = function () {
  var slideEl = document.querySelector("#main_banner .main_slide");
  var pagerEl = document.querySelector("#main_banner .controls .pager");
  if (!slideEl) return;

  var totalSlides = slideEl.querySelectorAll('.swiper-slide').length;

  var pagerHtml = '';
  for (var i = 1; i <= totalSlides; i++) {
    pagerHtml += '<li class="swiper-slide num01">' + i + '</li>';
  }
  $("#main_banner .controls .pager .swiper-wrapper").empty().append(pagerHtml);
  $("#main_banner .controls .num.num02").text(totalSlides);

  // 이벤트 중복 대비: 기존 인스턴스 제거
  if (slideEl.swiper) slideEl.swiper.destroy(true, true);
  if (pagerEl && pagerEl.swiper) pagerEl.swiper.destroy(true, true);

  createSwiper("#main_banner .main_slide", {
    effect: 'fade',
    fadeEffect: { crossFade: true },
    slideActiveClass: 'on',
    autoplay: { delay: 3500, disableOnInteraction: false },
    speed: 1000,
    loop: totalSlides > 1,
    // 프리뷰 iframe이 init 시점에 0-size/숨김일 때 빈칸 렌더 방지 → 크기/DOM 변화 시 자동 재계산
    observer: true,
    observeParents: true,
    navigation: { nextEl: "#main_banner .arr.next", prevEl: "#main_banner .arr.prev" },
    on: {
      init: function () {
        $(".swiper-progress-bar").removeClass("animate active");
        $(".swiper-progress-bar").eq(0).addClass("animate active");
      },
      slideChangeTransitionStart: function () {
        $(".swiper-progress-bar").removeClass("animate active");
        $(".swiper-progress-bar").eq(0).addClass("active");
      },
      slideChangeTransitionEnd: function () {
        $(".swiper-progress-bar").eq(0).addClass("animate");
      }
    }
  });

  createSwiper("#main_banner .controls .pager", {
    effect: 'fade',
    fadeEffect: { crossFade: true },
    slideActiveClass: 'on',
    autoplay: { delay: 3500, disableOnInteraction: false },
    speed: 1000,
    loop: totalSlides > 1,
    observer: true,
    observeParents: true,
    navigation: { nextEl: "#main_banner .arr.next", prevEl: "#main_banner .arr.prev" }
  });
};

window.addEventListener('heroSlidesReady', window.initMainSwipers);

$(document).ready(function () {
  // con7 이미지 롤링
  var $con7 = $('.con7');
  if ($con7.length) {
    cloneImages($con7);
    startRolling($con7);
  }

  // con4 타이핑 효과
  typingEffect(
    $('#typing1'), $('#typing2'),
    $('#cursor1'), $('#cursor2'),
    $('.typing-container')
  );

  // 히어로는 heroSlidesReady 이벤트로만 init (room/index와 동일 패턴 → 중복 init race 방지)
});
