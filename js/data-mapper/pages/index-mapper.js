(function (global) {
  'use strict';

  function IndexMapper() {
    BaseDataMapper.call(this);
  }
  IndexMapper.prototype = Object.create(BaseDataMapper.prototype);
  IndexMapper.prototype.constructor = IndexMapper;

  IndexMapper.prototype.mapPage = function () {
    this.mapHeroSlides();
    this.mapHeroText();
    this.mapAboutEssence();
    this.mapGalleryAndRooms();
    this.mapClosingSection();
    this.mapSpecialOffers();
    this.updateMetaTags();
  };

  // MAPPER: customFields.pages.index.sections[0].hero.images[isSelected]
  IndexMapper.prototype.mapHeroSlides = function () {
    var pages = this.getPages();
    var hero = pages.index && pages.index.sections && pages.index.sections[0] && pages.index.sections[0].hero;
    if (!hero) return;

    var images = this.getSelectedImages(hero.images || []);
    var wrapper = document.querySelector('[data-index-hero-slides]');
    if (!wrapper) return;

    // 동일 데이터로 매퍼가 두 번 실행되면 재빌드/재초기화 생략 (autoplay 타이머 리셋 방지)
    var heroSig = images.map(function (s) { return s.url; }).join('|') || 'placeholder';
    if (wrapper.dataset.heroSig === heroSig) return;
    wrapper.dataset.heroSig = heroSig;

    // rebuild 방식: 정확히 N개 슬라이드 생성 (숨김 슬라이드 없음 → loop 정확)
    wrapper.innerHTML = '';

    if (!images.length) {
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
        if (!img.url) return;
        var slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.style.background = 'url(' + img.url + ') center / cover';
        wrapper.appendChild(slide);
      });
    }

    // 실제 생성된 슬라이드 수 (index.js 페이저/카운트용)
    window.heroImageCount = wrapper.querySelectorAll('.swiper-slide').length;

    // 히어로 슬라이드 생성 완료 → index.js에서 Swiper 1회 초기화
    window.dispatchEvent(new Event('heroSlidesReady'));
  };

  // MAPPER: customFields.pages.index.sections[0].essence
  IndexMapper.prototype.mapAboutEssence = function () {
    var pages = this.getPages();
    var essence = pages.index && pages.index.sections && pages.index.sections[0] && pages.index.sections[0].essence;

    // Description 매핑
    var descEl = document.querySelector('[data-essence-description]');
    if (descEl) {
      descEl.textContent = (essence && essence.description) || this.getPropertyNameEn() || 'GreenHouse';
    }

    if (!essence) return;

    // Images 매핑 (JSON의 이미지 개수만큼 동적 생성)
    var images = this.getSelectedImages(essence.images || []);
    var wrapper = document.querySelector('[data-essence-slides]');
    if (!wrapper) return;

    // 슬라이드 링크 규칙: 앞쪽 슬라이드는 부대시설을 순서대로, 마지막 한 장만 외부풍경(main.html).
    // 부대시설 수보다 슬라이드가 많으면 남는 슬라이드도 main.html 로 보낸다.
    var facilities = this.getProperty().facilities || [];
    var slideHref = function (idx, total) {
      if (idx === total - 1) return 'main.html';
      var f = facilities[idx];
      return f ? 'facility.html?id=' + f.id : 'main.html';
    };

    // 슬라이드 동적 생성
    wrapper.innerHTML = '';

    var valid = images.filter(function (image) { return image && image.url; });

    if (!valid.length) {
      // 이미지가 없으면 placeholder 생성
      var placeholderLi = document.createElement('li');
      placeholderLi.className = 'swiper-slide';
      var placeholderA = document.createElement('a');
      placeholderA.href = 'main.html';
      var placeholderImg = document.createElement('img');
      ImageHelpers.applyPlaceholder(placeholderImg);
      var placeholderTxt = document.createElement('p');
      placeholderTxt.className = 'txt';
      placeholderTxt.textContent = 'No Image';
      placeholderA.appendChild(placeholderImg);
      placeholderLi.appendChild(placeholderTxt);
      placeholderLi.appendChild(placeholderA);
      wrapper.appendChild(placeholderLi);
    } else {
      valid.forEach(function (image, idx) {
        var li = document.createElement('li');
        li.className = 'swiper-slide';
        var p = document.createElement('p');
        p.className = 'txt';
        p.textContent = image.description || '';
        var a = document.createElement('a');
        a.href = slideHref(idx, valid.length);
        var img = document.createElement('img');
        img.src = image.url;
        img.alt = image.description || '';
        a.appendChild(img);
        li.appendChild(p);
        li.appendChild(a);
        wrapper.appendChild(li);
      });
    }

    // Swiper 재초기화 (JSON 이미지 개수 반영)
    if (window.atc01Swiper) {
      window.atc01Swiper.destroy(false, true);
    }

    window.atc01Swiper = createSwiper('.atc01_slide', {
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
        nextEl: '#atc01 .arr.next',
        prevEl: '#atc01 .arr.prev',
      },
      pagination: {
        el: '#atc01 .pager',
        type: 'fraction',
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
  };

  // MAPPER: customFields.pages.index.sections[0].hero.title, description
  IndexMapper.prototype.mapHeroText = function () {
    var pages = this.getPages();
    var hero = pages.index && pages.index.sections && pages.index.sections[0] && pages.index.sections[0].hero;
    if (!hero) return;

    // Hero title 영역(span, 큰 글씨) ← hero.description 매핑 (빈 문자열도 반영)
    var titleEl = document.querySelector('[data-index-hero-title]');
    if (titleEl) {
      titleEl.textContent = hero.description || '';
    }

    // Hero description 영역(p, 작은 글씨) ← hero.title 매핑 (빈 문자열도 반영)
    var descEl = document.querySelector('[data-index-hero-description]');
    if (descEl) {
      descEl.textContent = hero.title || '';
    }
  };

  // MAPPER: property.englishName + homepage.customFields.pages.index.sections[0].gallery.description + rooms (root level)
  IndexMapper.prototype.mapGalleryAndRooms = function () {
    var pages = this.getPages();
    var gallery = pages.index && pages.index.sections && pages.index.sections[0] && pages.index.sections[0].gallery;
    var roomtypes = this.getRoomtypes();
    var self = this;
    var activeRoomtypes = roomtypes.filter(function (rt) {
      if (!(rt && rt.name && rt.name.trim())) return false;
      var matched = self.getMatchedRoom(rt);
      return !(matched && matched.status === 'inactive');
    });
    var roomItems = this.getRoomMenuItems(activeRoomtypes, function (rt) { return (rt && rt.name) || ''; });

    // Gallery title 매핑 (fallback: "stay with comfort")
    var titleComfortEl = document.querySelector('[data-gallery-title-comfort]');
    if (titleComfortEl) {
      titleComfortEl.textContent = (gallery && gallery.title) || 'stay with comfort';
    }

    // Property nameEn 매핑 (customFields.property.nameEn 우선, 없으면 property.nameEn, 둘 다 없으면 빼고)
    var englishNameEl = document.querySelector('[data-property-english-name]');
    var propertyNameEn = this.getPropertyNameEn();
    if (englishNameEl && propertyNameEn) {
      englishNameEl.textContent = propertyNameEn;
    }

    // Gallery description 매핑 (\n을 <br>로 변환, 빈 값도 반영)
    var descEl = document.querySelector('[data-gallery-description]');
    if (descEl) {
      descEl.innerHTML = (gallery && gallery.description) ? gallery.description.replace(/\n/g, '<br>') : '';
    }

    // Rooms 슬라이드 매핑
    var wrapper = document.querySelector('[data-index-room-slides]');
    if (!wrapper) return;

    wrapper.innerHTML = '';

    // roomtypes가 없으면 placeholder 표시
    if (!roomtypes.length) {
      var placeholderSlide = document.createElement('div');
      placeholderSlide.className = 'swiper-slide room_list';
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

    var roomSlideHrefs = [];

    roomItems.forEach(function (item) {
      var rt = self.getRoomMenuRoomtype(item);
      var roomLabel = self.getRoomMenuLabel(item);
      if (!rt || !String(roomLabel).trim()) return;
      var matched = self.getMatchedRoom(rt);

      // 썸네일 이미지: roomtype 대표 이미지 (roomtype_thumbnail → interior 폴백)
      var thumbnailUrl = self.getRoomtypeThumbnailUrl(rt);

      var slide = document.createElement('div');
      slide.className = 'swiper-slide room_list';

      var roomHref = self.getRoomMenuLink(item);
      roomSlideHrefs.push(roomHref);
      slide.setAttribute('data-room-href', roomHref);

      var link = document.createElement('a');
      link.className = 'link';
      link.href = roomHref;
      link.setAttribute('data-room-image-link', 'true');

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
      roomBtn.href = roomHref;
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

    wrapper.dataset.roomSlideHrefs = JSON.stringify(roomSlideHrefs);
    if (wrapper._roomImageClickHandler) {
      wrapper.removeEventListener('click', wrapper._roomImageClickHandler);
    }
    wrapper._roomImageClickHandler = function (event) {
      var imageLink = event.target.closest && event.target.closest('[data-room-image-link]');
      if (!imageLink || !wrapper.contains(imageLink)) return;

      var targetHref = imageLink.getAttribute('href');
      var swiper = window.roomSwiper;
      if (swiper && typeof swiper.realIndex === 'number') {
        try {
          var hrefs = JSON.parse(wrapper.dataset.roomSlideHrefs || '[]');
          if (hrefs[swiper.realIndex]) targetHref = hrefs[swiper.realIndex];
        } catch (e) {}
      }

      if (targetHref) {
        event.preventDefault();
        window.location.href = targetHref;
      }
    };
    wrapper.addEventListener('click', wrapper._roomImageClickHandler);

    // Room Swiper 재초기화 (DOM 업데이트 완료 후)
    setTimeout(function() {
      if (window.roomSwiper) {
        window.roomSwiper.destroy();
      }

      window.roomSwiper = createSwiper('.room_slider', {
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
    }, 50);
  };

  // MAPPER: customFields.pages.index.sections[0].closing.title, description, images[isSelected]
  IndexMapper.prototype.mapClosingSection = function () {
    var pages = this.getPages();
    var closing = pages.index && pages.index.sections && pages.index.sections[0] && pages.index.sections[0].closing;
    if (!closing) return;

    // Title 매핑 (fallback: YOUR PERFECT STAY)
    var titleEl = document.querySelector('[data-closing-title]');
    if (titleEl) {
      titleEl.textContent = (closing && closing.title) || 'YOUR PERFECT STAY';
    }

    // Description 매핑 (\n을 <br>로 변환)
    // 빈 값도 항상 반영 → 백오피스에서 설명을 지우면 화면도 비워짐
    var descEl = document.querySelector('[data-closing-description]');
    if (descEl) {
      descEl.innerHTML = closing.description ? closing.description.replace(/\n/g, '<br>') : '';
    }

    // Images 매핑 (isSelected=true인 첫번째)
    var imgEl = document.querySelector('[data-closing-image]');
    if (imgEl) {
      if (closing.images && closing.images.length > 0) {
        var selectedImg = closing.images.find(function (img) { return img.isSelected; });
        if (selectedImg && selectedImg.url) {
          ImageHelpers.setImage(imgEl, selectedImg.url);
        } else {
          ImageHelpers.applyPlaceholder(imgEl);
        }
      } else {
        ImageHelpers.applyPlaceholder(imgEl);
      }
    }
  };

  // MAPPER: customFields.pages.index.sections[0].signature.title, description + property.facilities[].images[isSelected] + name
  IndexMapper.prototype.mapSpecialOffers = function () {
    var pages = this.getPages();
    var signature = pages.index && pages.index.sections && pages.index.sections[0] && pages.index.sections[0].signature;
    var property = this.getProperty();
    var facilities = property.facilities || [];

    // Signature title 매핑 (fallback: SPECIAL)
    var titleEl = document.querySelector('[data-index-signature-title]');
    if (titleEl) {
      titleEl.textContent = (signature && signature.title) || 'SPECIAL OFFERS';
    }

    // Signature description 매핑 (\n을 <br>로 변환, 빈 값도 반영)
    var descEl = document.querySelector('[data-index-signature-description]');
    if (descEl) {
      descEl.innerHTML = (signature && signature.description) ? signature.description.replace(/\n/g, '<br>') : '';
    }

    // Facilities 슬라이드 동적 생성
    var wrapper = document.querySelector('[data-index-facility-slides]');
    if (!wrapper) return;

    wrapper.innerHTML = '';

    var createFacilitySlide = function (facility) {
      var li = document.createElement('li');
      li.className = 'swiper-slide';

      var a = document.createElement('a');
      a.href = facility ? 'facility.html?id=' + facility.id : 'facility.html';

      var imgDiv = document.createElement('div');
      imgDiv.className = 'img';
      var img = document.createElement('img');

      if (facility) {
        var imageUrl = null;
        if (facility.images && facility.images.length > 0) {
          var selectedImg = facility.images.find(function (img) { return img.isSelected; });
          if (selectedImg && selectedImg.url) {
            imageUrl = selectedImg.url;
          }
        }

        if (imageUrl) {
          img.src = imageUrl;
          img.alt = facility.name || '';
        } else {
          ImageHelpers.applyPlaceholder(img);
        }
      } else {
        ImageHelpers.applyPlaceholder(img);
      }

      imgDiv.appendChild(img);
      a.appendChild(imgDiv);

      if (facility) {
        var txtBox = document.createElement('div');
        txtBox.className = 'txt_box';
        var p = document.createElement('p');
        p.textContent = facility.name || '';
        txtBox.appendChild(p);
        a.appendChild(txtBox);
      }

      li.appendChild(a);
      return li;
    };

    if (!facilities.length) {
      for (var i = 0; i < 4; i++) {
        wrapper.appendChild(createFacilitySlide(null));
      }
    } else {
      facilities.forEach(function (facility) {
        if (facility) {
          wrapper.appendChild(createFacilitySlide(facility));
        }
      });

      var remainingCount = 4 - facilities.length;
      if (remainingCount > 0) {
        for (var i = 0; i < remainingCount; i++) {
          wrapper.appendChild(createFacilitySlide(null));
        }
      }
    }

    // Swiper 재초기화
    if (window.offerSwiper) {
      window.offerSwiper.destroy();
    }

    window.offerSwiper = createSwiper('.offer_slide', {
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

  document.addEventListener('DOMContentLoaded', function () {
    // previewHandler가 데이터를 받았으면 스킵 (preview-handler가 처리함)
    // room-mapper와 동일하게 currentData까지 확인 → 데이터 도착 전엔 fallback으로 자동 렌더
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new IndexMapper();
    mapper.initialize();
    global.indexMapperInstance = mapper;
  });

  global.IndexMapper = IndexMapper;
})(window);
