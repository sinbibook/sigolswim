(function (global) {
  'use strict';

  function HeaderFooterMapper() {
    BaseDataMapper.call(this);
  }
  HeaderFooterMapper.prototype = Object.create(BaseDataMapper.prototype);
  HeaderFooterMapper.prototype.constructor = HeaderFooterMapper;

  HeaderFooterMapper.prototype.mapPage = function () {
    this.mapLogo();
    this.mapFavicon();
    this.mapBookingLinks();
    this.mapYbsButton();
    this.mapRoomMenu();
    this.mapFacilityMenu();
    this.mapFooterMenu();
    this.mapTravelMenu();
    this.mapLayoutMapMenu();
    this.mapHeaderNavHover();
    this.mapFooter();
  };

  // MAPPER: layoutMap.enabled === false 이면 ROOMS 서브메뉴의 `미리보기` 숨김
  // (헤더 PC + 모바일 aside). 기존에는 mapFooterMenu 가 ROOMS 대메뉴의 href 만
  // 바꾸고 서브메뉴 항목은 그대로 둬서, 꺼진 페이지에 눌러 들어갈 수 있었다.
  HeaderFooterMapper.prototype.mapLayoutMapMenu = function () {
    var pages = this.getPages();
    var lm = pages.layoutMap && pages.layoutMap.sections && pages.layoutMap.sections[0];
    var hide = !!(lm && lm.enabled === false);
    document.querySelectorAll('[data-layout-map-menu]').forEach(function (el) {
      el.style.display = hide ? 'none' : '';
    });
  };

  // MAPPER: nearbyAttractions.enabled === false 이면 TRAVEL/주변여행지 메뉴 숨김 (헤더 PC·모바일 + 푸터)
  HeaderFooterMapper.prototype.mapTravelMenu = function () {
    var pages = this.getPages();
    var na = pages.nearbyAttractions && pages.nearbyAttractions.sections &&
      pages.nearbyAttractions.sections[0];
    var hide = !!(na && na.enabled === false);
    document.querySelectorAll('[data-travel-menu]').forEach(function (el) {
      el.style.display = hide ? 'none' : '';
    });
  };

  // MAPPER: footer 대메뉴 → 헤더 각 대메뉴의 첫 서브메뉴로 이동
  HeaderFooterMapper.prototype.mapFooterMenu = function () {
    // ROOMS: layoutMap(미리보기)이 enabled면 layout-map.html, 아니면 첫 활성 객실
    var roomsLink = document.querySelector('[data-footer-rooms-link]');
    if (roomsLink) {
      var pages = this.getPages();
      var layoutEnabled = pages.layoutMap && pages.layoutMap.sections &&
        pages.layoutMap.sections[0] && pages.layoutMap.sections[0].enabled !== false;
      if (layoutEnabled) {
        roomsLink.href = 'layout-map.html';
      } else {
        var self = this;
        var firstActive = this.getRoomtypes().filter(function (rt) {
          return rt.name && rt.name.trim();
        }).find(function (rt) {
          var m = self.getMatchedRoom(rt);
          return m && m.status === 'active';
        });
        var firstItem = this.getRoomMenuItems(firstActive ? [firstActive] : [], function (rt) { return (rt && rt.name) || ''; })[0];
        roomsLink.href = firstItem ? this.getRoomMenuLink(firstItem, 'id') : 'room.html';
      }
    }

    // SPECIAL: 첫 facility
    var specialLink = document.querySelector('[data-footer-special-link]');
    if (specialLink) {
      var facilities = this.getProperty().facilities || [];
      if (facilities.length) {
        specialLink.href = 'facility.html?id=' + facilities[0].id;
      }
    }
  };

  // MAPPER: homepage.images[0].logo[isSelected].url
  HeaderFooterMapper.prototype.mapLogo = function () {
    var logoUrl = this.getLogo();
    var els = document.querySelectorAll('[data-logo]');
    if (!els || !els.length) return;

    els.forEach(function (el) {
      el.style.width = '140px';
      el.style.height = 'auto';

      if (logoUrl) {
        // 실제 로고 적용 + placeholder 클래스 제거(회색 배경 잔존 방지)
        ImageHelpers.setImage(el, logoUrl, '로고');
        el.setAttribute('data-logo-mapped', '');
      } else if (!el.hasAttribute('data-logo-mapped')) {
        // 이전 실행에서 실제 로고가 이미 들어갔다면 placeholder로 덮어쓰지 않음
        ImageHelpers.applyPlaceholder(el);
      }
    });

    // 메뉴 오픈 시 로고를 secondary 색으로 칠하기 위한 mask 소스 (common.css 참조).
    // 로고가 실제로 들어왔을 때만 data-logo-ready 를 켜서, placeholder 상태에서
    // 마스크 없는 색 사각형이 노출되는 것을 방지
    var root = document.documentElement;
    if (logoUrl) {
      root.style.setProperty('--logo-src', 'url("' + String(logoUrl).replace(/"/g, '%22') + '")');
      root.setAttribute('data-logo-ready', '');
    } else if (!root.hasAttribute('data-logo-ready')) {
      root.style.removeProperty('--logo-src');
    }
  };

  // MAPPER: favicon ← homepage.images[0].logo[isSelected].url (로고 데이터 재사용)
  HeaderFooterMapper.prototype.mapFavicon = function () {
    var logoUrl = this.getLogo();
    if (!logoUrl) return;
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = logoUrl;
  };

  // MAPPER: property.realtimeBookingId
  HeaderFooterMapper.prototype.mapBookingLinks = function () {
    var bookingUrl = this.getBookingUrl();
    document.querySelectorAll('[data-booking-link]').forEach(function (el) {
      if (bookingUrl && bookingUrl !== '#!') {
        el.href = 'javascript:void(0)';
        el.addEventListener('click', function () {
          window.open(bookingUrl, '_blank');
        });
      }
    });
  };

  // MAPPER: property.ybsId
  HeaderFooterMapper.prototype.mapYbsButton = function () {
    var prop = this.getProperty();
    var ybsId = prop.ybsId;
    var ybs_url = 'https://rev.yapen.co.kr/external?ypIdx=';
    var ybsButtons = document.querySelectorAll('[data-ybs-button]');

    if (!ybsId) {
      ybsButtons.forEach(function (button) {
        button.style.display = 'none';
      });
      return;
    }

    ybsButtons.forEach(function (button) {
      button.style.display = '';
      button.setAttribute('data-ybs-id', ybsId);
      // data-ybs-button이 <a> 자체(E)이거나 컨테이너 안의 <a>(C) 둘 다 지원
      var link = (button.tagName === 'A') ? button : button.querySelector('a');
      if (link) {
        link.href = 'javascript:void(0)';
        link.addEventListener('click', function () {
          window.open(ybs_url + ybsId, '_blank');
        });
      }
    });
  };

  // 매퍼가 추가한 항목만 제거 (중복 실행 대비 — 하드코딩 항목은 유지)
  function clearMapped(container) {
    if (!container) return;
    container.querySelectorAll('[data-mapped]').forEach(function (el) {
      el.parentNode.removeChild(el);
    });
  }

  // MAPPER: roomtypes[].name → ROOMS 메뉴 동적 생성 (미리보기 다음에)
  HeaderFooterMapper.prototype.mapRoomMenu = function () {
    var self = this;
    var roomtypes = this.getRoomtypes();
    var roomItems = this.getRoomMenuItems(roomtypes, function (rt) { return (rt && rt.name) || ''; });
    var containers = document.querySelectorAll('[data-rooms-submenu], [data-rooms-submenu-mobile]');
    if (!containers.length) return;

    containers.forEach(function (container) {
      clearMapped(container);
      roomItems.forEach(function (item) {
        var name = self.getRoomMenuLabel(item);
        if (!String(name).trim()) return;
        var li = document.createElement('li');
        li.setAttribute('data-mapped', '');
        var a = document.createElement('a');
        a.href = self.getRoomMenuLink(item, 'id');
        a.textContent = name;
        li.appendChild(a);
        container.appendChild(li);
      });
    });
  };

  HeaderFooterMapper.prototype.mapFacilityMenu = function () {
    var facilities = this.getProperty().facilities || [];
    var container = document.querySelector('[data-facility-submenu]');
    var mobileContainer = document.querySelector('[data-facility-submenu-mobile]');

    if (!container && !mobileContainer) return;

    clearMapped(container);
    clearMapped(mobileContainer);

    [container, mobileContainer].forEach(function (target) {
      if (!target) return;
      facilities.forEach(function (f) {
        var li = document.createElement('li');
        li.setAttribute('data-mapped', '');
        var a = document.createElement('a');
        a.href = 'facility.html?id=' + f.id;
        a.textContent = f.name;
        li.appendChild(a);
        target.appendChild(li);
      });
    });
  };

  // 헤더 호버 스타일 처리
  HeaderFooterMapper.prototype.mapHeaderNavHover = function () {
    var gnb = document.getElementById('shGnb');
    var navItems = document.querySelectorAll('.sh_nav .depth1');
    var lnbBg = document.querySelector('.sh_lnb_bg');

    navItems.forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        if (gnb) {
          gnb.classList.add('on');
        }
        if (lnbBg) {
          lnbBg.style.display = 'block';
        }
        item.classList.add('on');
      });

      item.addEventListener('mouseleave', function () {
        if (gnb) {
          gnb.classList.remove('on');
        }
        if (lnbBg) {
          lnbBg.style.display = 'none';
        }
        item.classList.remove('on');
      });
    });
  };

  // 한글 받침 판별하여 "과/와" 선택
  HeaderFooterMapper.prototype.getKoreanParticle = function (word) {
    if (!word || word.length === 0) return '과';
    var lastChar = word.charCodeAt(word.length - 1);
    if (lastChar >= 0xAC00 && lastChar <= 0xD7A3) {
      var code = lastChar - 0xAC00;
      return (code % 28 !== 0) ? '과' : '와';
    }
    return '과';
  };

  // MAPPER: property.name, property.contactPhone, businessInfo
  HeaderFooterMapper.prototype.mapFooter = function () {
    var prop = this.getProperty();

    // Footer 슬로건
    var sloganEl = document.querySelector('[data-footer-slogan]');
    if (sloganEl) {
      var propertyName = this.getPropertyName();
      var particle = this.getKoreanParticle(propertyName);
      sloganEl.textContent = '지금 바로 ' + propertyName + particle + ' 함께해 보세요.';
    }

    // 업체 전화번호 (배열이면 전부 한 줄씩 노출)
    var phones = this.toPhoneList(prop.contactPhone);
    var phoneEl = document.querySelector('[data-footer-phone]');
    if (phoneEl) {
      phoneEl.textContent = '';
      // 고정 높이 footer가 넘치지 않도록 번호 2개 이상일 때만 상단 여백 축소
      var footerEl = document.querySelector('#sh_ft');
      if (footerEl) {
        if (phones.length > 1) {
          footerEl.classList.add('has-multi-phone');
        } else {
          footerEl.classList.remove('has-multi-phone');
        }
      }
      phones.forEach(function (p) {
        var item = document.createElement('span');
        item.className = 'phoneItem';
        item.textContent = p;
        phoneEl.appendChild(item);
      });
    }

    // 사업자 정보 (주소 / 사업자번호 / 대표자 — 줄바꿈 유지, 링크·pop은 형제이므로 건드리지 않음)
    var bizEl = document.querySelector('[data-footer-business-info]');
    if (bizEl && prop.businessInfo) {
      var b = prop.businessInfo;
      bizEl.innerHTML =
        '주소 : ' + (b.businessAddress || '') + '<br>' +
        '사업자 번호 : ' + (b.businessNumber || '') + '<br>' +
        '대표자 : ' + (b.representativeName || '');
    }

    // 저작권 : 트립일레븐 하드코딩 (footer.html 정적 텍스트, 매핑 안 함)
  };

  document.addEventListener('headerFooterLoaded', function () {
    var mapper = new HeaderFooterMapper();
    mapper.initialize();
    global.headerFooterMapperInstance = mapper;
  });

  global.HeaderFooterMapper = HeaderFooterMapper;
})(window);
