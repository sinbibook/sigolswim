(function (global) {
  'use strict';

  function NearbyAttractionsMapper() {
    BaseDataMapper.call(this);
  }
  NearbyAttractionsMapper.prototype = Object.create(BaseDataMapper.prototype);
  NearbyAttractionsMapper.prototype.constructor = NearbyAttractionsMapper;

  NearbyAttractionsMapper.prototype.mapPage = function () {
    // 명시적으로 enabled === false 일 때만 404 (데이터 미도착/부분 갱신 시엔 리다이렉트 안 함)
    // 기존엔 nearbyAttractions 데이터가 없기만 해도 404로 보내, 노출=true인데도
    // 부분 데이터/도착 전 타이밍에 404 가 뜨던 문제 수정.
    var section = this.getSection();
    if (section && section.enabled === false) {
      window.location.href = '404.html';
      return;
    }

    this.mapHero();
    this.mapHeroTitle();
    this.mapAttractions();
    this.updateMetaTags();
  };

  NearbyAttractionsMapper.prototype.getSection = function () {
    var pages = this.getPages();
    var page = pages.nearbyAttractions;
    return (page && page.sections && page.sections[0]) || null;
  };

  // MAPPER: nearbyAttractions.hero.images[isSelected][0] → #main_banner 단일 이미지 (슬라이더 X, directions 방식)
  NearbyAttractionsMapper.prototype.mapHero = function () {
    var section = this.getSection();
    var hero = section && section.hero;

    var wrapper = document.querySelector('#main_banner .main_slide .swiper-wrapper');
    if (!wrapper) return;

    // isSelected=true + url 있는 것만, sortOrder 순 → 첫 번째 1장만 사용
    var images = hero ? this.getSelectedImages(hero.images || []).filter(function (i) { return i.url; }) : [];
    var first = images[0];

    wrapper.innerHTML = '';
    var slide = document.createElement('div');
    slide.className = 'swiper-slide';
    if (first && first.url) {
      slide.style.background = 'url(' + first.url + ') center center / cover no-repeat';
    } else {
      // 이미지 없으면 placeholder
      var placeholderImg = document.createElement('img');
      ImageHelpers.applyPlaceholder(placeholderImg);
      placeholderImg.style.width = '100%';
      placeholderImg.style.height = '100%';
      placeholderImg.style.objectFit = 'cover';
      slide.appendChild(placeholderImg);
    }
    wrapper.appendChild(slide);
  };

  // MAPPER: nearbyAttractions.hero.title → #facility1004 h1 (값 없으면 "NEARBY ATTRACTIONS" 유지)
  NearbyAttractionsMapper.prototype.mapHeroTitle = function () {
    var section = this.getSection();
    var hero = section && section.hero;

    // hero.title 1순위, 값 없으면 기본값("NEARBY ATTRACTIONS") 복원
    // 빈 값도 항상 반영해야 프리뷰에서 실시간으로 기본값으로 되돌아감 (falsy 가드로 막으면 이전 값이 남음)
    var titleEl = document.querySelector('[data-nearby-title]');
    if (titleEl) {
      if (hero && hero.title && hero.title.trim()) {
        titleEl.textContent = hero.title;
      } else {
        titleEl.innerHTML = '<span>NEARBY</span> ATTRACTIONS';
      }
    }
  };

  // MAPPER: nearbyAttractions.about[] → 여행지 리스트 (li: 첫 선택 이미지 + dt 제목 + dd 설명)
  NearbyAttractionsMapper.prototype.mapAttractions = function () {
    var section = this.getSection();
    var about = (section && section.about) || [];

    var ul = document.querySelector('[data-nearby-items]');
    if (!ul) return;

    ul.innerHTML = '';

    if (!about.length) return;

    about.forEach(function (item) {
      var li = document.createElement('li');

      // 이미지: 항목 images 중 첫 isSelected (없으면 placeholder)
      var images = item.images || [];
      var selected = images.find(function (img) { return img && img.isSelected && img.url; }) ||
        images.find(function (img) { return img && img.url; }) || null;

      var imgDiv = document.createElement('div');
      imgDiv.className = 'img';
      var img = document.createElement('img');
      if (selected && selected.url) {
        img.src = selected.url;
        img.alt = item.title || '';
      } else {
        ImageHelpers.applyPlaceholder(img);
        img.alt = item.title || '';
      }
      imgDiv.appendChild(img);

      // 제목/설명
      var dl = document.createElement('dl');
      var dt = document.createElement('dt');
      dt.textContent = item.title || '';
      var dd = document.createElement('dd');
      dd.innerHTML = (item.description || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      dl.appendChild(dt);
      dl.appendChild(dd);

      li.appendChild(imgDiv);
      li.appendChild(dl);
      ul.appendChild(li);
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    // 미리보기(iframe)에서는 preview-handler 가 admin 데이터로 렌더를 주도한다.
    // 템플릿 기본 데이터엔 nearbyAttractions 가 비활성(enabled:false)이라, 여기서 fallback 으로
    // 기본 데이터를 렌더하면 admin 데이터 도착 전에 mapPage 가 404 로 빠지는 문제가 있어 생략한다.
    if (window.parent !== window) return;
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new NearbyAttractionsMapper();
    mapper.initialize();
    global.nearbyAttractionsMapperInstance = mapper;
  });

  global.NearbyAttractionsMapper = NearbyAttractionsMapper;
})(window);
