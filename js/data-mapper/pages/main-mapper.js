(function (global) {
  'use strict';

  function MainMapper() {
    BaseDataMapper.call(this);
  }
  MainMapper.prototype = Object.create(BaseDataMapper.prototype);
  MainMapper.prototype.constructor = MainMapper;

  MainMapper.prototype.mapPage = function () {
    this.mapHero();
    this.mapAboutTitle();
    this.mapAbout();
    this.mapAboutSlides();
    this.mapClosingSection();
    this.mapGalleryRolling();
    this.mapTypingSection();
    this.mapConFooterInfo();
    this.mapPropertyNames();
    this.updateMetaTags();
  };

  // 한글 받침 판별하여 "을/를" 선택
  MainMapper.prototype.getKoreanObjectParticle = function (word) {
    if (!word || word.length === 0) return '을';
    var lastChar = word.charCodeAt(word.length - 1);
    if (lastChar >= 0xAC00 && lastChar <= 0xD7A3) {
      var code = lastChar - 0xAC00;
      return (code % 28 !== 0) ? '을' : '를';
    }
    return '을';
  };

  // MAPPER: customFields.pages.main.sections[0].hero.images[isSelected]
  // progressbar와 번호를 JSON 이미지 개수에 맞게 동적 매핑
  MainMapper.prototype.mapHero = function () {
    var pages = this.getPages();
    var hero = pages.main && pages.main.sections && pages.main.sections[0] && pages.main.sections[0].hero;
    if (!hero) return;

    var images = this.getSelectedImages(hero.images || []);
    var wrapper = document.querySelector('[data-main-hero-slides]');
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

    // 실제 생성된 슬라이드 수 (main.js 페이저/카운트용)
    window.mainHeroImageCount = wrapper.querySelectorAll('.swiper-slide').length;

    // 히어로 슬라이드 생성 완료 → main.js에서 Swiper 1회 초기화
    window.dispatchEvent(new Event('heroSlidesReady'));
  };

  // MAPPER: customFields.pages.main.sections[0].hero (title, description)
  // Fallback: "About" + property.nameEn
  MainMapper.prototype.mapAboutTitle = function () {
    var pages = this.getPages();
    var heroData = pages.main && pages.main.sections && pages.main.sections[0] && pages.main.sections[0].hero;
    var propertyNameEn = this.getPropertyNameEn();

    // atc01 title: hero.title 우선, "About" fallback
    var titleEl = document.querySelector('[data-main-hero-title]');
    if (titleEl) {
      if (heroData && heroData.title) {
        titleEl.textContent = heroData.title;
      } else {
        titleEl.textContent = 'About';
      }
    }

    // atc01 description: hero.description 우선, property.nameEn fallback
    var descEl = document.querySelector('[data-main-hero-description]');
    if (descEl) {
      if (heroData && heroData.description) {
        descEl.textContent = heroData.description;
      } else {
        descEl.textContent = propertyNameEn;
      }
    }
  };

  // MAPPER: customFields.pages.main.sections[0].about[] → 동적 생성
  // about 배열의 개수에 따라 여러 개의 about 아이템 생성
  MainMapper.prototype.mapAbout = function () {
    var pages = this.getPages();
    var about = pages.main && pages.main.sections && pages.main.sections[0] && pages.main.sections[0].about;

    if (!about || !about.length) return;

    var container = document.querySelector('[data-main-about-container]');
    if (!container) return;

    container.innerHTML = '';
    var propertyName = this.getPropertyName();
    var self = this;

    about.forEach(function (item) {
      // 아이템 래퍼
      var itemDiv = document.createElement('div');
      itemDiv.className = 'about-item';

      // 이미지
      var imgDiv = document.createElement('div');
      imgDiv.className = 'img';
      var img = document.createElement('img');
      img.setAttribute('data-aos', 'fade-up');
      var imgUrl = self.getFirstSelectedImage(item.images || []);
      if (imgUrl) {
        img.src = imgUrl;
      } else {
        ImageHelpers.applyPlaceholder(img);
      }
      imgDiv.appendChild(img);
      itemDiv.appendChild(imgDiv);

      // 설명 텍스트
      var txDiv = document.createElement('div');
      txDiv.className = 'txWrap';
      txDiv.setAttribute('data-aos', 'fade-up');
      var t1 = document.createElement('div');
      t1.className = 't1';
      if (item.description) {
        t1.innerHTML = item.description
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
      }
      txDiv.appendChild(t1);
      itemDiv.appendChild(txDiv);

      // 하단 정보 (바 + 숙소명)
      var bottomDiv = document.createElement('div');
      bottomDiv.className = 'bottom';
      bottomDiv.innerHTML = '<span class="bar"></span><span class="t2">' + propertyName + '</span>';
      itemDiv.appendChild(bottomDiv);

      container.appendChild(itemDiv);
    });
  };

  // MAPPER: customFields.pages.main.sections[0].about[] → atc01_slide 동적 슬라이드 생성
  // 각 about이 하나의 슬라이드가 됨 (title + 첫번째 isSelected 이미지)
  MainMapper.prototype.mapAboutSlides = function () {
    var pages = this.getPages();
    var about = pages.main && pages.main.sections && pages.main.sections[0] && pages.main.sections[0].about;

    if (!about || !about.length) return;

    var wrapper = document.querySelector('[data-main-about-slides]');
    if (!wrapper) return;

    wrapper.innerHTML = '';
    var self = this;

    about.forEach(function (item) {
      if (!item) return;

      var imgUrl = self.getFirstSelectedImage(item.images || []);
      var li = document.createElement('li');
      li.className = 'swiper-slide';
      var p = document.createElement('p');
      p.className = 'txt';
      p.textContent = item.title || '';
      var img = document.createElement('img');

      if (imgUrl) {
        img.src = imgUrl;
        img.alt = item.title || '';
      } else {
        ImageHelpers.applyPlaceholder(img);
      }

      li.appendChild(p);
      li.appendChild(img);
      wrapper.appendChild(li);
    });

    // Swiper 재초기화
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

  // MAPPER: customFields.pages.index.sections[0].closing.title, description, images[isSelected]
  MainMapper.prototype.mapClosingSection = function () {
    var pages = this.getPages();
    var closing = pages.index && pages.index.sections && pages.index.sections[0] && pages.index.sections[0].closing;
    if (!closing) return;

    // Title 매핑 (fallback: YOUR PERFECT STAY)
    var titleEl = document.querySelector('[data-closing-title]');
    if (titleEl) {
      titleEl.textContent = (closing && closing.title) || 'YOUR PERFECT STAY';
    }

    // Description 매핑 (\n을 <br>로 변환, 빈 값도 반영)
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

  // MAPPER: homepage.customFields.property.images[category=property_exterior]
  MainMapper.prototype.mapGalleryRolling = function () {
    var cf = this.getCustomFields();
    var propImages = (cf.property && cf.property.images) || [];
    var exterior = propImages.filter(function (img) {
      return img.isSelected && img.category === 'property_exterior';
    }).sort(function (a, b) { return a.sortOrder - b.sortOrder; });

    var con7 = document.querySelector('[data-main-gallery]');
    if (!con7) return;

    con7.innerHTML = '';

    if (!exterior.length) {
      // Show placeholder when no images
      var placeholderDiv = document.createElement('div');
      placeholderDiv.className = 'img';
      var img = document.createElement('img');
      ImageHelpers.applyPlaceholder(img);
      placeholderDiv.appendChild(img);
      con7.appendChild(placeholderDiv);
      return;
    }

    exterior.forEach(function (img) {
      var div = document.createElement('div');
      div.className = 'img';
      div.innerHTML = '<img src="' + img.url + '" alt="" />';
      con7.appendChild(div);
    });
  };

  // MAPPER: property.name → typing section (index.html과 동일)
  MainMapper.prototype.mapTypingSection = function () {
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

  // MAPPER: customFields.property.name + nameEn → con4 하단 숙소명 영역
  MainMapper.prototype.mapConFooterInfo = function () {
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

  // MAPPER: homepage.customFields.property.name
  MainMapper.prototype.mapPropertyNames = function () {
    var name = this.getPropertyName();
    document.querySelectorAll('[data-property-name]').forEach(function (el) {
      el.textContent = name;
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new MainMapper();
    mapper.initialize();
    global.mainMapperInstance = mapper;
  });

  global.MainMapper = MainMapper;
})(window);
