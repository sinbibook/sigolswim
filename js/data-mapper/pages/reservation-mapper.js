(function (global) {
  'use strict';

  function ReservationMapper() {
    BaseDataMapper.call(this);
  }
  ReservationMapper.prototype = Object.create(BaseDataMapper.prototype);
  ReservationMapper.prototype.constructor = ReservationMapper;

  ReservationMapper.prototype.mapPage = function () {
    this.mapHero();
    this.mapReserveContent();
    this.mapBookingLink();
    this.updateMetaTags();
  };

  // MAPPER: customFields.pages.reservation.sections[0].hero.images[isSelected] → #main_banner rebuild
  ReservationMapper.prototype.mapHero = function () {
    var pages = this.getPages();
    var hero = pages.reservation && pages.reservation.sections &&
      pages.reservation.sections[0] && pages.reservation.sections[0].hero;

    // 제목: hero.title 1순위, 값 없으면 기본값("RESERVATION INFORMATION") 복원
    // 빈 값도 항상 반영해야 프리뷰에서 실시간으로 기본값으로 되돌아감 (falsy 가드로 막으면 이전 값이 남음)
    var titleEl = document.querySelector('[data-reservation-title]');
    if (titleEl) {
      if (hero && hero.title && hero.title.trim()) {
        titleEl.textContent = hero.title;
      } else {
        titleEl.innerHTML = '<span>RESERVATION</span> INFORMATION';
      }
    }

    var wrapper = document.querySelector('#main_banner .main_slide .swiper-wrapper');
    if (!wrapper) return;

    // isSelected=true 이면서 url이 실제로 있는 것만 (빈 url은 placeholder 처리)
    var images = hero ? this.getSelectedImages(hero.images || []).filter(function (i) { return i.url; }) : [];

    // 동일 데이터로 매퍼가 두 번 실행되면 재빌드/재초기화 생략 (autoplay 타이머 리셋 방지)
    var heroSig = images.map(function (s) { return s.url; }).join('|') || 'placeholder';
    if (wrapper.dataset.heroSig === heroSig) return;
    wrapper.dataset.heroSig = heroSig;

    wrapper.innerHTML = '';

    if (!images.length) {
      // index 히어로와 동일: swiper-slide 안에 <img> + applyPlaceholder
      var slide = document.createElement('div');
      slide.className = 'swiper-slide';
      var placeholderImg = document.createElement('img');
      ImageHelpers.applyPlaceholder(placeholderImg);
      placeholderImg.style.width = '100%';
      placeholderImg.style.height = '100%';
      placeholderImg.style.objectFit = 'cover';
      slide.appendChild(placeholderImg);
      wrapper.appendChild(slide);
    } else {
      images.forEach(function (img) {
        var div = document.createElement('div');
        div.className = 'swiper-slide';
        div.style.background = 'url(' + img.url + ') center center / cover no-repeat';
        wrapper.appendChild(div);
      });
    }

    // 히어로 슬라이드 생성 완료 → reservation.js에서 Swiper 1회 초기화
    window.dispatchEvent(new Event('heroSlidesReady'));
  };

  // MAPPER: 예약안내 → property.usageGuide
  //         환불안내 → property.refundPolicies
  ReservationMapper.prototype.mapReserveContent = function () {
    var prop = this.getProperty();

    // 예약안내: property.usageGuide (\n→<br>)
    var guideEl = document.querySelector('[data-reservation-guide]');
    if (guideEl) {
      var guideText = prop.usageGuide || '';
      guideEl.innerHTML = guideText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }

    // 환불안내 (refundPolicies[] → 텍스트)
    var refundEl = document.querySelector('[data-reservation-refund]');
    var policies = prop.refundPolicies || [];
    if (refundEl && policies.length) {
      refundEl.innerHTML = policies.map(function (p) {
        var days = p.refundProcessingDays;
        var daysLabel = days === 0 ? '당일' : days + '일전';
        var rate = p.refundRate === 100 ? '전액 환불' : p.refundRate + '% 환불';
        return '* 이용일 ' + daysLabel + ' 취소시 ' + rate;
      }).join('<br>');
    }
  };

  // MAPPER: property.realtimeBookingId → 예약하기 링크
  ReservationMapper.prototype.mapBookingLink = function () {
    var bookingUrl = this.getBookingUrl();
    var el = document.querySelector('#reserve .golink a');
    if (el && bookingUrl && bookingUrl !== '#!') {
      el.href = 'javascript:void(0)';
      el.addEventListener('click', function () {
        window.open(bookingUrl, '_blank');
      });
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new ReservationMapper();
    mapper.initialize();
    global.reservationMapperInstance = mapper;
  });

  global.ReservationMapper = ReservationMapper;
})(window);
