// 히어로 Swiper: 페이저 숫자/카운트는 "실제 DOM 슬라이드 수" 기준 → loop가 정확히 처음으로 복귀
// 매퍼가 슬라이드를 rebuild 한 뒤(heroSlidesReady) 재초기화
function initIndexHero() {
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
}

window.addEventListener('heroSlidesReady', initIndexHero);

// Swiper 초기화 (index-mapper 완료 후 호출)
// 히어로는 room.js와 동일하게 heroSlidesReady 이벤트로만 init (여기서 중복 호출 금지 → race 방지)
window.initIndexSwipers = function () {
  // About Swiper
  window.atc01Swiper = createSwiper(".atc01_slide", {
    loop: true,
    speed: 1000,
    slidesPerView: 1.3,
    spaceBetween: 20,
    centeredSlides: true,
    slideActiveClass: 'on',
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
    },
    navigation: {
      nextEl: '#atc01 .next',
      prevEl: '#atc01 .prev',
    },
    pagination: {
      el: "#atc01 .pager",
      type: "fraction",
    },
    breakpoints: {
      1025: {
        slidesPerView: 'auto',
        spaceBetween: 180,
      },
      769: {
        slidesPerView: 1.9,
        spaceBetween: 90,
      },
      481: {
        slidesPerView: 1.7,
        spaceBetween: 50,
      },
    },
  });

  // Room Swiper
  window.roomSwiper = createSwiper(".room_slider", {
    loop: true,
    effect: 'fade',
    speed: 2000,
    spaceBetween: 0,
    slideActiveClass: 'on',
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
    },
    navigation: {
      nextEl: '#roomList .arr.next',
      prevEl: '#roomList .arr.prev',
    },
  });

  // Special Swiper
  createSwiper(".offer_slide", {
    loop: true,
    speed: 1000,
    slidesPerView: 2,
    slideActiveClass: 'on',
    spaceBetween: 10,
    navigation: {
      nextEl: '#atc03 .arr.next',
      prevEl: '#atc03 .arr.prev',
    },
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
    },
    breakpoints: {
      1025: {
        slidesPerView: 4,
        spaceBetween: 17,
      },
      769: {
        slidesPerView: 4,
        spaceBetween: 15,
      },
      481: {
        slidesPerView: 3,
        spaceBetween: 12,
      },
    },
  });
};

// DOMContentLoaded에서 swiper 초기화 (index-mapper가 없을 경우 대비)
// 매퍼가 이미 초기화를 마쳤다면 건너뛴다.
// (매퍼 fetch가 100ms 안에 끝나느냐에 따라 순서가 뒤바뀌는데, 그대로 재초기화하면
//  슬라이드가 처음으로 되감기고 autoplay 타이머가 리셋된다)
$(document).ready(function () {
  setTimeout(function () {
    var atc01 = document.querySelector('.atc01_slide');
    if (atc01 && atc01.swiper && !atc01.swiper.destroyed) return;
    if (window.initIndexSwipers) {
      window.initIndexSwipers();
    }
  }, 100);
});
