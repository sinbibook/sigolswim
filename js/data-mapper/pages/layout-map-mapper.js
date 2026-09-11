(function (global) {
  'use strict';

  function LayoutMapMapper() {
    BaseDataMapper.call(this);
  }
  LayoutMapMapper.prototype = Object.create(BaseDataMapper.prototype);
  LayoutMapMapper.prototype.constructor = LayoutMapMapper;

  LayoutMapMapper.prototype.mapPage = function () {
    // 명시적으로 enabled === false 일 때만 404 (데이터 미도착/부분 갱신 시엔 리다이렉트 안 함)
    var pages = this.getPages();
    var section = pages.layoutMap && pages.layoutMap.sections && pages.layoutMap.sections[0];
    if (section && section.enabled === false) {
      window.location.href = '404.html';
      return;
    }

    this.mapPropertyName();
    this.mapHero();
    this.mapLayoutContent();
    this.mapRoomNavigation();
    this.mapRoomPreview();
    this.updateMetaTags();
  };

  // MAPPER: (layoutMap enabled면) "미리보기"(현재 페이지=on) + roomtypes[active] → snb_wrap 네비게이션
  LayoutMapMapper.prototype.mapRoomNavigation = function () {
    var roomtypes = this.getRoomtypes();
    var self = this;
    var ul = document.querySelector('[data-room-nav-list]');
    if (!ul) return;

    ul.innerHTML = '';

    // layoutMap(미리보기)이 enabled면 "미리보기" 항목 추가 (현재 페이지이므로 on)
    var pages = this.getPages();
    var layoutEnabled = pages.layoutMap && pages.layoutMap.sections &&
      pages.layoutMap.sections[0] && pages.layoutMap.sections[0].enabled !== false;
    if (layoutEnabled) {
      var pli = document.createElement('li');
      pli.className = 'on';
      var pa = document.createElement('a');
      pa.href = 'layout-map.html';
      pa.textContent = '미리보기';
      pli.appendChild(pa);
      ul.appendChild(pli);
    }

    var activeRoomtypes = roomtypes.filter(function (rt) {
      if (!(rt && rt.name && rt.name.trim())) return false;
      var matched = self.getMatchedRoom(rt);
      return matched && matched.status === 'active';
    });
    var roomItems = this.getRoomMenuItems(activeRoomtypes, function (rt) { return (rt && rt.name) || ''; });
    roomItems.forEach(function (item) {
      var rt = self.getRoomMenuRoomtype(item);
      var roomLabel = self.getRoomMenuLabel(item);
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.href = self.getRoomMenuLink(item, 'id');
      link.textContent = roomLabel;
      li.appendChild(link);
      ul.appendChild(li);
    });
  };

  // MAPPER: property.name → 숙소명
  LayoutMapMapper.prototype.mapPropertyName = function () {
    var propertyName = this.getPropertyName();
    var propertyNameEl = document.querySelector('[data-property-name]');
    if (propertyNameEl) {
      propertyNameEl.textContent = propertyName;
    }
  };

  // MAPPER: customFields.pages.layoutMap.sections[0].hero.images[isSelected]
  LayoutMapMapper.prototype.mapHero = function () {
    var pages = this.getPages();
    var hero = pages.layoutMap && pages.layoutMap.sections && pages.layoutMap.sections[0] && pages.layoutMap.sections[0].hero;
    if (!hero) return;

    var images = this.getSelectedImages(hero.images || []);
    // 표준 히어로 패턴: #main_banner .main_slide rebuild (다른 페이지 히어로와 동일 동작)
    var wrapper = document.querySelector('#main_banner .main_slide .swiper-wrapper');

    if (wrapper) {
      // 동일 데이터로 매퍼가 두 번 실행되면 재빌드/재초기화 생략 (autoplay 타이머 리셋 방지)
      var heroSig = images.map(function (s) { return s.url; }).join('|') || 'placeholder';
      if (wrapper.dataset.heroSig !== heroSig) {
        wrapper.dataset.heroSig = heroSig;
        wrapper.innerHTML = '';

        if (!images.length) {
          var ph = document.createElement('div');
          ph.className = 'swiper-slide';
          ph.style.background = 'url(' + ImageHelpers.EMPTY_IMAGE_SVG + ') center center / cover no-repeat';
          wrapper.appendChild(ph);
        } else {
          images.forEach(function (img) {
            var div = document.createElement('div');
            div.className = 'swiper-slide';
            div.style.background = 'url(' + img.url + ') center center / cover no-repeat';
            wrapper.appendChild(div);
          });
        }

        // 히어로 슬라이드 생성 완료 → layout-map.js에서 Swiper 1회 초기화
        window.dispatchEvent(new Event('heroSlidesReady'));
      }
    }

    // hero.title을 "ROOM PREVIEW" 영역에 매핑 (1순위) / fallback: 현재값
    var heroTitleEl = document.querySelector('[data-layout-map-hero-title]');
    if (heroTitleEl && hero.title && hero.title.trim()) {
      heroTitleEl.textContent = hero.title;
    }

    // hero.description을 "객실 배치도" 영역에 매핑 (1순위) / fallback: 현재값
    var heroDescEl = document.querySelector('[data-layout-map-hero-description]');
    if (heroDescEl && hero.description && hero.description.trim()) {
      heroDescEl.textContent = hero.description;
    }
  };

  // MAPPER: customFields.pages.layoutMap.sections[0].about (이미지 + 설명)
  // MAPPER: layoutMap.sections[0].about → 배치도(ROOM LAYOUT) 영역
  LayoutMapMapper.prototype.mapLayoutContent = function () {
    var pages = this.getPages();
    var about = pages.layoutMap && pages.layoutMap.sections && pages.layoutMap.sections[0] && pages.layoutMap.sections[0].about;
    if (!about) return;

    // 제목: about.title (없으면 "ROOM LAYOUT" 폴백)
    var titleEl = document.querySelector('[data-layout-about-title]');
    if (titleEl) {
      titleEl.textContent = (about.title && about.title.trim()) ? about.title : 'ROOM LAYOUT';
    }

    // 이미지: isSelected=true 만 sortOrder 순으로 렌더
    var vimg = document.querySelector('[data-layout-about-images]');
    if (vimg) {
      var images = (about.images || [])
        .filter(function (img) { return img && img.isSelected === true && img.url; })
        .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });

      vimg.innerHTML = '';
      if (!images.length) {
        var ph = document.createElement('img');
        ph.className = 'img fadeUp';
        ph.setAttribute('data-scroll', '');
        ImageHelpers.applyPlaceholder(ph);
        vimg.appendChild(ph);
      } else {
        images.forEach(function (img) {
          var imgEl = document.createElement('img');
          imgEl.className = 'img fadeUp';
          imgEl.setAttribute('data-scroll', '');
          ImageHelpers.setImage(imgEl, img.url, '');
          vimg.appendChild(imgEl);
        });
      }
    }
  };

  // MAPPER: rooms[].images[0].thumbnail[0].url + name + description
  // MAPPER: 제목/설명 = layoutMap.sections[0].hero.title/description (폴백: 제목 "stay with comfort", 설명 빈 값)
  //         + property.nameEn + rooms 카드 + .room_slider 초기화 (index.html roomList 과 동일 구조)
  LayoutMapMapper.prototype.mapRoomPreview = function () {
    var pages = this.getPages();
    var roomtypes = this.getRoomtypes();
    var self = this;

    // layoutMap.hero (제목/설명 1순위 소스)
    var layoutHero = pages.layoutMap && pages.layoutMap.sections &&
      pages.layoutMap.sections[0] && pages.layoutMap.sections[0].hero;

    // 제목: layoutMap.hero.title 1순위 → 없으면 하드코딩 "stay with comfort"
    var titleComfortEl = document.querySelector('[data-gallery-title-comfort]');
    if (titleComfortEl) {
      titleComfortEl.textContent = (layoutHero && layoutHero.title && layoutHero.title.trim())
        ? layoutHero.title
        : 'stay with comfort';
    }

    // Property nameEn (customFields.property.nameEn 우선, 없으면 property.nameEn, 둘 다 없으면 빼고)
    var englishNameEl = document.querySelector('[data-property-english-name]');
    var propertyNameEn = this.getPropertyNameEn();
    if (englishNameEl && propertyNameEn) {
      englishNameEl.textContent = propertyNameEn;
    }

    // 설명: layoutMap.hero.description 1순위 → 없으면 빈 값 (하드코딩 기본 설명 없음)
    // 빈 값도 항상 반영 → 프리뷰 실시간 변경
    var galleryDescEl = document.querySelector('[data-gallery-description]');
    if (galleryDescEl) {
      var descText = (layoutHero && layoutHero.description && layoutHero.description.trim())
        ? layoutHero.description
        : '';
      galleryDescEl.innerHTML = descText.replace(/\n/g, '<br>');
    }

    var wrapper = document.querySelector('[data-index-room-slides]');
    if (!wrapper) return;

    wrapper.innerHTML = '';

    // roomtypes가 없으면 placeholder
    if (!roomtypes.length) {
      var placeholderSlide = document.createElement('div');
      placeholderSlide.className = 'swiper-slide room_list on';
      var placeholderLink = document.createElement('a');
      placeholderLink.className = 'link';
      placeholderLink.href = '#';
      var placeholderImg = document.createElement('img');
      ImageHelpers.applyPlaceholder(placeholderImg);
      placeholderImg.style.width = '100%';
      placeholderImg.style.height = '100%';
      placeholderImg.style.objectFit = 'cover';
      placeholderLink.appendChild(placeholderImg);
      placeholderSlide.appendChild(placeholderLink);
      wrapper.appendChild(placeholderSlide);
      return;
    }

    var activeRoomtypes = roomtypes.filter(function (rt) {
      if (!(rt && rt.name && rt.name.trim())) return false;
      var matched = self.getMatchedRoom(rt);
      return !(matched && matched.status === 'inactive');
    });
    var roomItems = this.getRoomMenuItems(activeRoomtypes, function (rt) { return (rt && rt.name) || ''; });
    roomItems.forEach(function (item) {
      var rt = self.getRoomMenuRoomtype(item);
      var roomLabel = self.getRoomMenuLabel(item);
      if (!rt || !String(roomLabel).trim()) return;
      var matched = self.getMatchedRoom(rt);

      // 썸네일 이미지: roomtype 대표 이미지 (roomtype_thumbnail → interior 폴백)
      var thumbnailUrl = self.getRoomtypeThumbnailUrl(rt);

      var slide = document.createElement('div');
      slide.className = 'swiper-slide room_list on';

      var link = document.createElement('a');
      link.className = 'link';
      link.href = self.getRoomMenuLink(item);

      var imgDiv = document.createElement('div');
      imgDiv.className = 'img';
      imgDiv.style.minHeight = '450px';
      imgDiv.style.zIndex = '0';
      imgDiv.style.overflow = 'hidden';

      var imgEl = document.createElement('img');
      imgEl.style.width = '100%';
      imgEl.style.height = '100%';
      imgEl.style.objectFit = 'cover';
      if (thumbnailUrl) {
        imgEl.src = thumbnailUrl;
      } else {
        ImageHelpers.applyPlaceholder(imgEl);
      }
      imgDiv.appendChild(imgEl);

      var infoDiv = document.createElement('div');
      infoDiv.className = 'info';

      var nameP = document.createElement('p');
      nameP.className = 'name';
      nameP.textContent = roomLabel;

      var ul = document.createElement('ul');
      var li = document.createElement('li');
      li.textContent = (matched && matched.roomStructures && matched.roomStructures.length) ? matched.roomStructures.join('/') : '';
      ul.appendChild(li);

      var descDiv = document.createElement('div');
      descDiv.className = 'desc';

      var roomBtn = document.createElement('a');
      roomBtn.className = 'room_btn';
      roomBtn.href = self.getRoomMenuLink(item);
      roomBtn.innerHTML = '(<span>Learn More</span>)';

      infoDiv.appendChild(nameP);
      infoDiv.appendChild(ul);
      infoDiv.appendChild(descDiv);
      infoDiv.appendChild(roomBtn);

      slide.appendChild(link);
      slide.appendChild(imgDiv);
      slide.appendChild(infoDiv);
      wrapper.appendChild(slide);
    });

    // Room Swiper 초기화 (DOM 업데이트 후)
    setTimeout(function () {
      if (window.roomSwiper) window.roomSwiper.destroy();
      window.roomSwiper = createSwiper('.room_slider', {
        loop: true,
        effect: 'fade',
        speed: 2000,
        spaceBetween: 0,
        slideActiveClass: 'on',
        autoplay: { delay: 2500, disableOnInteraction: false },
        navigation: {
          nextEl: '#roomList .arr.next',
          prevEl: '#roomList .arr.prev',
        },
      });
    }, 50);
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new LayoutMapMapper();
    mapper.initialize();
    global.layoutMapMapperInstance = mapper;
  });

  global.LayoutMapMapper = LayoutMapMapper;
})(window);
