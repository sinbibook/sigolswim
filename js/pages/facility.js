// 히어로 Swiper: 매퍼가 슬라이드를 rebuild 한 뒤(heroSlidesReady) 초기화
// 페이저 숫자/카운트는 "실제 DOM 슬라이드 수" 기준 → loop가 정확히 처음으로 복귀 (index/main/room 과 동일)
function initFacilityHero() {
  var slideEl = document.querySelector("#main_banner .main_slide");
  var pagerEl = document.querySelector("#main_banner .controls .pager");
  if (!slideEl) return;

  var totalSlides = slideEl.querySelectorAll('.swiper-slide').length;
  var useLoop = totalSlides > 1; // 슬라이드 1장(이미지 1장/placeholder)이면 loop 끄기 (fade+loop+1장 = 안 보임)

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
    loop: useLoop,
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
    loop: useLoop,
    observer: true,
    observeParents: true,
    navigation: { nextEl: "#main_banner .arr.next", prevEl: "#main_banner .arr.prev" }
  });
}

window.addEventListener('heroSlidesReady', initFacilityHero);
