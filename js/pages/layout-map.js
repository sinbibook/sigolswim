// 히어로 Swiper: 매퍼가 슬라이드를 rebuild 한 뒤(heroSlidesReady) 초기화 (다른 페이지 히어로와 동일 동작)
function initLayoutMapHero() {
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
    loop: totalSlides > 1,
    observer: true,
    observeParents: true
  });
}
window.addEventListener('heroSlidesReady', initLayoutMapHero);

function initLayoutMapSwipers() {
  // 룸 슬라이더(.room_slider)는 layout-map-mapper 에서 초기화 (index roomList 와 동일)
}

$(document).ready(function () {
  // Mapper 완료 후 swiper 초기화
  setTimeout(function () {
    initLayoutMapSwipers();
  }, 100);
});

// enabled 상태 확인 (preview-handler 데이터 업데이트 시)
// preview-handler가 없으면 localhost이므로 체크 안 함
function checkLayoutMapEnabled() {
  if (!window.previewHandler) return;

  if (window.previewHandler.currentData) {
    const layoutEnabled = window.previewHandler.currentData?.homepage?.customFields?.pages?.layoutMap?.sections?.[0]?.enabled;
    if (layoutEnabled === false) {
      window.location.href = '404.html';
      return;
    }
  }
}
window._checkPageEnabled = checkLayoutMapEnabled;
