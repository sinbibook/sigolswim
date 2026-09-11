(function (global) {
  'use strict';

  function FacilityMapper() {
    BaseDataMapper.call(this);
  }
  FacilityMapper.prototype = Object.create(BaseDataMapper.prototype);
  FacilityMapper.prototype.constructor = FacilityMapper;

  FacilityMapper.prototype.mapPage = function () {
    this.mapHero();
    this.mapFacilityNavigation();
    this.mapFacilityInfo();
    this.mapFacilityExperience();
    this.mapFacilityImages();
    this.mapSpecialPreview();
    this.updateMetaTags();
  };

  // MAPPER: property.facilities[] → snb_wrap 네비게이션 (현재 facility=on)
  FacilityMapper.prototype.mapFacilityNavigation = function () {
    var facilities = this.getProperty().facilities || [];
    var current = this.getCurrentFacility();
    var ul = document.querySelector('[data-room-nav-list]');
    if (!ul) return;

    ul.innerHTML = '';
    facilities.forEach(function (f) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = 'facility.html?id=' + f.id;
      a.textContent = f.name;
      if (current && f.id === current.id) {
        li.className = 'on';
      }
      li.appendChild(a);
      ul.appendChild(li);
    });
  };

  // URL param ?id= (구 링크 ?facility_id= 호환) 로 시설 선택, 없으면 첫 번째 시설
  FacilityMapper.prototype.getCurrentFacility = function () {
    var facilities = this.getProperty().facilities || [];
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id') || params.get('facility_id');
    if (id) return facilities.find(function (f) { return f.id === id; }) || facilities[0];
    return facilities[0];
  };

  // MAPPER: customFields.pages.facility[현재 id].sections[0].hero.title
  FacilityMapper.prototype.getFacilityHeroTitle = function (f) {
    if (!f) return '';
    var facPages = this.getPages().facility;
    if (!Array.isArray(facPages)) return '';
    var entry = facPages.find(function (p) { return p.id === f.id; });
    var hero = entry && entry.sections && entry.sections[0] && entry.sections[0].hero;
    return (hero && hero.title) ? hero.title : '';
  };

  // MAPPER: customFields.pages.facility[현재 id].sections[0].experience
  //         benefits/features/additionalInfos → 혜택/특징/추가정보 박스 (각 item title+description)
  //         빈 배열 박스는 숨김, 전체 비면 영역 숨김. 보이는 개수만큼 CSS flex로 균등 분할.
  FacilityMapper.prototype.mapFacilityExperience = function () {
    var box = document.querySelector('[data-facility-experience]');
    if (!box) return;

    var f = this.getCurrentFacility();
    var facPages = this.getPages().facility;
    var entry = (f && Array.isArray(facPages))
      ? facPages.find(function (p) { return p.id === f.id; }) : null;
    var exp = entry && entry.sections && entry.sections[0] && entry.sections[0].experience;

    function esc(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    var groups = [
      { sel: '[data-facility-benefit]', items: (exp && exp.benefits) || [] },
      { sel: '[data-facility-feature]', items: (exp && exp.features) || [] },
      { sel: '[data-facility-addinfo]', items: (exp && exp.additionalInfos) || [] }
    ];

    var anyVisible = false;
    groups.forEach(function (g) {
      var el = document.querySelector(g.sel);
      if (!el) return;

      // title 또는 description 둘 중 하나라도 값 있는 item만
      var items = (g.items || []).filter(function (it) {
        return it && ((it.title && it.title.trim()) || (it.description && it.description.trim()));
      });

      if (!items.length) {
        el.style.display = 'none';
        el.innerHTML = '';
        return;
      }

      anyVisible = true;
      el.style.display = '';
      el.innerHTML = items.map(function (it) {
        var t = (it.title || '').trim();
        var d = (it.description || '').trim();
        return '<div class="exp_item">' +
          (t ? '<h3>' + esc(t) + '</h3>' : '') +
          (d ? '<p>' + esc(d).replace(/\n/g, '<br>') + '</p>' : '') +
          '</div>';
      }).join('');
    });

    box.style.display = anyVisible ? '' : 'none';
  };

  // MAPPER: property.facilities[current].images[isSelected] (sortOrder순)
  //         → #main_banner 히어로 rebuild (index/main 과 동일 동작)
  FacilityMapper.prototype.mapHero = function () {
    var f = this.getCurrentFacility();
    if (!f) return;

    var wrapper = document.querySelector('#main_banner .main_slide .swiper-wrapper');
    if (!wrapper) return;

    // isSelected=true 이면서 url이 실제로 있는 것만 (빈 url 이미지는 placeholder 처리되도록 제외)
    var images = this.getSelectedImages(f.images || []).filter(function (i) { return i.url; });

    // 동일 데이터로 매퍼가 두 번 실행되면 재빌드/재초기화 생략 (autoplay 타이머 리셋 방지)
    var heroSig = images.map(function (s) { return s.url; }).join('|') || 'placeholder';
    if (wrapper.dataset.heroSig === heroSig) return;
    wrapper.dataset.heroSig = heroSig;

    wrapper.innerHTML = '';

    if (!images.length) {
      // index.html 히어로와 동일: swiper-slide 안에 <img> + applyPlaceholder
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
        var div = document.createElement('div');
        div.className = 'swiper-slide';
        div.style.background = 'url(' + img.url + ') center center / cover no-repeat';
        wrapper.appendChild(div);
      });
    }

    // 실제 생성된 슬라이드 수 (facility.js 페이저/카운트용)
    window.facilityHeroImageCount = wrapper.querySelectorAll('.swiper-slide').length;

    // 히어로 슬라이드 생성 완료 → facility.js에서 Swiper 1회 초기화
    window.dispatchEvent(new Event('heroSlidesReady'));
  };

  // MAPPER: property.facilities[current].name → con11 타이틀
  // MAPPER: customFields hero.title 우선 → 없으면 property.facilities[current].usageGuide → con11 설명 텍스트
  FacilityMapper.prototype.mapFacilityInfo = function () {
    var f = this.getCurrentFacility();
    if (!f) return;

    document.querySelectorAll('[data-facility-name]').forEach(function (el) {
      el.textContent = f.name || '';
    });

    // hero title(customFields) 우선 → 입력 안 했으면 property usageGuide fallback
    // 빈 값도 항상 반영 → 프리뷰에서 실시간으로 지워지고 바뀜
    var heroTitle = this.getFacilityHeroTitle(f);
    var usageText = (heroTitle && heroTitle.trim()) ? heroTitle : (f.usageGuide || '');
    document.querySelectorAll('[data-facility-usage]').forEach(function (usageEl) {
      usageEl.innerHTML = usageText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    });

    // sp_view 메인 이미지: 첫 번째 isSelected 이미지 (없으면 placeholder)
    var mainImages = this.getSelectedImages(f.images || []);
    document.querySelectorAll('[data-facility-main-image]').forEach(function (el) {
      if (mainImages[0] && mainImages[0].url) {
        el.src = mainImages[0].url;
        el.classList.remove('empty-image-placeholder');
      } else {
        ImageHelpers.applyPlaceholder(el);
      }
    });
  };

  // MAPPER: property.facilities[current].images[isSelected] 의 2번째~ → .dimg (sp_view가 images[0])
  FacilityMapper.prototype.mapFacilityImages = function () {
    var f = this.getCurrentFacility();
    if (!f) return;

    var images = this.getSelectedImages(f.images || []);

    document.querySelectorAll('[data-facility-dimg] li').forEach(function (li, i) {
      var img = images[i + 1]; // sp_view = images[0], dimg = images[1], images[2], ...
      var imgEl = li.querySelector('img');
      if (img && img.url) {
        li.style.backgroundImage = 'url(' + img.url + ')';
        if (imgEl) {
          imgEl.src = img.url;
          imgEl.classList.remove('empty-image-placeholder');
        }
      } else {
        li.style.backgroundImage = 'url(' + ImageHelpers.EMPTY_IMAGE_SVG + ')';
        if (imgEl) ImageHelpers.applyPlaceholder(imgEl);
      }
    });

    // MAPPER: property.name → con12 content text
    var propertyName = this.getPropertyName();
    document.querySelectorAll('[data-facility-content-text]').forEach(function (el) {
      el.textContent = propertyName;
    });
  };

  // MAPPER: property.facilities[].images[isSelected][0] + name → con3 슬라이더
  // MAPPER: atc03 제목/설명(facility[current].about, 폴백) + facilities 슬라이드 + offer swiper (index atc03 와 동일)
  FacilityMapper.prototype.mapSpecialPreview = function () {
    var facilities = this.getProperty().facilities || [];

    // 제목/설명: customFields.pages.facility[current].sections[0].about (폴백 제공)
    var facPages = this.getPages().facility || [];
    var cur = this.getCurrentFacility();
    var entry = (cur && facPages.length) ? facPages.find(function (p) { return p.id === cur.id; }) : facPages[0];
    var about = entry && entry.sections && entry.sections[0] && entry.sections[0].about;

    document.querySelectorAll('[data-facility-signature-title]').forEach(function (el) {
      el.textContent = (about && about.title && about.title.trim()) ? about.title : 'SPECIAL OFFERS';
    });
    document.querySelectorAll('[data-facility-signature-description]').forEach(function (el) {
      var desc = (about && about.description && about.description.trim())
        ? about.description : '특별한 경험의 패키지들을 만나보세요.';
      el.innerHTML = desc.replace(/\n/g, '<br>');
    });

    // 슬라이드: facilities[] (클릭 시 facility.html?id=), 4칸 미만이면 placeholder로 채움
    var wrapper = document.querySelector('[data-facility-offer-slides]');
    if (!wrapper) return;

    wrapper.innerHTML = '';

    var createSlide = function (f) {
      var li = document.createElement('li');
      li.className = 'swiper-slide';

      var a = document.createElement('a');
      a.href = f ? 'facility.html?id=' + f.id : '#';

      var imgDiv = document.createElement('div');
      imgDiv.className = 'img';
      var img = document.createElement('img');

      var imageUrl = null;
      if (f && f.images && f.images.length) {
        var sel = f.images.find(function (i) { return i.isSelected; });
        if (sel && sel.url) imageUrl = sel.url;
      }
      if (imageUrl) {
        img.src = imageUrl;
        img.alt = f.name || '';
      } else {
        ImageHelpers.applyPlaceholder(img);
      }
      imgDiv.appendChild(img);
      a.appendChild(imgDiv);

      if (f) {
        var txtBox = document.createElement('div');
        txtBox.className = 'txt_box';
        var p = document.createElement('p');
        p.textContent = f.name || '';
        txtBox.appendChild(p);
        a.appendChild(txtBox);
      }

      li.appendChild(a);
      return li;
    };

    if (!facilities.length) {
      for (var i = 0; i < 4; i++) wrapper.appendChild(createSlide(null));
    } else {
      facilities.forEach(function (f) { if (f) wrapper.appendChild(createSlide(f)); });
      for (var j = 0; j < 4 - facilities.length; j++) wrapper.appendChild(createSlide(null));
    }

    // offer swiper 초기화 (index atc03 와 동일 설정)
    if (window.offerSwiper) window.offerSwiper.destroy(false, true);
    window.offerSwiper = createSwiper('.offer_slide', {
      loop: true,
      speed: 1000,
      slidesPerView: 2,
      slideActiveClass: 'on',
      spaceBetween: 10,
      navigation: { nextEl: '#atc03 .arr.next', prevEl: '#atc03 .arr.prev' },
      autoplay: { delay: 2500, disableOnInteraction: false },
      breakpoints: {
        1025: { slidesPerView: 4, spaceBetween: 17 },
        769:  { slidesPerView: 4, spaceBetween: 15 },
        481:  { slidesPerView: 3, spaceBetween: 12 },
      },
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new FacilityMapper();
    mapper.initialize();
    global.facilityMapperInstance = mapper;
  });

  global.FacilityMapper = FacilityMapper;
})(window);
