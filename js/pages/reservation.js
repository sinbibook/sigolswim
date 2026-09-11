// 히어로 Swiper: 매퍼가 슬라이드 rebuild 후(heroSlidesReady) 초기화 (단일 이미지 히어로, 페이저 없음)
function initReservationHero() {
  var slideEl = document.querySelector('#main_banner .main_slide');
  if (!slideEl) return;

  var totalSlides = slideEl.querySelectorAll('.swiper-slide').length;

  if (slideEl.swiper) slideEl.swiper.destroy(true, true);

  createSwiper('#main_banner .main_slide', {
    effect: 'fade',
    fadeEffect: { crossFade: true },
    slideActiveClass: 'on',
    autoplay: { delay: 3500, disableOnInteraction: false },
    speed: 1000,
    loop: totalSlides > 1, // 슬라이드 1장(이미지 1장/placeholder)이면 loop 끄기 (fade+loop+1장 = 안 보임)
    observer: true,
    observeParents: true
  });
}

window.addEventListener('heroSlidesReady', initReservationHero);
