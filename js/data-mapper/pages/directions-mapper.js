(function (global) {
  'use strict';

  function DirectionsMapper() {
    BaseDataMapper.call(this);
  }
  DirectionsMapper.prototype = Object.create(BaseDataMapper.prototype);
  DirectionsMapper.prototype.constructor = DirectionsMapper;

  // Kakao Map 설정 상수
  DirectionsMapper.KAKAO_MAP_ZOOM_LEVEL = 5;
  DirectionsMapper.SDK_WAIT_INTERVAL = 100; // ms

  DirectionsMapper.prototype.mapPage = function () {
    this.mapHero();
    this.mapAddress();
    this.mapNotice();
    this.mapTypingSection();
    this.mapConFooterInfo();
    this.mapDaumMap();
    this.mapPropertyNames();
    this.updateMetaTags();
  };

  // MAPPER: customFields.pages.directions.sections[0].hero.images[isSelected] + title
  DirectionsMapper.prototype.mapHero = function () {
    var data = this.data || {};
    var hero = data.homepage &&
               data.homepage.customFields &&
               data.homepage.customFields.pages &&
               data.homepage.customFields.pages.directions &&
               data.homepage.customFields.pages.directions.sections &&
               data.homepage.customFields.pages.directions.sections[0] &&
               data.homepage.customFields.pages.directions.sections[0].hero;
    if (!hero) return;

    // Title 매핑 (title이 있으면 DIRECTION 제거, 없으면 숙소 영문명 + DIRECTION)
    // 주의: innerHTML 재작성 시 data-directions-hero-title 속성을 유지해야
    //       다음 실시간 업데이트에서도 span을 다시 찾아 갱신할 수 있음 (안 그러면 새로고침해야만 반영)
    var h1El = document.querySelector('#traffic .tit h1');
    if (h1El) {
      if (hero && hero.title) {
        // title이 있으면 DIRECTION 없이 title만 표시
        h1El.innerHTML = '<span data-directions-hero-title>' + hero.title + '</span>';
      } else {
        // title이 없으면(빈 값 포함) 숙소 영문명 + DIRECTION 표시
        var nameEn = this.getPropertyNameEn() || 'TRIP TEMPLATE';
        h1El.innerHTML = '<span data-directions-hero-title>' + nameEn + '</span> DIRECTION';
      }
    }

    // Hero 이미지 매핑 (isSelected=true이고 sortOrder가 가장 빠른 것)
    var images = this.getSelectedImages(hero.images || []);
    var wrapper = document.querySelector('[data-directions-hero-slides]');
    if (!wrapper) return;

    wrapper.innerHTML = '';
    if (!images.length) {
      var placeholderDiv = document.createElement('div');
      placeholderDiv.className = 'swiper-slide';
      var placeholderImg = document.createElement('img');
      ImageHelpers.applyPlaceholder(placeholderImg);
      placeholderImg.style.width = '100%';
      placeholderImg.style.height = '100%';
      placeholderImg.style.objectFit = 'cover';
      placeholderDiv.appendChild(placeholderImg);
      wrapper.appendChild(placeholderDiv);
      return;
    }

    images.forEach(function (img) {
      var div = document.createElement('div');
      div.className = 'swiper-slide';
      var imgEl = document.createElement('img');
      imgEl.src = img.url;
      imgEl.alt = '';
      imgEl.style.width = '100%';
      imgEl.style.height = '100%';
      imgEl.style.objectFit = 'cover';
      div.appendChild(imgEl);
      wrapper.appendChild(div);
    });
  };

  // MAPPER: property.latitude, property.longitude → 카카오 지도
  DirectionsMapper.prototype.mapDaumMap = function () {
    var property = this.getProperty();
    if (!property.latitude || !property.longitude) return;

    var container = document.getElementById('kakao-map');
    if (!container) return;

    // 지도 생성 함수
    var createMap = function () {
      try {
        var options = {
          center: new kakao.maps.LatLng(property.latitude, property.longitude),
          level: DirectionsMapper.KAKAO_MAP_ZOOM_LEVEL,
          scrollwheel: false,
          draggable: false
        };

        var map = new kakao.maps.Map(container, options);

        // 마커 표시
        var markerPosition = new kakao.maps.LatLng(property.latitude, property.longitude);
        var marker = new kakao.maps.Marker({
          position: markerPosition
        });
        marker.setMap(map);
      } catch (error) {
        console.error('Failed to create Kakao Map:', error);
      }
    };

    // SDK 로드 확인 및 재시도
    var checkSdkAndLoad = function (retryCount) {
      retryCount = retryCount || 0;
      var MAX_RETRIES = 20; // 20 * 100ms = 2초

      if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
        window.kakao.maps.load(createMap);
      } else if (retryCount < MAX_RETRIES) {
        setTimeout(function () {
          checkSdkAndLoad(retryCount + 1);
        }, DirectionsMapper.SDK_WAIT_INTERVAL);
      } else {
        console.error('Failed to load Kakao Map SDK after multiple retries.');
      }
    };

    checkSdkAndLoad();
  };

  // MAPPER: property.address → con14 주소 텍스트
  DirectionsMapper.prototype.mapAddress = function () {
    var address = this.getProperty().address || '';
    var el = document.querySelector('[data-directions-address]');
    if (el) el.textContent = address;
  };

  // MAPPER: customFields.pages.directions.sections[0].notice.title + description
  DirectionsMapper.prototype.mapNotice = function () {
    var data = this.data || {};
    var notice = data.homepage &&
                 data.homepage.customFields &&
                 data.homepage.customFields.pages &&
                 data.homepage.customFields.pages.directions &&
                 data.homepage.customFields.pages.directions.sections &&
                 data.homepage.customFields.pages.directions.sections[0] &&
                 data.homepage.customFields.pages.directions.sections[0].notice;
    var noticeEl = document.querySelector('.notice');

    if (!notice || !notice.title) {
      // notice 데이터가 없으면 섹션 숨김
      if (noticeEl) noticeEl.style.display = 'none';
      return;
    }

    // notice가 있으면 섹션 표시
    if (noticeEl) noticeEl.style.display = 'block';

    // 이용안내 제목
    var titleEl = document.querySelector('[data-directions-notice-title]');
    if (titleEl && notice.title) {
      titleEl.textContent = notice.title;
    }

    // 이용안내 설명
    var descEl = document.querySelector('[data-directions-notice-description]');
    if (descEl) {
      descEl.innerHTML = notice.description ? notice.description.replace(/\n/g, '<br>') : '';
    }
  };

  // MAPPER: customFields.property.name + nameEn → con4 하단 숙소명 영역
  DirectionsMapper.prototype.mapConFooterInfo = function () {
    var nameKr = this.getPropertyName();
    var nameEn = this.getPropertyNameEn();

    // t1: 숙소 한글명
    var t1El = document.querySelector('.con4 .t0 .t1');
    if (t1El) {
      t1El.textContent = nameKr;
    }

    // t2: "Welcome To [숙소 영문명]" (영문명 없으면 빼고)
    var t2El = document.querySelector('.con4 .t0 .t2');
    if (t2El) {
      t2El.textContent = nameEn ? 'Welcome To ' + nameEn : '';
    }
  };

  // TODO: 타이핑 텍스트 JSON 경로 추후 결정
  DirectionsMapper.prototype.mapTypingSection = function () {
    var propertyName = this.getPropertyName();
    var typing1El = document.querySelector('#typing1');
    var typing2El = document.querySelector('#typing2');

    if (typing1El) {
      typing1El.textContent = propertyName + '에서 사랑하는 사람들과 함께';
    }

    if (typing2El) {
      typing2El.textContent = '특별하고 소중한 시간을 보내보세요';
    }
  };

  // MAPPER: homepage.customFields.property.name
  DirectionsMapper.prototype.mapPropertyNames = function () {
    var name = this.getPropertyName();
    document.querySelectorAll('[data-property-name]').forEach(function (el) {
      el.textContent = name;
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new DirectionsMapper();
    mapper.initialize();
    global.directionsMapperInstance = mapper;
  });

  global.DirectionsMapper = DirectionsMapper;
})(window);
