// 히어로 Swiper: 매퍼가 슬라이드를 rebuild 한 뒤(heroSlidesReady) 1회 초기화
// 페이저 숫자/카운트는 "실제 DOM 슬라이드 수" 기준 → loop가 정확히 처음으로 복귀
function initRoomHero() {
    var slideEl = document.querySelector("#main_banner .main_slide");
    var pagerEl = document.querySelector("#main_banner .controls .pager");
    if (!slideEl) return;

    var totalSlides = slideEl.querySelectorAll('.swiper-slide').length;

    // 컨트롤 번호 자동 생성 (이미지 개수만큼)
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

window.addEventListener('heroSlidesReady', initRoomHero);

// rv_slider: 매퍼가 슬라이드를 채운 뒤(roomSliderReady) Swiper 1회 초기화
// (작동 방식은 다운로드 폴더 script.js의 incSwiper와 동일)
window.addEventListener('roomSliderReady', function () {
    var rvSliderEl = document.querySelector('#expense1004 .rv_slider');
    if (!rvSliderEl) return;

    // 이벤트 중복 대비: 이미 초기화돼 있으면 제거 후 재생성
    if (rvSliderEl.swiper) {
        rvSliderEl.swiper.destroy(true, true);
    }

    createSwiper(rvSliderEl, {
        loop: true,
        speed: 1000,
        slidesPerView: 'auto',
        spaceBetween: 150,
        slideActiveClass: 'on',
        centeredSlides: true,
        autoplay: {
            delay: 3500,
            disableOnInteraction: false,
        },
        navigation: {
            nextEl: '#expense1004 .next',
            prevEl: '#expense1004 .prev',
        },
        breakpoints: {
            340: { slidesPerView: 1, spaceBetween: 10 },
            481: { slidesPerView: 2, spaceBetween: 20 },
            769: { slidesPerView: 2, spaceBetween: 30, centeredSlides: true },
            1025: { slidesPerView: 3, spaceBetween: 100 },
        }
    });
});
