(function (global) {
  'use strict';

  // 상담하기 — 뒤에 property.tripPropertyId 가 붙는다
  var CONSULT_BASE_URL = 'https://www.bookingplay.co.kr/api/cti_eicn/kakao_happy_talk?tid=';

  // 파트너 타입 — 원천은 백오피스 DB `public.contract_info.partner_type` 이고
  // BFF 가 코드 문자열을 그대로 내려준다. **분기는 템플릿이 한다**(PC/모바일은 템플릿만 안다).
  //
  //   distributor_a  총판A     PC 상담하기 / 모바일 상담하기 + 예약하기
  //   distributor_b  총판B     PC 없음     / 모바일 예약하기
  //   sales_agency   판매대행  PC 없음     / 모바일 예약하기
  //
  // ⚠️ 예약하기는 **파트너 타입과 무관**하다 — 세 타입 모두 모바일에서만 뜬다.
  //    그건 기존 `.ft_btn_reserve.for_m` 의 미디어쿼리가 이미 하고 있어 손대지 않는다.
  //    타입으로 갈리는 것은 상담하기 하나뿐이다.
  var CONSULT_PARTNER_TYPES = ['distributor_a'];

  // ⚠️ base-mapper 에 `cleanText` 가 없는 템플릿이 있어 의존하지 않는다.
  function consultText(v) {
    return v === undefined || v === null ? '' : String(v).trim();
  }



  // 백오피스가 전달한 실시간 달력 링크가 http(s) URL일 때만 푸터에 노출한다.
  function mapFooterCalendar(data) {
    var homepageFields = data && data.homepage && data.homepage.customFields;
    var fields = homepageFields || (data && data.customFields) || {};
    var raw = fields.footer && fields.footer.calendarUrl;
    var value = typeof raw === 'string' ? raw.trim() : '';
    var valid = false;
    if (/^https?:\/\//i.test(value)) {
      try {
        var parsed = new URL(value);
        valid = (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !!parsed.hostname;
      } catch (error) {
        valid = false;
      }
    }
    document.querySelectorAll('[data-calendar-wrap]').forEach(function (el) {
      el.style.display = valid ? '' : 'none';
    });
    document.querySelectorAll('[data-calendar-link]').forEach(function (el) {
      if (valid) el.setAttribute('href', value);
      else el.removeAttribute('href');
    });
  }

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
    this.mapConsult();
    this.mapSocialLinks();
    this.mapRoomMenu();
    this.mapFacilityMenu();
    this.mapFooterMenu();
    this.mapTravelMenu();
    this.mapLayoutMapMenu();
    this.mapHeaderNavHover();
    this.mapFooter();
    mapFooterCalendar(this.data);
  };

  // MAPPER: layoutMap.enabled === false 이면 ROOMS 서브메뉴의 `미리보기` 숨김
  // (헤더 PC + 모바일 aside). 기존에는 mapFooterMenu 가 ROOMS 대메뉴의 href 만
  // 바꾸고 서브메뉴 항목은 그대로 둬서, 꺼진 페이지에 눌러 들어갈 수 있었다.
  // 판정은 layout-map.html 의 404 기준과 같은 isLayoutMapEnabled() 를 쓴다.
  HeaderFooterMapper.prototype.mapLayoutMapMenu = function () {
    var hide = !this.isLayoutMapEnabled();
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
    // ROOMS: layoutMap(미리보기) 켜짐 → layout-map.html / 꺼짐 → 헤더 ROOMS 서브메뉴 첫 객실 (getRoomsEntryLink)
    // 판정은 layout-map.html 의 404 기준과 같은 isLayoutMapEnabled() — 꺼진 채 layout-map.html 로 두면 404.
    // 객실이 하나도 없으면 room.html
    var roomsLink = document.querySelector('[data-footer-rooms-link]');
    if (roomsLink) {
      roomsLink.href = this.getRoomsEntryLink() || 'room.html';
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
        // addEventListener 로 쌓지 않고 덮어쓴다. 미리보기는 샘플 데이터(ybsId "YBS ID")로 먼저 그린 뒤
        // 실제 데이터로 다시 그리는데, 쌓이면 샘플 링크(ypIdx=YBS%20ID)까지 함께 열린다
        link.onclick = function () {
          window.open(ybs_url + ybsId, '_blank');
        };
      }
    });
  };

  // 소셜 링크 플랫폼 — [data-homepage-socialLinks-{platform}] 와 1:1.
  // 헤더 네이버 버튼은 blog 칸을 쓴다(어드민에서 네이버 플레이스 주소를 blog 에 입력).
  var SOCIAL_PLATFORMS = ['facebook', 'instagram', 'blog', 'youtube'];

  // MAPPER: homepage.socialLinks.{platform} → [data-homepage-socialLinks-{platform}] (href, 없으면 숨김)
  //
  // 값이 있으면 href + 노출, 없으면(null·빈 문자열·공백·키 없음) 숨긴다.
  // 마크업은 매핑 전 깜빡임이 없도록 `.hidden-social-link`(숨김) 상태로 시작한다.
  // 버튼을 감싸는 [data-social-wrap] 은 안에 보이는 버튼이 없으면 래퍼째 숨긴다.
  // E형 헤더 마크업은 blog·instagram 두 개(PC #shGnb · 모바일 #topmenuM) — facebook / youtube 는 매칭 요소 0개.
  // 헤더에 버튼이 하나라도 보이면 루트에 data-social="on" 을 찍는다 — PC 대메뉴 여백을 줄이는 CSS 기준
  // (:has 대신 — 일부 브라우저에서 스타일 미반영).
  HeaderFooterMapper.prototype.mapSocialLinks = function () {
    var socialLinks = this.getHomepage().socialLinks || {};
    var headerOn = false;
    SOCIAL_PLATFORMS.forEach(function (platform) {
      var url = consultText(socialLinks[platform]);
      document.querySelectorAll('[data-homepage-socialLinks-' + platform + ']').forEach(function (el) {
        if (!url) {
          el.classList.add('hidden-social-link');
          el.setAttribute('href', '#!');
          el.removeAttribute('target');
          el.removeAttribute('rel');
          return;
        }
        el.setAttribute('href', url);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
        el.classList.remove('hidden-social-link');
        if (el.closest('#sh_hd')) headerOn = true;
      });
    });
    document.querySelectorAll('[data-social-wrap]').forEach(function (wrap) {
      var visible = wrap.querySelector(
        '[data-homepage-socialLinks-facebook]:not(.hidden-social-link),' +
        '[data-homepage-socialLinks-instagram]:not(.hidden-social-link),' +
        '[data-homepage-socialLinks-blog]:not(.hidden-social-link),' +
        '[data-homepage-socialLinks-youtube]:not(.hidden-social-link)'
      );
      wrap.classList.toggle('hidden-social-link', !visible);
    });
    document.documentElement.setAttribute('data-social', headerOn ? 'on' : 'off');
  };

  // 상담 URL 에 쓸 tripPropertyId. 없거나 형식이 아니면 빈 문자열.
  HeaderFooterMapper.prototype.getConsultId = function () {
    var raw = consultText(this.getProperty().tripPropertyId);
    // ⚠️ URL 쿼리에 그대로 붙는 값이라 토큰 형태만 통과시킨다. 플레이스홀더
    //    문자열(`숙소 ID` 같은 한글·공백)이 들어와도 링크가 깨지지 않는다.
    return /^[A-Za-z0-9_-]+$/.test(raw) ? raw : '';
  };

  // 상담하기 노출 대상인가 — 파트너 타입 + tripPropertyId 둘 다 있어야 한다.
  HeaderFooterMapper.prototype.isConsultVisible = function () {
    var partnerType = consultText(this.getProperty().partnerType);
    return Boolean(this.getConsultId()) && CONSULT_PARTNER_TYPES.indexOf(partnerType) !== -1;
  };

  // MAPPER: property.tripPropertyId + partnerType → [data-consult-button] (우측 하단 상담하기)
  //
  // 총판A 만 노출하고, `tripPropertyId` 가 비면 타입과 무관하게 숨긴다.
  // 값이 없으면 `[data-consult-wrap]` 째 숨긴다 — 버튼만 숨기면 빈 박스가 남는다.
  HeaderFooterMapper.prototype.mapConsult = function () {
    var tripPropertyId = this.getConsultId();
    var visible = this.isConsultVisible();

    // 상담하기가 빠지면 예약하기 아래가 비어 버린다.
    // CSS 가 위치를 되돌릴 수 있도록 상태를 루트에 찍는다.
    document.documentElement.setAttribute('data-consult', visible ? 'on' : 'off');

    document.querySelectorAll('[data-consult-button]').forEach(function (el) {
      var host = el.closest('[data-consult-wrap]') || el;
      if (!visible) {
        host.style.display = 'none';
        return;
      }
      host.style.display = '';
      var target = el.tagName === 'A' ? el : el.querySelector('a');
      if (target) {
        target.href = CONSULT_BASE_URL + tripPropertyId;
        target.setAttribute('target', '_blank');
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
    var roomItems = this.getRoomMenuItems(roomtypes);
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
        a.title = name; // 말줄임될 때 전체 객실명을 툴팁으로
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
        a.title = f.name;
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
  // MAPPER: property.tripProviderName → [data-copyright]
  // 공급사명이 있으면 data-copyright 의 템플릿 문자열에서 {provider} 를 치환한다.
  // 값이 없으면(백오피스 미입력 → "") HTML 의 기존 트립일레븐 문구를 그대로 둔다.
  HeaderFooterMapper.prototype.mapCopyright = function () {
    var provider = String(this.getProperty().tripProviderName || '').trim();
    if (!provider) return;
    document.querySelectorAll('[data-copyright]').forEach(function (el) {
      var tpl = el.getAttribute('data-copyright') || '';
      el.textContent = tpl.replace(/\{provider\}/g, provider);
    });
  };

  // MAPPER: customFields.footer.ruralStayMark → [data-footer-rural-stay-mark] (우측 정보 칸 맨 위, 예약문의 위)
  // 농어촌민박사업자 이미지가 있을 때만 이미지 줄을 노출한다. 없으면 숨겨 기존 푸터와 같다.
  // #sh_ft 는 고정 높이라 노출할 때만 has-rural-stay-mark 로 높이를 풀어 준다.
  // 프리뷰는 같은 페이지에서 다시 매핑하므로 매번 표시 상태를 되돌린다.
  HeaderFooterMapper.prototype.mapRuralStayMark = function () {
    var footer = this.getCustomFields().footer || {};
    var footerMarks = footer;
    var marks = Array.isArray(footerMarks.ruralStayMarks)
      ? footerMarks.ruralStayMarks.slice(0, 2)
      : [footerMarks.ruralStayMark];
    var markUrl = marks.some(function (mark) { return mark && mark.url; });

    document.querySelectorAll('#sh_ft').forEach(function (footerEl) {
      footerEl.classList.toggle('has-rural-stay-mark', !!markUrl);
    });
    document.querySelectorAll('[data-footer-rural-stay-mark-wrap]').forEach(function (wrap) {
      wrap.style.display = markUrl ? '' : 'none';
    });
    document.querySelectorAll('[data-footer-rural-stay-mark-wrap]').forEach(function (wrap) {
      var images = wrap.querySelectorAll('[data-footer-rural-stay-mark]');
      var count = marks.filter(function (mark) { return mark && mark.url; }).length;
      images.forEach(function (img, index) {
        var mark = marks[index];
        var url = mark && mark.url ? String(mark.url) : '';
        img.style.display = url ? 'inline-block' : 'none';
        img.style.maxWidth = count > 1 ? 'calc((100% - 12px) / 2)' : '';
        img.style.marginLeft = index && url && marks[0] && marks[0].url ? '12px' : '';
        if (!url) {
          img.removeAttribute('src');
          return;
        }
        img.src = url;
        img.alt = (mark.description && String(mark.description).trim()) || '농어촌민박사업자';
      });
    });
  };

  HeaderFooterMapper.prototype.mapFooter = function () {
    this.mapCopyright();
    this.mapRuralStayMark();
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
